import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MessageSquare, RefreshCw, Users, X } from 'lucide-react';
import { WindowResizeHandle, type WindowSize } from './WindowResizeHandle';
import { MultiplayerClient } from '../multiplayer/client';
import { t } from '../i18n';

const button = 'rounded border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35';
export function MultiplayerDialog({ client, open, onClose }: {client:MultiplayerClient; open:boolean; onClose:()=>void}) {
  const state = useSyncExternalStore(client.subscribe, client.getState);
  const [nickname, setNickname] = useState(() => { try { return localStorage.getItem('larp-multiplayer-nickname') || ''; } catch { return ''; } });
  const [joinable, setJoinable] = useState(true);
  const frame = useRef<HTMLDivElement>(null), [size, setSize] = useState<WindowSize | null>(null);
  useEffect(() => { if (open) client.connect(); }, [client, open]);
  if (!open) return null;
  const active = state.status === 'host' || state.status === 'guest';
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-3" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={frame} role="dialog" aria-label={t('Multiplayer')} className="relative flex max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded border border-white/20 bg-[#252526] shadow-2xl" style={{width:size?.width ?? 510,height:size?.height ?? 520}}>
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#303034] px-4 py-3"><Users size={16} className="text-[var(--app-accent-bright)]" /><strong className="text-sm text-white">{t('Multiplayer')}</strong><button type="button" aria-label={t('Close')} onClick={onClose} className="ml-auto rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"><X size={16} /></button></div>
      <div className="thin-scroll min-h-0 flex-1 overflow-auto p-4 text-[12px] text-white/75">
        {state.error && <div role="alert" className="mb-3 rounded border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] text-amber-100">{t(state.error)}</div>}
        {!active && <>
          <label htmlFor="multiplayer-nickname" className="block text-[11px] text-white/60">{t('Nickname')}</label>
          <input id="multiplayer-nickname" maxLength={32} value={nickname} onChange={event => { const value=event.target.value; setNickname(value); try { localStorage.setItem('larp-multiplayer-nickname', value); } catch { /* storage unavailable */ } }} placeholder={t('Enter your nickname')} className="mt-1 w-full rounded border border-white/15 bg-[#19191b] px-2.5 py-2 text-[12px] text-white outline-none focus:border-[var(--app-accent)]" />
          <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={joinable} onChange={event=>setJoinable(event.target.checked)} /> {t('Joinable session')}</label>
          <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className={button} disabled={!nickname.trim() || state.status !== 'idle'} onClick={()=>client.host(nickname,joinable)}>{t('Host session')}</button><button type="button" className={button} disabled={state.status !== 'idle'} onClick={()=>client.discover()}><RefreshCw size={12} className="mr-1 inline" />{t('Refresh sessions')}</button>{state.status === 'disconnected' && <button type="button" className={button} onClick={()=>client.connect()}>{t('Reconnect helper')}</button>}</div>
          {state.status === 'joining' && <div className="mt-3 rounded border border-[var(--app-accent)]/30 bg-[var(--app-accent)]/10 p-3">{t('Waiting for the host to approve your request.')} <button type="button" className="ml-2 underline" onClick={()=>client.leave()}>{t('Cancel')}</button></div>}
          <h3 className="mt-5 border-b border-white/10 pb-2 font-semibold text-white">{t('Local network sessions')}</h3>
          {state.sessions.length === 0 ? <p className="py-4 text-white/40">{t('No joinable sessions found. All participants must run the LAN helper on the same network.')}</p> : <ul className="divide-y divide-white/10">{state.sessions.map(session=><li key={session.id} className="flex items-center gap-2 py-2.5"><div className="min-w-0 flex-1"><div className="truncate font-medium text-white">{session.nickname}</div><div className="text-[10px] text-white/35">{session.address}:{session.port}</div></div><button type="button" className={button} disabled={!nickname.trim() || state.status !== 'idle'} onClick={()=>client.join(session.id,nickname)}>{t('Join')}</button></li>)}</ul>}
          <p className="mt-4 text-[10px] leading-relaxed text-white/35">{t('LAN traffic is unencrypted. Only approve people you trust. Camera and visual settings remain local.')}</p>
        </>}
        {active && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold text-white">{t('Session')}: {state.owner}</div><div className="text-[10px] text-white/40">{t(state.status === 'host' ? 'You are the host' : 'Connected to host')}</div></div><button type="button" className={button} onClick={()=>client.leave()}>{t(state.status === 'host' ? 'End session' : 'Disconnect')}</button></div>
          {state.status === 'host' && <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={state.joinable} onChange={event=>client.setJoinable(event.target.checked)} /> {t('Joinable session')}</label>}
          {state.requests.map(request=><div key={request.requestId} className="mt-3 rounded border border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 p-3"><p className="text-white"><strong>{request.nickname}</strong> {t('wants to join your session.')}</p><div className="mt-2 flex gap-2"><button type="button" className={button} onClick={()=>client.approve(request.requestId,true)}>{t('Accept')}</button><button type="button" className={button} onClick={()=>client.approve(request.requestId,false)}>{t('Deny')}</button></div></div>)}
          <h3 className="mt-5 border-b border-white/10 pb-2 font-semibold text-white">{t('Players')} ({state.players.length})</h3>
          <ul className="divide-y divide-white/10">{state.players.map(player=><li key={player.id} className="flex items-center gap-2 py-2.5"><Users size={13} className="text-white/40" /><span className="min-w-0 flex-1 truncate">{player.nickname} {player.id === state.selfId ? `(${t('you')})` : ''} {player.owner ? `· ${t('host')}` : ''}</span>{state.status === 'host' && !player.owner && <button type="button" className={button} onClick={()=>client.kick(player.id)}>{t('Kick')}</button>}</li>)}</ul>
          <p className="mt-4 flex items-center gap-1.5 text-[10px] text-white/40"><MessageSquare size={12} />{t('Open Chat next to Statistics to message the session.')}</p>
        </>}
      </div>
      <WindowResizeHandle frame={frame} minWidth={330} minHeight={300} margin={12} onResize={setSize} />
    </div>
  </div>;
}
export function ChatPanel({client}:{client:MultiplayerClient}) {
  const state=useSyncExternalStore(client.subscribe,client.getState);
  const [draft,setDraft]=useState(''), scroll=useRef<HTMLDivElement>(null);
  useEffect(()=>{ if(scroll.current) scroll.current.scrollTop=scroll.current.scrollHeight; },[state.messages]);
  const active=state.status === 'host' || state.status === 'guest';
  return <div className="flex min-h-0 flex-1 flex-col bg-[#1e1e1e]">
    <div ref={scroll} className="thin-scroll min-h-0 flex-1 overflow-auto p-2 text-[11px] text-white/75" aria-label={t('Chat messages')}>
      {!active && <p className="text-white/40">{t('Host or join a multiplayer session to chat.')}</p>}
      {state.messages.map(message=><div key={message.id} className="break-words py-0.5"><time className="mr-2 text-white/30">{new Date(message.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><strong className="mr-1 text-[var(--app-accent-bright)]">{message.sender}:</strong><span className="whitespace-pre-wrap">{message.text}</span></div>)}
    </div>
    <form className="flex gap-1 border-t border-white/10 p-1.5" onSubmit={event=>{event.preventDefault();if(draft.trim()){client.chat(draft);setDraft('');}}}><input aria-label={t('Chat message')} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={2000} disabled={!active} placeholder={t('Message the session…')} className="min-w-0 flex-1 rounded border border-white/10 bg-[#29292c] px-2 py-1 text-[11px] text-white outline-none disabled:opacity-40" /><button type="submit" className={button} disabled={!active || !draft.trim()}>{t('Send')}</button></form>
  </div>;
}
