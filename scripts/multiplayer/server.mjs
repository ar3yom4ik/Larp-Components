// Larp LAN helper. The browser cannot listen for peers or send UDP broadcasts.
// This opt-in process serves the standalone app and mediates approved LAN sessions.
import http from 'node:http';
import dgram from 'node:dgram';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const port = Number(arg('--port', process.env.LARP_MULTIPLAYER_PORT || '4174'));
const discoveryPort = Number(arg('--discovery-port', process.env.LARP_DISCOVERY_PORT || '43749'));
const html = path.resolve(arg('--html', process.env.LARP_MULTIPLAYER_HTML || (fs.existsSync(path.join(process.cwd(), 'Larp_Factory_V3.html')) ? 'Larp_Factory_V3.html' : 'dist/index.html')));
if (![port, discoveryPort].every((n) => Number.isInteger(n) && n > 0 && n <= 65535)) throw new Error('Invalid port');
const MAGIC = 'larp-components-lan-v1';
const LIMIT = 200 * 1024 * 1024;
const sessions = new Map();
const localSockets = new Set();
let room = null;
const decoder = new TextDecoder();
const json = (ws, value) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value)); };
const binary = (ws, data) => { if (ws?.readyState === WebSocket.OPEN) ws.send(data, { binary: true }); };
const safeName = (name) => typeof name === 'string' ? name.trim().slice(0, 32) : '';
const localAddress = (ip = '') => ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.');
const validOrigin = (origin, host) => {
  if (!origin) return true; // command-line clients and diagnostics
  try { const url = new URL(origin), h = url.hostname.toLowerCase(); return url.host.toLowerCase() === String(host || '').toLowerCase() && (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.e2b.app')); } catch { return false; }
};
const memberView = (entry) => ({ id: entry.id, nickname: entry.nickname, owner: entry.owner, pose: entry.pose || null });
const broadcast = (value, except = null) => {
  if (!room) return;
  for (const member of room.members.values()) if (member.ws !== except) json(member.ws, value);
};
const broadcastMembers = () => room && broadcast({ type: 'members', members: [...room.members.values()].map(memberView), joinable: room.joinable });
const listSessions = () => [...sessions.values()].map(({ lastSeen, ...rest }) => rest).sort((a, b) => a.nickname.localeCompare(b.nickname));
const sendSessions = () => { for (const ws of localSockets) if (!ws.mode) json(ws, { type: 'sessions', sessions: listSessions() }); };

const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
udp.on('error', (error) => console.error('[LAN discovery]', error.message));
udp.on('message', (buffer, rinfo) => {
  if (buffer.length > 2048) return;
  let value; try { value = JSON.parse(buffer.toString('utf8')); } catch { return; }
  if (value.magic !== MAGIC) return;
  if (value.type === 'query') { advertise(); return; }
  if (value.type !== 'session' || typeof value.id !== 'string' || !safeName(value.nickname) || !Number.isInteger(value.port) || value.port < 1 || value.port > 65535) return;
  if (room?.id === value.id || !value.joinable) { sessions.delete(value.id); sendSessions(); return; }
  sessions.set(value.id, { id: value.id, nickname: safeName(value.nickname), address: rinfo.address, port: value.port, lastSeen: Date.now() });
  sendSessions();
});
udp.bind(discoveryPort, '0.0.0.0', () => {
  udp.setBroadcast(true);
  console.log(`[LAN discovery] UDP ${discoveryPort}`);
  query();
});
function sendBroadcast(value) {
  const data = Buffer.from(JSON.stringify({ magic: MAGIC, ...value }));
  const addresses = new Set(['255.255.255.255']);
  // Include each subnet's directed broadcast, useful on hosts with multiple NICs.
  for (const infos of Object.values(os.networkInterfaces())) for (const info of infos || []) {
    if (info.family !== 'IPv4' || info.internal || !info.netmask) continue;
    const ip = info.address.split('.').map(Number), mask = info.netmask.split('.').map(Number);
    if (ip.length === 4 && mask.length === 4) addresses.add(ip.map((v, i) => (v | (~mask[i] & 255))).join('.'));
  }
  for (const address of addresses) { try { udp.send(data, discoveryPort, address, () => {}); } catch {} }
}
function query() { sendBroadcast({ type: 'query' }); }
function advertise() { if (room) sendBroadcast({ type: 'session', id: room.id, nickname: room.owner.nickname, port, joinable: room.joinable }); }
function closeRoom(reason = 'The host ended the session.') {
  if (!room) return;
  const old = room; old.joinable = false; advertise();
  broadcast({ type: 'ended', reason });
  for (const member of old.members.values()) if (!member.owner) member.ws.close(4001, 'Session ended');
  for (const pending of old.pending.values()) { clearTimeout(pending.timer); json(pending.ws, { type: 'denied', reason }); pending.ws.close(4001, 'Session ended'); }
  old.doc.destroy(); room = null; old.owner.ws.mode = null; old.owner.ws.member = null;
  sendSessions();
}
function removePeer(ws) {
  if (!room) return;
  if (ws.member?.owner) { closeRoom('The host disconnected.'); return; }
  if (ws.member && room.members.delete(ws.member.id)) { broadcastMembers(); broadcast({ type: 'notice', text: `${ws.member.nickname} left the session.` }); }
  for (const [id, pending] of room.pending) if (pending.ws === ws) { room.pending.delete(id); clearTimeout(pending.timer); json(room.owner.ws, { type: 'request-cancelled', requestId: id }); }
  ws.member = null;
}
function handleRoomMessage(ws, value) {
  if (!room || !ws.member || !value || typeof value.type !== 'string') return;
  const member = ws.member;
  switch (value.type) {
    case 'joinable':
      if (member.owner) { room.joinable = value.value === true; advertise(); broadcastMembers(); }
      break;
    case 'approve': {
      if (!member.owner) break;
      const pending = room.pending.get(value.requestId); if (!pending) break;
      room.pending.delete(value.requestId); clearTimeout(pending.timer);
      if (value.accept !== true || !room.joinable) {
        json(pending.ws, { type: 'denied', reason: !room.joinable ? 'The session is no longer joinable.' : 'The host declined your request.' });
        pending.ws.close(4003, 'Declined'); break;
      }
      const peer = { id: randomUUID(), nickname: pending.nickname, owner: false, ws: pending.ws, pose: null };
      pending.ws.member = peer; room.members.set(peer.id, peer);
      json(peer.ws, { type: 'joined', id: peer.id, owner: room.owner.nickname, messages: room.messages });
      binary(peer.ws, Y.encodeStateAsUpdate(room.doc));
      broadcastMembers(); broadcast({ type: 'notice', text: `${peer.nickname} joined the session.` });
      break;
    }
    case 'kick': {
      if (!member.owner) break;
      const target = room.members.get(value.id);
      if (target && !target.owner) { json(target.ws, { type: 'kicked', reason: 'The host removed you from the session.' }); target.ws.close(4003, 'Kicked'); removePeer(target.ws); }
      break;
    }
    case 'chat': {
      const text = typeof value.text === 'string' ? value.text.trim().slice(0, 2000) : '';
      if (!text) break;
      const message = { id: randomUUID(), sender: member.nickname, senderId: member.id, text, time: Date.now() };
      room.messages.push(message); if (room.messages.length > 200) room.messages.shift();
      broadcast({ type: 'chat', message }); break;
    }
    case 'presence': {
      const p = value.pose;
      if (!p || !Array.isArray(p.position) || p.position.length !== 3 || !Array.isArray(p.quaternion) || p.quaternion.length !== 4 || ![...p.position, ...p.quaternion].every((n) => Number.isFinite(n) && Math.abs(n) < 1000000)) break;
      member.pose = { position: p.position, quaternion: p.quaternion };
      broadcast({ type: 'presence', id: member.id, pose: member.pose }, ws); break;
    }
    case 'simulation':
      if (member.owner) broadcast({ type: 'simulation', state: value.state }, ws);
      break;
    case 'action':
      if (!member.owner && typeof value.action === 'string') json(room.owner.ws, { type: 'action', action: value.action, value: value.value, sender: member.id });
      break;
    case 'leave':
      if (member.owner) closeRoom(); else { json(ws, { type: 'left' }); ws.close(1000, 'Left session'); removePeer(ws); }
      break;
  }
}
function createRoom(ws, value) {
  const nickname = safeName(value.nickname);
  if (!nickname) { json(ws, { type: 'error', message: 'Enter a nickname before hosting.' }); return; }
  if (room) { json(ws, { type: 'error', message: 'This helper already hosts a session.' }); return; }
  const owner = { id: randomUUID(), nickname, owner: true, ws, pose: null };
  room = { id: randomUUID(), owner, doc: new Y.Doc(), joinable: value.joinable === true, members: new Map([[owner.id, owner]]), pending: new Map(), messages: [] };
  ws.mode = 'host'; ws.member = owner;
  room.doc.on('update', (update, origin) => { if (!room) return; for (const member of room.members.values()) if (member.ws !== origin) binary(member.ws, update); });
  json(ws, { type: 'hosted', id: owner.id, owner: nickname, joinable: room.joinable, messages: [] });
  broadcastMembers(); advertise();
}
function connectPeer(local, value) {
  const nickname = safeName(value.nickname), target = sessions.get(value.id);
  if (!nickname) { json(local, { type: 'error', message: 'Enter a nickname before joining.' }); return; }
  if (!target || Date.now() - target.lastSeen > 8000) { json(local, { type: 'error', message: 'That LAN session is no longer available.' }); query(); return; }
  if (local.mode) return;
  local.mode = 'joining';
  const peer = new WebSocket(`ws://${target.address}:${target.port}/multiplayer/peer`, { maxPayload: LIMIT });
  local.peer = peer;
  json(local, { type: 'joining', owner: target.nickname });
  peer.on('open', () => json(peer, { type: 'join', sessionId: target.id, nickname }));
  peer.on('message', (data, isBinary) => {
    if (local.readyState !== WebSocket.OPEN) return;
    if (!isBinary) {
      let message; try { message = JSON.parse(decoder.decode(data)); } catch { return; }
      if (message.type === 'joined') local.mode = 'guest';
      if (['denied', 'kicked', 'ended', 'left'].includes(message.type)) local.endReason = message.reason || message.type;
      json(local, message);
    } else binary(local, data);
  });
  peer.on('error', () => { if (local.readyState === WebSocket.OPEN && !local.endReason) json(local, { type: 'error', message: 'Could not connect to the host. Check LAN/firewall access.' }); });
  peer.on('close', () => {
    local.peer = null; local.mode = null;
    if (local.readyState === WebSocket.OPEN) { if (!local.endReason) json(local, { type: 'ended', reason: 'Disconnected from the host.' }); local.endReason = null; sendSessions(); query(); }
  });
}
const server = http.createServer((req, res) => {
  if (req.url === '/multiplayer/health') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ service: MAGIC })); return; }
  if (!localAddress(req.socket.remoteAddress)) { res.writeHead(403); res.end('Open the app on the machine running this helper.'); return; }
  if (req.url === '/' || req.url === '/index.html' || req.url === '/Larp_Factory_V3.html') {
    fs.createReadStream(html).on('error', () => { if (!res.headersSent) res.writeHead(404, { 'content-type': 'text/plain' }); res.end(`Standalone HTML not found: ${html}. Put the release HTML next to the helper or pass --html.`); }).pipe(res);
  } else { res.writeHead(404); res.end('Not found'); }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: LIMIT });
