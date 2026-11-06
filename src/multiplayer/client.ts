import * as Y from 'yjs';
import type { SceneItem, Vec3 } from '../types';

export interface CameraPose { position: Vec3; quaternion: [number, number, number, number] }
export interface Player { id: string; nickname: string; owner: boolean; pose: CameraPose | null }
export interface Session { id: string; nickname: string; address: string; port: number }
export interface ChatMessage { id: string; sender: string; senderId: string; text: string; time: number }
export interface JoinRequest { requestId: string; nickname: string }
export type ConnectionStatus = 'disconnected' | 'connecting' | 'idle' | 'joining' | 'host' | 'guest';
export interface MultiplayerState {
  status: ConnectionStatus; error: string | null; sessions: Session[]; players: Player[];
  requests: JoinRequest[]; messages: ChatMessage[]; selfId: string | null; owner: string; joinable: boolean;
}
export interface SharedScene { items: SceneItem[]; workpieces: SceneItem[]; projectName: string; layoutName: string; activeLayoutId: string | null }
interface Callbacks {
  onHosted: () => void;
  onJoined: () => void;
  onScene: (scene: SharedScene) => void;
  onSimulation: (snapshot: unknown) => void;
  onAction: (action: string, value: unknown) => void;
  onHistory: (past: number, future: number) => void;
  onEnded: (reason: string) => void;
}
const LOCAL = Symbol('local scene edit');
const REMOTE = Symbol('remote document update');
const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const x = Object.keys(a), y = Object.keys(b);
  return x.length === y.length && x.every(key => Object.prototype.hasOwnProperty.call(b, key) && equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
};

/** One same-origin helper connection. Scene fields are separate Yjs keys so
 * simultaneous edits to different properties merge instead of replacing a scene. */
