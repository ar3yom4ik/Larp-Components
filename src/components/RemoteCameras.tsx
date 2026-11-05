import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MultiplayerClient, Player } from '../multiplayer/client';

function RemoteCamera({player}:{player:Player}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
    canvas.width = 512; canvas.height = 80;
    ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const width = Math.min(500, ctx.measureText(player.nickname).width + 24);
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect((512-width)/2, 12, width, 56);
    ctx.fillStyle = '#fff'; ctx.fillText(player.nickname,256,42,476);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  },[player.nickname]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  if (!player.pose) return null;
  return <group position={player.pose.position} userData={{remoteCamera:player.id,nickname:player.nickname}}>
    <group quaternion={player.pose.quaternion}><mesh><boxGeometry args={[.58,.38,.36]} /><meshStandardMaterial color="#323942" metalness={.5} roughness={.4} /></mesh>
    <mesh position={[0,0,-.25]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.15,.18,.22,16]} /><meshStandardMaterial color="#10151c" metalness={.7} roughness={.25} /></mesh>
    <mesh position={[0,0,-.38]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.11,.11,.02,16]} /><meshStandardMaterial color="#55b9ed" emissive="#16749b" emissiveIntensity={.4} /></mesh>
    </group><sprite position={[0,.55,0]} scale={[2.8,.44,1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>
  </group>;
}
/** Publish only the local camera; every other player gets a billboard name. */
export function RemoteCameras({client}:{client:MultiplayerClient}) {
  const state=useSyncExternalStore(client.subscribe,client.getState), {camera, scene}=useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const debug = () => { const avatars: {id:string; nickname:string}[] = []; scene.traverse(node => { if (node.userData.remoteCamera) avatars.push({id:node.userData.remoteCamera, nickname:node.userData.nickname}); }); return avatars; };
    (window as unknown as {__larpRemoteCameras?: typeof debug}).__larpRemoteCameras = debug;
    return () => { delete (window as unknown as {__larpRemoteCameras?: typeof debug}).__larpRemoteCameras; };
  }, [scene]);
  const elapsed=useRef(0), last=useRef('');
  useFrame((_,delta)=>{
    if (!client.active) return;
    elapsed.current += delta;
    if (elapsed.current < .1) return;
    const pose={position:camera.position.toArray() as [number,number,number],quaternion:camera.quaternion.toArray() as [number,number,number,number]};
    const key=[...pose.position,...pose.quaternion].map(n=>n.toFixed(3)).join(',');
    if (key !== last.current || elapsed.current >= 1) { client.presence(pose); last.current=key; elapsed.current=0; }
  });
  return <>{state.players.filter(p=>p.id !== state.selfId).map(player=><RemoteCamera key={player.id} player={player} />)}</>;
}