server.on('upgrade', (req, socket, head) => {
  const peer = req.url === '/multiplayer/peer';
  const local = req.url === '/multiplayer/socket';
  if ((!peer && !local) || (local && (!localAddress(req.socket.remoteAddress) || !validOrigin(req.headers.origin, req.headers.host)))) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => { ws.peerEndpoint = peer; wss.emit('connection', ws, req); });
});
wss.on('connection', (ws) => {
  ws.on('error', () => {});
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  if (!ws.peerEndpoint) { localSockets.add(ws); json(ws, { type: 'ready', sessions: listSessions() }); query(); }
  ws.on('message', (data, isBinary) => {
    if (ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      if (!isBinary && ws.mode === 'joining') {
        let command; try { command = JSON.parse(decoder.decode(data)); } catch {}
        if (command?.type === 'leave') { ws.endReason = 'left'; ws.peer.close(1000, 'Cancelled'); json(ws, {type:'left'}); return; }
      }
      ws.peer.send(data, { binary: isBinary }); return;
    }
    if (isBinary) { if (room && ws.member && room.members.has(ws.member.id)) { try { Y.applyUpdate(room.doc, new Uint8Array(data), ws); } catch { ws.close(1003, 'Invalid document update'); } } return; }
    let value; try { value = JSON.parse(decoder.decode(data)); } catch { return; }
    if (ws.peerEndpoint && !ws.member) {
      if (value.type !== 'join' || !room || value.sessionId !== room.id || !room.joinable || !safeName(value.nickname)) { json(ws, { type: 'denied', reason: 'Session unavailable or nickname missing.' }); ws.close(4003, 'Unavailable'); return; }
      if ([...room.pending.values()].some(p => p.ws === ws)) return;
      const requestId = randomUUID(), nickname = safeName(value.nickname);
      const timer = setTimeout(() => { if (room?.pending.delete(requestId)) { json(ws, { type: 'denied', reason: 'Join request timed out.' }); ws.close(4003, 'Timed out'); json(room.owner.ws, { type: 'request-cancelled', requestId }); } }, 120000);
      room.pending.set(requestId, { ws, nickname, timer });
      json(ws, { type: 'pending', owner: room.owner.nickname }); json(room.owner.ws, { type: 'request', requestId, nickname }); return;
    }
    if (ws.member) { handleRoomMessage(ws, value); return; }
    if (ws.peerEndpoint) return;
    switch (value.type) {
      case 'host': createRoom(ws, value); break;
      case 'join': connectPeer(ws, value); break;
      case 'discover': query(); sendSessions(); break;
      case 'leave': if (ws.peer) { ws.peer.close(1000, 'Cancelled'); ws.peer = null; ws.mode = null; json(ws, { type: 'left' }); } break;
    }
  });
  ws.on('close', () => { localSockets.delete(ws); if (ws.peer) ws.peer.close(); removePeer(ws); });
});
const timer = setInterval(() => {
  advertise();
  const now = Date.now(); let changed = false;
  for (const [id, s] of sessions) if (now - s.lastSeen > 8000) { sessions.delete(id); changed = true; }
  if (changed) sendSessions();
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, 2500);
server.listen(port, '0.0.0.0', () => console.log(`[LARP Multiplayer] http://localhost:${port}/ — standalone: ${html}`));
function stop() { clearInterval(timer); closeRoom('The helper stopped.'); for (const ws of wss.clients) ws.terminate(); udp.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