export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private doc: Y.Doc | null = null;
  private undoManager: Y.UndoManager | null = null;
  private callbacks: Callbacks;
  private sceneReady = false;
  private listeners = new Set<() => void>();
  private state: MultiplayerState = { status: 'disconnected', error: null, sessions: [], players: [], requests: [], messages: [], selfId: null, owner: '', joinable: false };
  constructor(callbacks: Callbacks) { this.callbacks = callbacks; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getState = () => this.state;
  private patch(value: Partial<MultiplayerState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(fn => fn()); }
  get active() { return this.state.status === 'host' || this.state.status === 'guest'; }
  get isHost() { return this.state.status === 'host'; }
  get isGuest() { return this.state.status === 'guest'; }
  get hasGuests() { return this.state.players.some(player => !player.owner); }
  private send(value: object) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) { this.discover(); return; }
    if (!['http:', 'https:'].includes(window.location.protocol)) {
      this.patch({ status: 'disconnected', error: 'Open the app through the LAN helper; a standalone file cannot discover or host LAN sessions.' }); return;
    }
    this.patch({ status: 'connecting', error: null });
    const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/multiplayer/socket`);
    this.socket = socket; socket.binaryType = 'arraybuffer';
    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) { if (this.doc) { try { Y.applyUpdate(this.doc, new Uint8Array(event.data), REMOTE); } catch { this.patch({ error: 'The shared document could not be decoded.' }); } } return; }
      let message: Record<string, any>; try { message = JSON.parse(event.data as string); } catch { return; }
      switch (message.type) {
        case 'ready': this.patch({ status: 'idle', sessions: message.sessions || [], error: null }); break;
        case 'sessions': this.patch({ sessions: message.sessions || [] }); break;
        case 'joining': case 'pending': this.patch({ status: 'joining', owner: message.owner || '', error: null }); break;
        case 'hosted':
          this.createDocument(); this.sceneReady = true; this.patch({ status: 'host', selfId: message.id, owner: message.owner, joinable: !!message.joinable, messages: [], error: null });
          this.callbacks.onHosted(); break;
        case 'joined':
          this.createDocument(); this.patch({ status: 'guest', selfId: message.id, owner: message.owner, messages: message.messages || [], error: null });
          this.callbacks.onJoined(); break;
        case 'members': this.patch({ players: message.members || [], joinable: !!message.joinable }); break;
        case 'request': this.patch({ requests: [...this.state.requests, { requestId: message.requestId, nickname: message.nickname }] }); break;
        case 'request-cancelled': this.patch({ requests: this.state.requests.filter(r => r.requestId !== message.requestId) }); break;
        case 'chat': this.patch({ messages: [...this.state.messages.slice(-199), message.message] }); break;
        case 'presence': this.patch({ players: this.state.players.map(p => p.id === message.id ? { ...p, pose: message.pose } : p) }); break;
        case 'simulation': if (this.isGuest) this.callbacks.onSimulation(message.state); break;
        case 'action': if (this.isHost) this.callbacks.onAction(message.action, message.value); break;
        case 'denied': case 'kicked': case 'ended': case 'left': {
          const wasActive = this.active;
          this.destroyDocument();
          const reason = typeof message.reason === 'string' ? message.reason : (message.type === 'left' ? 'Left the session.' : 'Session ended.');
          this.patch({ status: 'idle', error: message.type === 'left' ? null : reason, players: [], requests: [], selfId: null, owner: '', joinable: false });
          if (wasActive) this.callbacks.onEnded(reason);
          this.discover(); break;
        }
        case 'error': this.patch({ error: String(message.message || 'LAN helper error.'), ...(this.state.status === 'joining' ? { status: 'idle' as const } : {}) }); break;
      }
    };
    socket.onerror = () => { if (this.socket === socket) this.patch({ error: 'LAN helper unavailable. Start it and open the app through the helper, or run it alongside the development server.' }); };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null; const wasActive = this.active; this.destroyDocument();
      this.patch({ status: 'disconnected', players: [], requests: [], selfId: null, owner: '', joinable: false,
        error: this.state.error || 'LAN helper disconnected. Start it and reconnect.' });
      if (wasActive) this.callbacks.onEnded('LAN helper disconnected.');
    };
  }
  discover() { this.send({ type: 'discover' }); }
  host(nickname: string, joinable: boolean) { if (nickname.trim()) this.send({ type: 'host', nickname: nickname.trim(), joinable }); }
  join(id: string, nickname: string) { if (nickname.trim()) this.send({ type: 'join', id, nickname: nickname.trim() }); }
  leave() { this.send({ type: 'leave' }); }
  setJoinable(value: boolean) { this.send({ type: 'joinable', value }); }
  approve(requestId: string, accept: boolean) { this.send({ type: 'approve', requestId, accept }); this.patch({ requests: this.state.requests.filter(r => r.requestId !== requestId) }); }
  kick(id: string) { this.send({ type: 'kick', id }); }
  chat(text: string) { if (this.active && text.trim()) this.send({ type: 'chat', text }); }
  presence(pose: CameraPose) { if (this.active) this.send({ type: 'presence', pose }); }
  simulation(state: unknown) { if (this.isHost) this.send({ type: 'simulation', state }); }
  action(action: string, value?: unknown) { if (this.isGuest) this.send({ type: 'action', action, value }); }
  private createDocument() {
    this.destroyDocument();
    const doc = this.doc = new Y.Doc();
    const items = doc.getMap<Y.Map<unknown>>('items'), workpieces = doc.getMap<Y.Map<unknown>>('workpieces'), meta = doc.getMap<unknown>('meta');
    const undo = this.undoManager = new Y.UndoManager([items, workpieces, meta], { trackedOrigins: new Set([LOCAL]), captureTimeout: 1000 });
    const history = () => this.callbacks.onHistory(undo.undoStack.length, undo.redoStack.length);
    undo.on('stack-item-added', history); undo.on('stack-item-popped', history); undo.on('stack-cleared', history);
    doc.on('update', (update, origin) => {
      if (origin !== REMOTE && this.socket?.readyState === WebSocket.OPEN) this.socket.send(update);
    });
    doc.on('afterTransaction', (transaction) => {
      if (transaction.origin === LOCAL || !transaction.changedParentTypes.size) return;
      const read = (map: Y.Map<Y.Map<unknown>>) => [...map.values()].map(value => value.toJSON() as SceneItem & {__order?: number})
        .sort((a, b) => (a.__order ?? 0) - (b.__order ?? 0) || a.id.localeCompare(b.id))
        .map(({__order: _order, ...item}) => item as SceneItem);
      this.sceneReady = true;
      this.callbacks.onScene({ items: read(items), workpieces: read(workpieces), projectName: String(meta.get('projectName') || 'Shared factory'), layoutName: String(meta.get('layoutName') || 'Shared factory'), activeLayoutId: typeof meta.get('activeLayoutId') === 'string' ? meta.get('activeLayoutId') as string : null });
    });
  }
  private destroyDocument() { this.sceneReady = false; this.undoManager?.destroy(); this.undoManager = null; this.doc?.destroy(); this.doc = null; this.callbacks.onHistory(0, 0); }
  clearHistory() { this.undoManager?.clear(); }
  beginEdit() { this.undoManager?.stopCapturing(); }
  undo() { this.undoManager?.undo(); }
  redo() { this.undoManager?.redo(); }
  updateScene(items: SceneItem[], workpieces: SceneItem[]) {
    const doc = this.doc; if (!doc || !this.active || !this.sceneReady) return;
    const sync = (name: string, rows: SceneItem[]) => {
      const target = doc.getMap<Y.Map<unknown>>(name), ids = new Set(rows.map(row => row.id));
      for (const id of target.keys()) if (!ids.has(id)) target.delete(id);
      rows.forEach((row, index) => {
        let entry = target.get(row.id);
        if (!entry) { entry = new Y.Map<unknown>(); target.set(row.id, entry); }
        const values = { ...row, __order: index } as Record<string, unknown>;
        for (const key of entry.keys()) if (!(key in values) || values[key] === undefined) entry.delete(key);
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined) { entry.delete(key); continue; }
          if (key === 'props' && value && typeof value === 'object') {
            let props = entry.get('props');
            if (!(props instanceof Y.Map)) { props = new Y.Map<unknown>(); entry.set('props', props); }
            const map = props as Y.Map<unknown>, object = value as Record<string, unknown>;
            for (const prop of map.keys()) if (!(prop in object) || object[prop] === undefined) map.delete(prop);
            for (const [prop, val] of Object.entries(object)) if (val !== undefined && !equal(map.get(prop), val)) map.set(prop, val);
          } else if (!equal(entry.get(key), value)) entry.set(key, value);
        }
      });
    };
    doc.transact(() => { sync('items', items); sync('workpieces', workpieces); }, LOCAL);
  }
  updateMeta(scene: Pick<SharedScene, 'projectName' | 'layoutName' | 'activeLayoutId'>) {
    const doc = this.doc; if (!doc || !this.active || !this.sceneReady) return;
    const meta = doc.getMap<unknown>('meta');
    doc.transact(() => { for (const [key, value] of Object.entries(scene)) if (!equal(meta.get(key), value)) meta.set(key, value); }, LOCAL);
  }
  close() { this.socket?.close(); this.socket = null; this.destroyDocument(); }
}
