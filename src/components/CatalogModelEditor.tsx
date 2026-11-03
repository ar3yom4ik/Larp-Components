import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { X } from 'lucide-react';
import type { SceneItem, Vec3 } from '../types';
import { importedModelSize } from '../data/products';
import { t } from '../i18n';
import { ImportedModel } from './ImportedModel';
import { ModelMaterialEditor } from './ModelMaterialEditor';
import { WindowResizeHandle, type WindowSize } from './WindowResizeHandle';

function PreviewCamera({ size }: { size: Vec3 }) {
  const { camera, invalidate } = useThree();
  const span = Math.max(...size, 0.01);
  useEffect(() => {
    camera.position.set(span * 1.8, size[1] / 2 + span * 1.3, span * 1.8);
    camera.near = Math.max(0.0001, span / 1000);
    camera.far = Math.max(100, span * 100);
    camera.updateProjectionMatrix();
    camera.lookAt(0, size[1] / 2, 0);
    invalidate();
  }, [camera, invalidate, span, size[1]]);
  return <OrbitControls makeDefault target={[0, size[1] / 2, 0]} minDistance={span * .05} maxDistance={Math.max(span * 20, 1)} />;
}

/** Edits the shared imported asset, rather than just one placement. */
export function CatalogModelEditor({ item, onUpdate, onBeginEdit, onClose }: {
  item: SceneItem;
  onUpdate: (id: string, changes: Partial<SceneItem>, record?: boolean) => boolean | void;
  onBeginEdit: () => void;
  onClose: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState<WindowSize | null>(null);
  const dimensions = item.imported ? importedModelSize(item.imported, item.scale) : [1, 1, 1] as Vec3;
  const updateScale = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    onUpdate(item.id, { scale: Math.max(.001, Math.min(1000, value)) }, false);
  };
  const gridSize = Math.max(...dimensions, .1) * 2;
  return <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/55 p-3" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={frame} role="dialog" aria-label={t('Edit catalog model')} style={{ width: windowSize?.width ?? 'min(900px,calc(100vw - 24px))', height: windowSize?.height ?? 'min(720px,calc(100dvh - 24px))' }} className="relative flex min-h-0 flex-col overflow-hidden rounded border border-white/15 bg-[#29292d] shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/10 p-3">
        <div><h2 className="text-sm text-white">{t('Edit catalog model')} · {item.name}</h2><p className="text-[10px] text-white/45">{t('Changes apply to every instance of this imported asset.')}</p></div>
        <button type="button" aria-label={t('Close')} onClick={onClose} className="p-2 text-white/60"><X size={16} /></button>
      </header>
      <div className="catalog-editor-body min-h-0 flex-1">
        <div className="thin-scroll catalog-editor-settings min-h-0 overflow-y-auto">
          <section className="grid grid-cols-2 gap-3 border-b border-white/10 px-3 py-3">
            <label className="text-[10px] text-white/55">{t('Physics mode')}<select aria-label={t('Shared physics mode')} value={String(item.props.physicsMode ?? 'legacy')} onChange={event => onUpdate(item.id, { props: { ...item.props, physicsMode: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white"><option value="legacy">{t('Standard')}</option><option value="kinematic">{t('Kinematic')}</option><option value="dynamic">{t('Dynamic')}</option></select></label>
            <label className="text-[10px] text-white/55">{t('Collision shape')}<select aria-label={t('Shared collision shape')} value={String(item.props.collisionShape ?? 'accurate')} onChange={event => onUpdate(item.id, { props: { ...item.props, collisionShape: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white"><option value="accurate">{t('Accurate')}</option><option value="box">{t('Box')}</option></select></label>
            <label className="text-[10px] text-white/55">{t('Mass (kg)')}<input aria-label={t('Shared mass (kg)')} type="number" min="0.01" max="1000000" step="0.1" value={Number(item.props.physicsMass ?? 1)} onFocus={onBeginEdit} onChange={event => onUpdate(item.id, { props: { ...item.props, physicsMass: Math.max(.01, Math.min(1000000, Number(event.target.value) || .01)) } }, false)} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white" /></label>
            <label className="text-[10px] text-white/55">{t('Restitution / bounce')}<input aria-label={t('Shared restitution / bounce')} type="number" min="0" max="1" step="0.05" value={Number(item.props.physicsRestitution ?? .03)} onFocus={onBeginEdit} onChange={event => onUpdate(item.id,{props:{...item.props,physicsRestitution:Math.max(0,Math.min(1,Number(event.target.value)||0))}},false)} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white" /></label>
            <label className="text-[10px] text-white/55">{t('Friction')}<input aria-label={t('Shared friction')} type="number" min="0" max="1" step="0.05" value={Number(item.props.physicsFriction ?? .6)} onFocus={onBeginEdit} onChange={event => onUpdate(item.id,{props:{...item.props,physicsFriction:Math.max(0,Math.min(1,Number(event.target.value)||0))}},false)} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white" /></label>
            <label className="text-[10px] text-white/55">{t('Model scale')}<input aria-label={t('Model scale')} type="number" min="0.001" max="1000" step="0.1" value={Number(item.scale.toPrecision(7))} onFocus={onBeginEdit} onChange={event => updateScale(Number(event.target.value))} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white" /></label>
            <div className="col-span-2 grid grid-cols-3 gap-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis} className="text-[10px] text-white/55">{t('Size')} {axis} (m)<input aria-label={`${t('Size')} ${axis} (m)`} type="number" min="0.001" step="0.01" value={Number(dimensions[index].toPrecision(5))} onFocus={onBeginEdit} onChange={event => { const next = Number(event.target.value); if (next > 0 && dimensions[index] > 0) updateScale(item.scale * next / dimensions[index]); }} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white" /></label>)}
            </div>
            <p className="col-span-2 text-[10px] text-white/40">{t('Dimensions scale proportionally and apply to all placements and workpieces.')}</p>
          </section>
          <ModelMaterialEditor item={item} onUpdate={onUpdate} onBeginEdit={onBeginEdit} />
        </div>
        <section aria-label={t('3D model preview')} className="catalog-editor-preview relative min-h-[240px] min-w-0 overflow-hidden border-l border-white/10 bg-[#1d2228]">
          <div className="pointer-events-none absolute left-3 top-3 z-10 text-[10px] text-white/55">{t('3D preview')} · {t('Drag to orbit · wheel to zoom')}</div>
          {item.imported && <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 35, near: .001, far: 10000 }} gl={{ antialias: true, alpha: false }}>
            <color attach="background" args={['#1d2228']} />
            <ambientLight intensity={1.4} /><hemisphereLight args={['#ffffff', '#718090', 1.1]} /><directionalLight position={[5, 8, 5]} intensity={2.1} />
            <PreviewCamera size={dimensions} />
            <group scale={item.scale}><ImportedModel model={item.imported} id={`catalog-preview-${item.id}`} /></group>
            <gridHelper args={[gridSize, 10, '#53616b', '#39434b']} position={[0, -.002 * gridSize, 0]} raycast={() => null} />
          </Canvas>}
        </section>
      </div>
      <WindowResizeHandle frame={frame} minWidth={320} minHeight={260} onResize={setWindowSize} />
    </div>
  </div>;
}
