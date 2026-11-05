import { MultiplayerClient } from './multiplayer/client';
import { captureSimulation, applySimulation } from './multiplayer/simulation';
import { MultiplayerDialog } from './components/Multiplayer';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { isRobotKind } from "./utils/kinds";
import { CheckCircle2, Info, SlidersHorizontal, X } from "lucide-react";
import { AppChrome } from "./components/WorkspaceChrome";
import { LibraryPanel } from "./components/LibraryPanel";
import { Viewport } from "./components/Viewport";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { BottomDock, type DockTab } from "./components/BottomDock";
import { GeneratorDialog } from "./components/GeneratorDialog";
import { getDef, makeItem } from "./data/library";
import { IMPORTED_PRODUCT_PREFIX, itemsWithWorkpieces, updateWorkpieceCatalog } from "./data/products";
import { DEFAULT_LAYOUT, cloneItems, defaultScene } from "./data/layouts";
import { DEFAULT_GEN, type GenOptions } from "./sim/generator";
import { sim } from "./sim/engine";
import { useSimSnapshot } from "./sim/hooks";
import { useDevice } from "./utils/device";
import { t, useLanguage } from "./i18n";
import { useAppearance, SKINS, setBuilding } from "./theme";
import { estimateProjectBytes, MAX_PROJECT_CHARS, parseProject, serializeProject } from "./utils/project";
import { nearestSensorFraction, resolveMountedSensors } from "./utils/sensorMount";
import { copySceneItems, snapshotSceneItems } from "./utils/sceneClipboard";
import { createProjectArchive, MAX_ARCHIVE_BYTES, readProjectArchive } from "./utils/projectArchive";
import { loadExportHandle, storeExportHandle, clearExportHandle, permission, type ExportHandle } from "./utils/handles";
import { MobileChrome, MobileNav, ProjectSettings, type TouchPanel } from "./components/MobileChrome";
import { MobileTools } from "./components/MobileTools";
import { ModelImportDialog } from "./components/ModelImportDialog";
import { CatalogModelEditor } from "./components/CatalogModelEditor";
import { DEFAULT_WORKER_SETTINGS } from "./components/RiggedHuman";
import { eventMatches, isCapturing } from "./keybinds";
import { closeSettings, openSettings, useSettingsWindow } from "./settingsWindow";
import { SettingsDialog } from "./components/SettingsDialog";
import { sendViewportCommand } from "./viewportCommands";
import { buildLine } from "./buildInfo";
import { PanelShell } from "./components/PanelShell";
import { FloorMapWindow } from "./components/FloorMapWindow";
import { WindowResizeHandle, type WindowSize } from "./components/WindowResizeHandle";
import { setPanel, useLayout } from "./layout";
import { loadAutosave, saveAutosave } from "./utils/projectStore";
import { getCachedModel } from "./utils/modelImport";
import { buildImportedCollision, importedCollision, registerImportedCollision } from "./utils/modelCollision";
import { programToCode } from "./sim/programCode";
import type { ComponentKind, ImportedModelData, LayoutPreset, SceneItem, ToolMode, Vec3 } from "./types";
import { cn } from "./utils/cn";

const STORAGE_KEY = "larp-components-project-v1";
const STORAGE_TIME_KEY = "larp-components-project-v2-time";

interface ProjectData {
  items: SceneItem[];
  workpieces: SceneItem[];
  projectName: string;
  layoutName: string;
  activeLayoutId: string | null;
}

interface Toast {
  id: number;
  message: string;
  tone: "success" | "info";
}



function loadInitialProject(): ProjectData {
  const fallback: ProjectData = {
    items: defaultScene(),
    workpieces: [],
    projectName: "Assembly cell",
    layoutName: DEFAULT_LAYOUT.name,
    activeLayoutId: DEFAULT_LAYOUT.id,
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseProject(stored);
      return { items: parsed.items, workpieces: parsed.workpieces ?? [], projectName: parsed.projectName, layoutName: parsed.layoutName, activeLayoutId: parsed.activeLayoutId };
    }
  } catch {
    // a corrupt project must never block the studio
  }
  return fallback;
}

let booted = false;
function bootLog() {
  if (booted) return;
  booted = true;
  sim.log("OnAppInitialized", "info");
  sim.log("Larp Components 5.1 - physics engine ready (60 Hz fixed step)", "info");
  sim.log("RoboticsAPI: robot programs are JavaScript - open the PROGRAM tab to edit them", "info");
  sim.log("AIFactory: ready. Describe the factory, then press 'Build factory'.", "info");
}

export default function App() {
  const language = useLanguage();
  const { mobile, mode: interfaceMode, setMode: setInterfaceMode } = useDevice();
  const appearance = useAppearance();
  const settingsOpen = useSettingsWindow().open;
  const setSettingsOpen = (open: boolean) => (open ? openSettings() : closeSettings());
  const [storageReady, setStorageReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [restoreSlow, setRestoreSlow] = useState(false);
  const skipRestore = useRef(false);
  const autosaveDisabled = useRef(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const multiplayerRef = useRef<MultiplayerClient | null>(null);
  const [catalogEditId, setCatalogEditId] = useState<string | null>(null);
  const [loadingPosition, setLoadingPosition] = useState<Vec3 | null>(null);
  const viewCenter = useRef<() => Vec3>(() => [0, 0, 0]);
  const registerViewCenter = useCallback((getCenter: () => Vec3) => { viewCenter.current = getCenter; }, []);
  const moveLoading = useCallback((position: Vec3) => { importPosition.current = position; setLoadingPosition(position); }, []);
  const importPosition = useRef<Vec3 | null>(null);
  const setImportLoading = useCallback((loading:boolean) => {
    if (loading) { importPosition.current ??= viewCenter.current(); setLoadingPosition(importPosition.current); }
    else { setLoadingPosition(null); importPosition.current = null; }
  }, []);
  const [modelFiles, setModelFiles] = useState<File[] | null>(null);
  const [modelTarget, setModelTarget] = useState<string | null>(null);
  const [initial] = useState<ProjectData>(() => {
    const project = loadInitialProject();
    sim.sync(itemsWithWorkpieces(project.items, updateWorkpieceCatalog(project.items, project.workpieces)));
    bootLog();
    return project;
  });
  const [items, setItems] = useState<SceneItem[]>(initial.items);
  const itemsRef = useRef<SceneItem[]>(initial.items);
  const [workpieces, setWorkpieces] = useState<SceneItem[]>(() => updateWorkpieceCatalog(initial.items, initial.workpieces));
  const workpiecesRef = useRef(workpieces);
  const productItems = useMemo(() => itemsWithWorkpieces(items, workpieces), [items, workpieces]);
  const [projectName, setProjectName] = useState(initial.projectName);
  useEffect(() => { document.documentElement.lang = language; document.title = `${projectName} - ${SKINS[appearance.skin].appName}`; }, [language, projectName, appearance.skin]);
  const [layoutName, setLayoutName] = useState(initial.layoutName);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(initial.activeLayoutId);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const first = initial.items.find((item) => item.kind === "robot")?.id;
    return first ? [first] : [];
  });
  const selectedId = selectedIds.at(-1) ?? null;
  // Existing panels select one primary item; the viewport can also toggle or
  // replace a group without changing those panels' single-item contract.
  const setSelectedId = useCallback((value: string | null | ((current: string | null) => string | null)) => {
    setSelectedIds(current => {
      const next = typeof value === "function" ? value(current.at(-1) ?? null) : value;
      return next ? [next] : [];
    });
  }, []);
  const selectViewport = useCallback((id: string | null, mode: "replace" | "toggle" | "preserve" = "replace") => {
    setSelectedIds(current => {
      if (!id) return mode === "replace" ? [] : current;
      if (mode === "preserve" && current.includes(id)) return current;
      if (mode === "toggle") return current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      return [id];
    });
  }, []);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [tool, setTool] = useState<ToolMode>("select");
  const [snap, setSnap] = useState(true);
  const [focusSignal, setFocusSignal] = useState(0);
  const [layoutsSignal, setLayoutsSignal] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobilePanel, setMobilePanel] = useState<TouchPanel>(null);
  const mobilePanelFrame = useRef<HTMLElement>(null);
  const [mobilePanelSize, setMobilePanelSize] = useState<WindowSize | null>(null);
  const [dockTab, setDockTab] = useState<DockTab>("output");
  const [dockExpanded, setDockExpanded] = useState(false);
  const [showApi, setShowApi] = useState(0);
  const [genOpen, setGenOpen] = useState(false);
  const [floorMapOpen, setFloorMapOpen] = useState(false);
  const layout = useLayout();
  // Read inside event handlers without making them re-register on every layout change.
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [genOptions, setGenOptions] = useState<GenOptions>(DEFAULT_GEN);
  const [running, setRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const toastCounter = useRef(0);
  const clipboard = useRef<{items:SceneItem[]; cut:boolean; pasteCount:number} | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const fileHandle = useRef<ExportHandle | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const handleGeneration = useRef(0);
  const [exportedName, setExportedName] = useState<string | null>(null);
  useEffect(() => { let alive = true; const generation = handleGeneration.current; void loadExportHandle().then((handle) => { if (alive && generation === handleGeneration.current && handle) { fileHandle.current = handle; setExportedName(handle.name); } }); return () => { alive = false; }; }, []);
  const detachExportHandle = () => { handleGeneration.current++; fileHandle.current = null; setExportedName(null); void clearExportHandle(); };

  type SceneSnapshot = {items: SceneItem[]; workpieces: SceneItem[]};
  const pastRef = useRef<SceneSnapshot[]>([]);
  const futureRef = useRef<SceneSnapshot[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  /* ----- simulation bridge ----- */

  useLayoutEffect(() => {
    sim.sync(productItems);
  }, [productItems]);
  useEffect(() => {
    if (sim.networkGuest) sim.running = running; else sim.setRunning(running);
  }, [running]);
  useEffect(() => {
    sim.setSpeed(simSpeed);
  }, [simSpeed]);
  useEffect(() => {
    setSelectedPoint(null);
  }, [selectedId]);

  /* ----- helpers ----- */

  const notify = useCallback((message: string, tone: "success" | "info" = "success") => {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  }, []);

  const syncHistory = useCallback(() => { if (!multiplayerRef.current?.active) setHistoryCounts({ past: pastRef.current.length, future: futureRef.current.length }); }, []);
  const remember = useCallback((snapshot: SceneItem[]) => {
    if (multiplayerRef.current?.active) { multiplayerRef.current.beginEdit(); return; }
    pastRef.current = [...pastRef.current.slice(-39), {items: snapshot, workpieces: workpiecesRef.current}];
    futureRef.current = [];
  }, []);
  const applyItems = useCallback((next: SceneItem[], catalog?: SceneItem[], remote = false) => {
    next = resolveMountedSensors(next);
    const nextCatalog = updateWorkpieceCatalog(next, catalog ?? workpiecesRef.current);
    itemsRef.current = next;
    workpiecesRef.current = nextCatalog;
    setItems(next);
    setWorkpieces(nextCatalog);
    if (!remote) multiplayerRef.current?.updateScene(next, nextCatalog);
    return nextCatalog;
  }, []);
  // The collaborative scene is field-merged; only the host advances simulation.
  const metadataRef = useRef({projectName, layoutName, activeLayoutId});
  metadataRef.current = {projectName, layoutName, activeLayoutId};
  if (!multiplayerRef.current) multiplayerRef.current = new MultiplayerClient({
    onHosted: () => {
      const client = multiplayerRef.current!;
      pastRef.current = []; futureRef.current = [];
      client.updateScene(itemsRef.current, workpiecesRef.current);
      client.updateMeta(metadataRef.current); client.clearHistory();
      sim.networkGuest = false; sim.networkAction = null;
      notify('Session started');
    },
    onJoined: () => {
      pastRef.current = []; futureRef.current = [];
      skipRestore.current = true; setStorageReady(true);
      sim.networkGuest = true;
      sim.networkAction = (action, value) => multiplayerRef.current?.action(action, value);
      sim.running = false; setRunning(false);
      notify('Joined the shared session');
    },
    onScene: (scene) => {
      const catalog = applyItems(scene.items, scene.workpieces, true);
      sim.sync(itemsWithWorkpieces(scene.items, catalog));
      setProjectName(scene.projectName); setLayoutName(scene.layoutName); setActiveLayoutId(scene.activeLayoutId);
      setSelectedIds(current => current.filter(id => scene.items.some(item => item.id === id)));
    },
    onSimulation: (snapshot) => {
      const value = applySimulation(snapshot);
      if (value) { setRunning(value.running); setSimSpeed(value.speed); }
    },
    onAction: (action, value) => {
      if (action === 'run' && typeof value === 'boolean') { sim.setRunning(value); setRunning(value); }
      if (action === 'speed' && typeof value === 'number' && Number.isFinite(value)) { sim.setSpeed(value); setSimSpeed(sim.speed); }
      if (action === 'reset') { sim.setRunning(false); sim.reset(); setRunning(false); }
      if (action === 'pressButton' && typeof value === 'string') sim.pressButton(value);
      if (action === 'replacePallet' && typeof value === 'string') sim.replacePallet(value);
    },
    onHistory: (past, future) => setHistoryCounts({past, future}),
    onEnded: (reason) => {
      if (sim.networkGuest) {
        sim.networkGuest = false; sim.networkAction = null; sim.networkPoses.clear();
        sim.setRunning(false); sim.reset(); setRunning(false);
      }
      notify(reason, 'info');
    },
  });
  const multiplayer = multiplayerRef.current;
  // Camera presence can update ten times a second per player. Subscribe here
  // only to the primitive values App actually needs, not the whole roster.
  const multiplayerStatus = useSyncExternalStore(multiplayer.subscribe, () => multiplayer.getState().status);
  const multiplayerRequestCount = useSyncExternalStore(multiplayer.subscribe, () => multiplayer.getState().requests.length);
  useEffect(() => { if (multiplayerRequestCount) setMultiplayerOpen(true); }, [multiplayerRequestCount]);
  useEffect(() => {
    if (multiplayerStatus !== 'host') return;
    const timer = window.setInterval(() => { if (multiplayer.hasGuests) multiplayer.simulation(captureSimulation()); }, 150);
    return () => window.clearInterval(timer);
  }, [multiplayer, multiplayerStatus]);
  useEffect(() => () => multiplayer.close(), [multiplayer]);
  // Restore IndexedDB after V1's synchronous localStorage fallback, without
  // allowing an initial render to overwrite a newer large project.
  useEffect(() => {
    let alive = true;
    const timeout = window.setTimeout(() => { if (alive) setRestoreSlow(true); }, 5000);
    void loadAutosave().then((saved) => {
      if (!alive || skipRestore.current || !saved) return;
      let localTime = 0; try { localTime = Number(localStorage.getItem(STORAGE_TIME_KEY) || 0); } catch { /* sandbox */ }
      if (saved.updatedAt < localTime) return;
      try {
        const project = parseProject(saved.text);
        const catalog = applyItems(project.items, project.workpieces ?? []); setProjectName(project.projectName); setLayoutName(project.layoutName); setActiveLayoutId(project.activeLayoutId);
        setSelectedId(project.items.find((i) => isRobotKind(i.kind))?.id ?? null);
        sim.sync(itemsWithWorkpieces(project.items, catalog)); sim.setRunning(project.items.length > 0); setRunning(project.items.length > 0);
      } catch { notify("Stored project could not be restored; using the local fallback.", "info"); }
    }).catch(() => { /* localStorage remains the fallback */ }).finally(() => { if (alive && !skipRestore.current) { window.clearTimeout(timeout); setStorageReady(true); } });
    return () => { alive = false; window.clearTimeout(timeout); };
  }, [applyItems, notify]);

  const beginEdit = useCallback(() => {
    remember(itemsRef.current);
    syncHistory();
  }, [remember, syncHistory]);

  const fitsProject = useCallback((next: SceneItem[], existingCatalog:SceneItem[] = workpiecesRef.current) => {
    // Count UTF-8 bytes without copying base64 payloads. Reserve room for later title edits.
    const catalog = updateWorkpieceCatalog(next, existingCatalog);
    if (estimateProjectBytes({items:next, workpieces:catalog, projectName, layoutName, activeLayoutId}) <= MAX_PROJECT_CHARS - 4096) return true;
    notify(t("Project would exceed the 180 MB limit. Remove assets or start a new project."), "info");
    return false;
  }, [activeLayoutId, layoutName, notify, projectName]);

  // Older projects may have hidden or already-deleted imported sources with
  // no saved bounds/collider. Derive those assets in the background, without
  // requiring a scene object to be made visible. Process one asset at a time.
  const examinedAssets = useRef(new WeakSet<object>());
  useEffect(() => {
    if (!storageReady) return;
    let alive = true;
    void (async () => {
      for (const entry of productItems) {
        const model = entry.imported;
        if (
          entry.kind !== "imported-model" ||
          !model ||
          (model.sourceSize && model.collision) ||
          examinedAssets.current.has(model.asset)
        )
          continue;
        try {
          const { root } = await getCachedModel(model.asset);
          if (!alive) return;
          examinedAssets.current.add(model.asset);
          root.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(root),
            size = bounds.getSize(new THREE.Vector3());
          const sourceSize: Vec3 | undefined =
            !bounds.isEmpty() && [size.x, size.y, size.z].every(Number.isFinite)
              ? [size.x, size.y, size.z]
              : undefined;
          const collision =
            importedCollision(model) ?? buildImportedCollision(root);
          if (collision && !importedCollision(model))
            registerImportedCollision(model.asset, collision);
          const update = (item: SceneItem) => {
            const current = item.imported;
            if (
              !current ||
              current.asset !== model.asset ||
              ((current.sourceSize || !sourceSize) &&
                (current.collision || !collision))
            )
              return item;
            return {
              ...item,
              imported: {
                ...current,
                sourceSize: current.sourceSize ?? sourceSize,
                collision: current.collision ?? collision,
              },
            };
          };
          const next = itemsRef.current.map(update),
            catalog = updateWorkpieceCatalog(
              next,
              workpiecesRef.current.map(update),
            );
          const changed =
            next.some((item, i) => item !== itemsRef.current[i]) ||
            catalog.some((item, i) => item !== workpiecesRef.current[i]);
          if (
            changed &&
            estimateProjectBytes({
              items: next,
              workpieces: catalog,
              projectName,
              layoutName,
              activeLayoutId,
            }) <=
              MAX_PROJECT_CHARS - 4096
          ) {
            applyItems(next, catalog);
            return; // The updated catalogue starts the next pass.
          }
        } catch {
          if (!alive) return;
          examinedAssets.current.add(model.asset); // Keep other imports usable if one asset is invalid.
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    activeLayoutId,
    applyItems,
    layoutName,
    productItems,
    projectName,
    storageReady,
  ]);

  const updateItem = useCallback(
    (id: string, changes: Partial<SceneItem>, record = true) => {
      const moving = itemsRef.current.find((item) => item.id === id);
      if (changes.position && moving && (moving.kind === "laser" || moving.kind === "color-sensor" || moving.kind === "sensor" || moving.kind === "button") && moving.props.mountedTo) {
        const belt = itemsRef.current.find((item) => item.id === moving.props.mountedTo);
        if (belt) changes = {...changes, props:{...moving.props, ...changes.props, mountPosition:nearestSensorFraction(sim.getLiveItem(belt.id) ?? belt,changes.position)}};
      }
      const assetId = changes.imported && moving?.imported?.asset.id;
      const next = itemsRef.current.map((item) => item.id === id ? {
        ...item, ...changes,
        position: changes.position ? ([...changes.position] as Vec3) : item.position,
        props: changes.props ? { ...changes.props } : item.props,
      } : assetId && item.imported?.asset.id === assetId ? {...item, imported:changes.imported} : item);
      const catalog = assetId ? workpiecesRef.current.map(item => item.imported?.asset.id === assetId ? {...item,imported:changes.imported} : item) : workpiecesRef.current;
      if ((changes.imported || changes.worker) && estimateProjectBytes({items:next,workpieces:catalog,projectName,layoutName,activeLayoutId}) > MAX_PROJECT_CHARS - 4096) { notify(t("Project would exceed the 180 MB limit. Remove assets or start a new project."), "info"); return false; }
      if (record) remember(itemsRef.current);
      applyItems(next, catalog);
      if (record) syncHistory();
      return true;
    },
    [applyItems, activeLayoutId, layoutName, notify, projectName, remember, syncHistory],
  );

  const addComponent = useCallback(
    (kind: ComponentKind, position?: Vec3) => {
      const item = makeItem(kind, position ?? viewCenter.current());
      const next = [...itemsRef.current, item];
      if (!fitsProject(next)) return;
      remember(itemsRef.current);
      applyItems(next);
      syncHistory();
      setSelectedId(item.id);
      notify(`${getDef(kind).name} added`);
    },
    [applyItems, fitsProject, notify, remember, syncHistory],
  );

  const addCatalogModel = useCallback((id:string, position?:Vec3) => {
    const base = workpiecesRef.current.find(item => item.id === id);
    if (!base?.imported) return;
    const instance = makeItem("imported-model", position ?? viewCenter.current(), 0, {name:base.name, scale:base.scale, color:base.color, props:{...base.props,catalogBaseId:base.id}, imported:base.imported});
    const next=[...itemsRef.current,instance]; if(!fitsProject(next)) return;
    remember(itemsRef.current);applyItems(next);syncHistory();setSelectedId(instance.id);
  },[applyItems,fitsProject,remember,syncHistory]);
  const updateMany = useCallback((edits: {id:string; changes:Partial<SceneItem>}[], record = false) => {
    if (!edits.length) return;
    const byId = new Map(edits.map(edit => [edit.id, edit.changes]));
    let next = itemsRef.current.map(item => {
      const changes = byId.get(item.id);
      return changes ? {...item, ...changes, position: changes.position ? [...changes.position] as Vec3 : item.position, props: changes.props ? {...changes.props} : item.props} : item;
    });
    next = next.map(item => {
      const changes = byId.get(item.id);
      if (!changes?.position || !['sensor', 'laser', 'color-sensor', 'button'].includes(item.kind) || !item.props.mountedTo || byId.has(String(item.props.mountedTo))) return item;
      const belt = next.find(candidate => candidate.id === item.props.mountedTo);
      return belt ? {...item, props:{...item.props, mountPosition:nearestSensorFraction(belt, changes.position)}} : item;
    });
    if (record) remember(itemsRef.current);
    applyItems(next);
    if (record) syncHistory();
  }, [applyItems, remember, syncHistory]);

  const updateCatalogModel = useCallback((id:string, changes:Partial<SceneItem>, record=true) => {
    const base=workpiecesRef.current.find(item=>item.id===id), assetId=base?.imported?.asset.id;
    if(!assetId) return false;
    const update=(item:SceneItem):SceneItem => item.imported?.asset.id===assetId ? {...item,...(changes.imported?{imported:changes.imported}:{}),...(changes.scale !== undefined ? {scale:changes.scale} : {}),...(changes.props?{props:{...item.props,...changes.props}}:{})} : item;
    const next=itemsRef.current.map(update), catalog=workpiecesRef.current.map(update);
    if(estimateProjectBytes({items:next,workpieces:catalog,projectName,layoutName,activeLayoutId})>MAX_PROJECT_CHARS-4096) return false;
    if(record) remember(itemsRef.current);
    applyItems(next,catalog);if(record)syncHistory();return true;
  },[activeLayoutId,applyItems,layoutName,projectName,remember,syncHistory]);

  const deleteItem = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target) return;
      remember(itemsRef.current);
      applyItems(itemsRef.current.filter((item) => item.id !== id));
      syncHistory();
      setSelectedIds(current => current.filter(value => value !== id));
      notify(`${target.name} removed`, "info");
    },
    [applyItems, notify, remember, syncHistory],
  );

  const removeWorkpiece = useCallback((productId: string) => {
    if (!productId.startsWith(IMPORTED_PRODUCT_PREFIX)) return;
    const id = productId.slice(IMPORTED_PRODUCT_PREFIX.length);
    const saved = workpiecesRef.current.find((item) => item.id === id);
    // A live scene model is still the definition, so remove that object first.
    if (!saved || itemsRef.current.some((item) => item.imported?.asset.id === saved.imported?.asset.id)) return;
    if (!window.confirm(t("Remove this saved workpiece? Components using it will switch to cartons. Existing products may need a simulation reset. You can undo this action."))) return;
    const next = itemsRef.current.map((item) => {
      const props = { ...item.props };
      let changed = false;
      for (const key of ["product", "inputProduct", "outputProduct"]) if (props[key] === productId) { props[key] = "carton"; changed = true; }
      return changed ? { ...item, props } : item;
    });
    remember(itemsRef.current);
    applyItems(next, workpiecesRef.current.filter((item) => item.id !== id));
    syncHistory();
    notify(t("Saved workpiece removed"), "info");
  }, [applyItems, notify, remember, syncHistory]);

  const duplicateItem = useCallback(
    (id: string) => {
      const source = itemsRef.current.find((item) => item.id === id);
      if (!source) return;
      const copy = makeItem(source.kind, [source.position[0] + 1, source.position[1], source.position[2] + 1], source.rotation, {
        rotationX: source.rotationX, rotationZ: source.rotationZ,
        name: `${source.name} copy`,
        scale: source.scale,
        color: source.color,
        props: { ...source.props, ...(source.imported ? {catalogBaseId: typeof source.props.catalogBaseId === "string" ? source.props.catalogBaseId : source.id} : {}) },
        signalTargets: source.signalTargets ? [...source.signalTargets] : undefined,
        signalChannels: source.signalChannels?.map(channel => ({...channel})), signalRoutes: source.signalRoutes?.map(route => ({...route})),
        points: source.points ? source.points.map((p) => [...p] as [number, number]) : undefined,
        pointHeights: source.pointHeights ? [...source.pointHeights] : undefined,
        script: source.script,
        program: source.program ? { ...source.program } : undefined,
        programs: source.programs ? Object.fromEntries(Object.entries(source.programs).map(([key,program]) => [key,{...program}])) : undefined,
        imported: source.imported,
        worker: source.worker,
      });
      const next = [...itemsRef.current, copy];
      if (!fitsProject(next)) return;
      remember(itemsRef.current);
      applyItems(next);
      syncHistory();
      setSelectedId(copy.id);
      notify(`${source.name} duplicated`);
    },
    [applyItems, fitsProject, notify, remember, syncHistory],
  );

  const undo = useCallback(() => {
    if (multiplayerRef.current?.active) { multiplayerRef.current.undo(); return; }
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current = [{items: itemsRef.current, workpieces: workpiecesRef.current}, ...futureRef.current].slice(0, 40);
    applyItems(previous.items, previous.workpieces);
    setSelectedIds(current => current.filter(id => previous.items.some(item => item.id === id)));
    syncHistory();
  }, [applyItems, syncHistory]);

  const redo = useCallback(() => {
    if (multiplayerRef.current?.active) { multiplayerRef.current.redo(); return; }
    const next = futureRef.current.shift();
    if (!next) return;
    pastRef.current = [...pastRef.current, {items: itemsRef.current, workpieces: workpiecesRef.current}].slice(-40);
    applyItems(next.items, next.workpieces);
    setSelectedIds(current => current.filter(id => next.items.some(item => item.id === id)));
    syncHistory();
  }, [applyItems, syncHistory]);


  const deleteSelected = useCallback(() => {
    const ids = new Set(selectedIds);
    const targets = itemsRef.current.filter(item => ids.has(item.id));
    if (!targets.length) { notify("Select a component first", "info"); return; }
    remember(itemsRef.current);
    applyItems(itemsRef.current.filter(item => !ids.has(item.id)));
    syncHistory(); setSelectedIds([]);
    notify(targets.length === 1 ? `${targets[0].name} removed` : `${targets.length} components removed`, "info");
  }, [applyItems, notify, remember, selectedIds, syncHistory]);

  const duplicateSelected = useCallback(() => {
    const ids = new Set(selectedIds);
    const source = itemsRef.current.filter(item => ids.has(item.id));
    if (!source.length) { notify("Select a component first", "info"); return; }
    const copies = copySceneItems(source, [1, 0, 1]);
    const next = [...itemsRef.current, ...copies];
    if (!fitsProject(next)) return;
    remember(itemsRef.current); applyItems(next); syncHistory(); setSelectedIds(copies.map(item => item.id));
    notify(source.length === 1 ? `${source[0].name} duplicated` : `${source.length} components duplicated`);
  }, [applyItems, fitsProject, notify, remember, selectedIds, syncHistory]);

  const copySelected = useCallback(() => {
    const ids = new Set(selectedIds);
    const source = itemsRef.current.filter(item => ids.has(item.id));
    if (!source.length) { notify("Select a component first", "info"); return; }
    clipboard.current = {items:snapshotSceneItems(source), cut:false, pasteCount:0};
    setHasClipboard(true);
    notify(source.length === 1 ? `${source[0].name} copied` : `${source.length} components copied`);
  }, [notify, selectedIds]);

  const cutSelected = useCallback(() => {
    const ids = new Set(selectedIds);
    const source = itemsRef.current.filter(item => ids.has(item.id));
    if (!source.length) { notify("Select a component first", "info"); return; }
    clipboard.current = {items:snapshotSceneItems(source), cut:true, pasteCount:0};
    setHasClipboard(true);
    remember(itemsRef.current); applyItems(itemsRef.current.filter(item => !ids.has(item.id))); syncHistory(); setSelectedIds([]);
    notify(source.length === 1 ? `${source[0].name} cut` : `${source.length} components cut`);
  }, [applyItems, notify, remember, selectedIds, syncHistory]);

  const paste = useCallback(() => {
    const source = clipboard.current;
    if (!source?.items.length) { notify("Nothing to paste", "info"); return; }
    // The first paste after a cut is a move, retaining IDs so external wires and
    // programs reconnect. Subsequent pastes are independent remapped copies.
    const existing = new Set(itemsRef.current.map(item => item.id));
    const restoreCut = source.cut && source.items.every(item => !existing.has(item.id));
    const count = source.pasteCount + 1;
    const copies = restoreCut ? snapshotSceneItems(source.items) : copySceneItems(source.items, [count * .8, 0, count * .8]);
    const next = [...itemsRef.current, ...copies];
    if (!fitsProject(next)) return;
    source.cut = false; source.pasteCount = count;
    remember(itemsRef.current); applyItems(next); syncHistory(); setSelectedIds(copies.map(item => item.id));
    notify(copies.length === 1 ? `${copies[0].name} pasted` : `${copies.length} components pasted`);
  }, [applyItems, fitsProject, notify, remember, syncHistory]);

  const projectText = useCallback(() => serializeProject({ items: itemsRef.current, workpieces: workpiecesRef.current, projectName, layoutName, activeLayoutId }), [activeLayoutId, layoutName, projectName]);

  const saveProject = useCallback(async (silent = false) => {
    if (silent && autosaveDisabled.current) return;
    const text = projectText();
    const now = Date.now();
    let localOK = false;
    if (!autosaveDisabled.current && text.length < 4_000_000) {
      try { localStorage.setItem(STORAGE_KEY, text); localStorage.setItem(STORAGE_TIME_KEY, String(now)); localOK = true; } catch { /* fall back to IndexedDB */ }
    }
    // Do not await before the save picker: browsers require a direct user gesture.
    if (!autosaveDisabled.current) void saveAutosave(text, now).then(() => {
      setStorageFailed(false);
      if (text.length >= 4_000_000) { try { if (Number(localStorage.getItem(STORAGE_TIME_KEY) || 0) <= now) { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIME_KEY); } } catch { /* sandbox */ } }
    }).catch(() => { if (!localOK) { setStorageFailed(true); if (!silent) notify("Autosave unavailable. Export a project copy to keep your work.", "info"); } });
    const handle = fileHandle.current;
    if (handle) {
      // Autosaves never prompt. The Save button can request write permission.
      if (silent) {
        const allowed = await permission(handle, false);
        if (!allowed) return;
      } else if (!(await permission(handle, true))) {
        fileHandle.current = null; notify("Write permission denied", "info"); return;
      }
      try {
        const data = /\.lcmx$/i.test(handle.name) ? new Blob([Uint8Array.from(createProjectArchive(text))], { type: "application/zip" }) : text;
        // Serialize writes so a slower old autosave cannot overwrite a newer one.
        const pending = writeQueue.current.then(async () => {
          if (fileHandle.current !== handle) return;
          const writer = await handle.createWritable(); await writer.write(data); await writer.close();
        });
        writeQueue.current = pending.catch(() => {});
        await pending;
        if (fileHandle.current !== handle) return;
        setExportedName(handle.name);
        if (!silent) notify(`Changes written to ${handle.name}`);
        return;
      } catch {
        if (fileHandle.current === handle) { fileHandle.current = null; setExportedName(null); }
        if (silent) return;
      }
    }
    if (silent) return;
    try {
      const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<ExportHandle> }).showSaveFilePicker;
      if (picker) {
        const picked = await picker({ suggestedName: `${projectName.replace(/[<>:"/\\|?*]+/g, "-").trim() || "factory"}.lcmx`, types: [{ description: "Larp factory project", accept: { "application/zip": [".lcmx"] } }] });
        const writer = await picked.createWritable(); await writer.write(/\.lcmx$/i.test(picked.name) ? new Blob([Uint8Array.from(createProjectArchive(text))], { type: "application/zip" }) : text); await writer.close();
        fileHandle.current = picked; await storeExportHandle(picked); setExportedName(picked.name);
        notify(`Project exported to ${picked.name}`); return;
      }
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return;
      notify("Could not write the project file", "info");
    }
    const blob = new Blob([Uint8Array.from(createProjectArchive(text))], { type: "application/zip" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${projectName.replace(/[<>:"/\\|?*]+/g, "-").trim() || "factory"}.lcmx`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportedName(link.download); notify("Project downloaded (.lcmx)");
  }, [notify, projectText, projectName]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => void saveProject(true), 900);
    return () => window.clearTimeout(timer);
  }, [items, workpieces, projectName, layoutName, activeLayoutId, saveProject, storageReady]);

  /* ----- simulation control ----- */

  const toggleRun = useCallback(() => {
    if (multiplayerRef.current?.isGuest) multiplayerRef.current.action("run", !sim.running);
    else setRunning(value => !value);
  }, []);
  const changeSimSpeed = useCallback((value: number) => {
    if (multiplayerRef.current?.isGuest) multiplayerRef.current.action("speed", value); else setSimSpeed(value);
  }, []);
  const resetSim = useCallback(() => {
    if (multiplayerRef.current?.isGuest) { multiplayerRef.current.action("reset"); return; }
    setRunning(false);
    sim.setRunning(false);
    sim.reset();
  }, []);

  const replaceScene = useCallback(
    (next: SceneItem[], name: string, layoutId: string | null, workpieceCatalog: SceneItem[] = []) => {
      remember(itemsRef.current);
      const catalog = applyItems(next, workpieceCatalog);
      sim.sync(itemsWithWorkpieces(next, catalog));
      if (multiplayerRef.current?.isGuest) multiplayerRef.current.action("reset");
      else { sim.setRunning(false); sim.reset(); }
      setProjectName(name);
      setLayoutName(name);
      setActiveLayoutId(layoutId);
      multiplayerRef.current?.updateMeta({projectName:name, layoutName:name, activeLayoutId:layoutId});
      setSelectedId(next.find((item) => isRobotKind(item.kind))?.id ?? null);
      if (multiplayerRef.current?.isGuest) multiplayerRef.current.action("run", next.length > 0);
      else { setRunning(next.length > 0); sim.setRunning(next.length > 0); }
      syncHistory();
    },
    [applyItems, remember, syncHistory],
  );

  const loadLayout = useCallback(
    (layout: LayoutPreset) => {
      if (!fitsProject(layout.items)) return;
      replaceScene(cloneItems(layout.items), layout.id === "blank" ? "Untitled factory" : layout.name, layout.id, workpiecesRef.current);
      notify(`${layout.name} loaded`);
      sim.log(`Layout "${layout.name}" loaded (${layout.items.length} components)`, "ok");
    },
    [fitsProject, notify, replaceScene],
  );

  const buildGenerated = useCallback(
    (generated: SceneItem[], options: GenOptions) => {
      const materialSources=updateWorkpieceCatalog(itemsRef.current,workpiecesRef.current,generated);
      if (!fitsProject(generated,materialSources)) return;
      setGenOptions(options);
      setGenOpen(false);
      const xs = generated.map((i) => i.position[0]), zs = generated.map((i) => i.position[2]);
      setBuilding({ width: Math.max(20, Math.max(...xs, 8) - Math.min(...xs, -8) + 12), depth: Math.max(16, Math.max(...zs, 6) - Math.min(...zs, -6) + 12), height: 7 });

      replaceScene(cloneItems(generated), `AI Factory ${options.style}-${options.seed}`, null, materialSources);
      const robots = generated.filter((i) => isRobotKind(i.kind)).length;
      sim.log(`AIFactory: built ${generated.length} components (${robots} robots) - seed ${options.seed}`, "ok");
      notify("Factory generated - simulation running");
    },
    [notify, replaceScene],
  );

  const projectInput = useRef<HTMLInputElement>(null);

  const newProject = () => {
    detachExportHandle();
    replaceScene([], "Untitled factory", "blank");
    notify("New factory created", "info");
  };



  const downloadProject = useCallback(() => {
    const text = projectText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${projectName.replace(/[<>:"/\\|?*]+/g, "-").trim() || "factory"}.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Project exported as a new .txt file");
  }, [notify, projectName, projectText]);

  const downloadArchive = useCallback(() => {
    try {
      const blob = new Blob([Uint8Array.from(createProjectArchive(projectText()))], { type: "application/zip" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `${projectName.replace(/[<>:"/\\|?*]+/g, "-").trim() || "factory"}.lcmx`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Project exported as a new .lcmx file");
    } catch (error) { notify(`Could not export project: ${error instanceof Error ? error.message : String(error)}`, "info"); }
  }, [notify, projectName, projectText]);

  const importProject = async (file: File) => {
    try {
      if (file.size > (/\.lcmx$/i.test(file.name) ? MAX_ARCHIVE_BYTES : 180_000_000)) throw new Error("Project exceeds the 180 MB limit.");
      const parsed = parseProject(/\.lcmx$/i.test(file.name) ? readProjectArchive(new Uint8Array(await file.arrayBuffer())) : await file.text());
      if (parsed.items.some((i) => i.script?.trim() && (!i.program || i.script.trim() !== programToCode(i.program).trim())) && !window.confirm(t("This project contains executable JavaScript. Only open scripts from a trusted source. Continue?"))) return;
      replaceScene(parsed.items, parsed.projectName || file.name.replace(/\.(txt|json|lcmx)$/i, ""), parsed.activeLayoutId, parsed.workpieces ?? []);
      setLayoutName(parsed.layoutName);
      multiplayerRef.current?.updateMeta({projectName: parsed.projectName || file.name.replace(/\.(txt|json|lcmx)$/i, ""), layoutName: parsed.layoutName, activeLayoutId: parsed.activeLayoutId});
      detachExportHandle();
      setMobilePanel(null);
      notify("Project imported");
    } catch (error) {
      notify(`Could not import project: ${error instanceof Error ? error.message : String(error)}`, "info");
    }
  };

  const openModelImport = useCallback((files?: File[], workerId?: string, position?:Vec3) => { importPosition.current = position ?? null; setModelFiles(files?.length ? files : null); setModelTarget(workerId || null); setModelOpen(true); }, []);
  const addImportedModel = useCallback((model: ImportedModelData, warnings: string[]) => {
    if (modelTarget) {
      const worker = itemsRef.current.find((candidate) => candidate.id === modelTarget && candidate.kind === "operator");
      if (!worker) { notify("Worker no longer exists", "info"); setModelOpen(false); return true; }
      if (!updateItem(worker.id, {worker:{...(worker.worker || DEFAULT_WORKER_SETTINGS), appearance:"custom", model}}, true)) return false;
      setSelectedId(worker.id); setModelOpen(false); setModelFiles(null); setModelTarget(null);
      if (mobile) setMobilePanel("inspector");
      notify("Rigged character assigned to worker"); return true;
    }
    const name = model.asset.source?.title || model.asset.entry.split("/").pop()?.replace(/\.[^.]+$/, "") || "Imported model";
    const item = makeItem("imported-model", importPosition.current ?? viewCenter.current(), 0, {name, imported:model});
    const next = [...itemsRef.current, item];
    if (!fitsProject(next)) return false;
    remember(itemsRef.current); applyItems(next); syncHistory(); setSelectedId(item.id);
    setModelOpen(false); setModelFiles(null);
    if (mobile) setMobilePanel("inspector");
    sim.log(`Imported model: ${model.asset.entry} (${model.meshCount} meshes)`, "ok");
    if (warnings.length) { sim.log(warnings.join(" "), "warn"); notify(warnings.join(" "), "info"); }
    else notify(`${name} imported`);
    return true;
  }, [applyItems, fitsProject, mobile, modelTarget, notify, remember, syncHistory, updateItem]);

  if (import.meta.env.DEV) (window as unknown as {__larpProject: unknown}).__larpProject = {getItems: () => itemsRef.current, getWorkpieces: () => workpiecesRef.current, getText: projectText, setItems: applyItems, select: setSelectedId, getSelection: () => selectedIds, multiplayer};

  /* ----- spline editing ----- */

  const editPoints = useCallback(
    (mutate: (points: [number, number][], index: number | null, heights: number[]) => { points: [number, number][]; heights: number[]; select: number | null } | null) => {
      const item = itemsRef.current.find((candidate) => candidate.id === selectedId);
      if (!item || !item.points) { notify("Select a path component first", "info"); return; }
      const heights = item.points.map((_, i) => item.pointHeights?.[i] ?? 0);
      const result = mutate(item.points, selectedPoint, heights);
      if (!result) return;
      updateItem(item.id, { points: result.points, ...(["conveyor", "roller"].includes(item.kind) ? { pointHeights: result.heights } : {}) }, true);
      setSelectedPoint(result.select);
    },
    [notify, selectedId, selectedPoint, updateItem],
  );

  const addPoint = () =>
    editPoints((points, index, heights) => {
      let seg = index ?? -1;
      if (seg < 0) {
        let best = 0;
        for (let i = 0; i < points.length - 1; i += 1) {
          const len = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
          if (len > best) {
            best = len;
            seg = i;
          }
        }
      }
      const next = [...points];
      if (seg >= points.length - 1) {
        const a = points[points.length - 2];
        const b = points[points.length - 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        next.push([Math.round((b[0] + ((b[0] - a[0]) / len) * 1.5) * 100) / 100, Math.round((b[1] + ((b[1] - a[1]) / len) * 1.5) * 100) / 100]);
        heights.push(heights[heights.length - 1] ?? 0);
        return { points: next, heights, select: next.length - 1 };
      }
      const a = points[seg];
      const b = points[seg + 1];
      next.splice(seg + 1, 0, [Math.round(((a[0] + b[0]) / 2) * 100) / 100, Math.round(((a[1] + b[1]) / 2) * 100) / 100]);
      heights.splice(seg + 1, 0, (heights[seg] + heights[seg + 1]) / 2);
      return { points: next, heights, select: seg + 1 };
    });

  const removePoint = () =>
    editPoints((points, index, heights) => {
      if (index === null || points.length <= 2) return null;
      return { points: points.filter((_, i) => i !== index), heights: heights.filter((_, i) => i !== index), select: null };
    });

  const reversePath = () => editPoints((points, _index, heights) => ({ points: [...points].reverse(), heights: [...heights].reverse(), select: null }));

  /* ----- programs ----- */

  const applyTemplate = useCallback(
    (template: "palletize" | "tend") => {
      const robot = itemsRef.current.find((item) => item.id === selectedId && (isRobotKind(item.kind))) ?? itemsRef.current.find((item) => isRobotKind(item.kind));
      if (!robot) {
        notify("Add a robot first", "info");
        return;
      }
      const dist = (x: number, z: number) => Math.hypot(x - robot.position[0], z - robot.position[2]);
      const convs = [...sim.conveyors.values()];
      const byEnd = [...convs].sort((a, b) => dist(a.x[a.x.length - 1], a.z[a.z.length - 1]) - dist(b.x[b.x.length - 1], b.z[b.z.length - 1]));
      const input = byEnd[0];
      if (!input) {
        notify("Add a conveyor next to the robot first", "info");
        return;
      }
      let program: NonNullable<SceneItem["program"]>;
      if (template === "palletize") {
        const pallet = itemsRef.current.filter((i) => i.kind === "crates").sort((a, b) => dist(a.position[0], a.position[2]) - dist(b.position[0], b.position[2]))[0];
        if (!pallet) { notify("Add a pallet next to the robot first", "info"); return; }
        program = { mode: "palletize", sourceId: input.id, targetId: pallet.id, repeat: true, delay: 0, clearance: 0.3 };
      } else {
        const machine = itemsRef.current.filter((i) => ["cnc", "press", "weld", "packaging"].includes(i.kind)).sort((a, b) => dist(a.position[0], a.position[2]) - dist(b.position[0], b.position[2]))[0];
        const output = convs.filter((c) => c !== input).sort((a, b) => dist(a.x[0], a.z[0]) - dist(b.x[0], b.z[0]))[0];
        if (!machine || !output) { notify("Tending needs a CNC and a second (output) conveyor", "info"); return; }
        program = { mode: "tend", sourceId: input.id, targetId: output.id, machineId: machine.id, repeat: true, delay: 0, clearance: 0.3 };
      }
      updateItem(robot.id, { program, script: programToCode(program) }, true);
      setSelectedId(robot.id);
      setDockTab("program");
      sim.log(`${robot.name}: ${template} template applied`, "ok");
      notify("Program template applied");
    },
    [notify, selectedId, updateItem],
  );

  const editProgram = () => {
    if (mobile) setMobilePanel("program");
    if (selected && isRobotKind(selected.kind)) {
      setDockTab("program");
    } else {
      const robot = itemsRef.current.find((item) => isRobotKind(item.kind));
      if (robot) setSelectedId(robot.id);
      setDockTab("program");
    }
  };

  const autoArrange = () => {
    const scenery = itemsRef.current.filter((item) => ["wall", "light", "light-panel", "light-flood", "cabinet", "rack"].includes(item.kind));
    if (!scenery.length) {
      notify("Nothing loose to arrange - production equipment is left where it is", "info");
      return;
    }
    remember(itemsRef.current);
    const maxZ = Math.max(...itemsRef.current.map((item) => item.position[2]), 0) + 9;
    const ids = new Map(scenery.map((item, index) => [item.id, index]));
    applyItems(
      itemsRef.current.map((item) => {
        const index = ids.get(item.id);
        if (index === undefined) return item;
        return { ...item, position: [-9 + (index % 5) * 4.5, 0, maxZ + Math.floor(index / 5) * 4.5] as Vec3, rotation: 0 };
      }),
    );
    syncHistory();
    notify("Loose components tidied into a row");
  };

  const shareProject = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Share link copied");
    } catch {
      notify("Share link ready in the address bar", "info");
    }
  };

  const openSearch = () => {
    setFocusSignal((value) => value + 1);
    if (mobile) setMobilePanel("library");
  };

  /* ----- keyboard ----- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!storageReady || isCapturing()) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        if (event.key === "Escape") target.blur();
        return;
      }
      if (modelOpen) { if (event.key === "Escape") setModelOpen(false); return; }
      if (genOpen && event.key !== "Escape") return;
      const is = (id: string) => eventMatches(event, id);
      if (is("settings")) { event.preventDefault(); openSettings(); return; }
      if (is("help")) { event.preventDefault(); openSettings("help"); return; }
      if (is("search")) { event.preventDefault(); openSearch(); return; }
      // Visual Components navigation shortcuts (fit, fit selection, COI, zoom).
      if (is("fitAll")) { event.preventDefault(); sendViewportCommand({ type: "fit" }); return; }
      if (is("fitSelection")) {
        event.preventDefault();
        if (selectedId) sendViewportCommand({ type: "fit-selected" });
        else notify(t("Select a component first"), "info");
        return;
      }
      if (is("setCoi")) {
        event.preventDefault();
        if (selectedId) sendViewportCommand({ type: "center-selected" });
        return;
      }
      if (is("zoomIn")) { event.preventDefault(); sendViewportCommand({ type: "zoom", direction: 1 }); return; }
      if (is("zoomOut")) { event.preventDefault(); sendViewportCommand({ type: "zoom", direction: -1 }); return; }
      if (is("toggleGrid2")) { event.preventDefault(); sendViewportCommand({ type: "toggle-grid" }); return; }
      if (is("togglePanels")) {
        event.preventDefault();
        const current = layoutRef.current;
        const open = !(current.catalog.open && current.inspector.open);
        setPanel("catalog", { open });
        setPanel("inspector", { open });
        return;
      }
      if (is("version")) {
        event.preventDefault();
        setDockTab("output");
        setPanel("dock", { open: true });
        sim.log(buildLine(), "info");
        return;
      }
      if (is("openProject")) { event.preventDefault(); projectInput.current?.click(); return; }
      if (is("newProject")) { event.preventDefault(); newProject(); return; }
      if (is("redo")) { event.preventDefault(); redo(); return; }
      if (is("undo")) { event.preventDefault(); undo(); return; }
      if (is("save")) { event.preventDefault(); void saveProject(); return; }
      if (is("copy")) { event.preventDefault(); copySelected(); return; }
      if (is("cut")) { event.preventDefault(); cutSelected(); return; }
      if (is("paste")) { event.preventDefault(); paste(); return; }
      if (is("duplicate")) { event.preventDefault(); duplicateSelected(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (is("deselect")) {
        setSelectedId(null);
        setGenOpen(false);
        return;
      }
      if (is("delete") || event.key === "Backspace") {
        if (selectedId) {
          event.preventDefault();
          if (selectedPoint !== null) removePoint();
          else deleteSelected();
        }
        return;
      }
      if (is("playPause")) {
        event.preventDefault();
        toggleRun();
        return;
      }
      if (is("toolSelect")) setTool("select");
      if (is("toolMove")) setTool("move");
      if (is("toolRotate")) setTool("rotate");
      if (is("snap")) setSnap((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteSelected, duplicateSelected, redo, saveProject, selectedId, selectedPoint, toggleRun, undo, mobile, genOpen, modelOpen, copySelected, cutSelected, paste, storageReady]);

  const libraryPanel = (
    <LibraryPanel
      onAdd={(kind) => addComponent(kind)}
      catalog={workpieces}
      onAddCatalog={addCatalogModel}
      onEditCatalog={setCatalogEditId}
      onLoadingChange={setImportLoading}
      onImportModel={() => openModelImport()}
      onLoadLayout={loadLayout}
      activeLayoutId={activeLayoutId}
      onInfo={(message) => notify(message, "info")}
      focusSignal={focusSignal}
      layoutsSignal={layoutsSignal}
      onImportedModel={addImportedModel}
    />
  );
  const inspector = (
    <PropertiesPanel
      selected={selected}
      items={items}
      productItems={productItems}
      onRemoveWorkpiece={removeWorkpiece}
      onBeginEdit={beginEdit}
      onImportCharacter={(id) => openModelImport(undefined, id)}
      onUpdate={updateItem}
      onDelete={deleteItem}
      onDuplicate={duplicateItem}
      onSelect={setSelectedId}
      selectedPoint={selectedPoint}
      onSelectPoint={setSelectedPoint}
      onAddPoint={addPoint}
      onRemovePoint={removePoint}
      onReversePath={reversePath}
      onEditProgram={editProgram}
      layoutName={layoutName}
    />
  );

  const dock = (fullHeight = false) => <BottomDock multiplayer={multiplayer} tab={dockTab} setTab={setDockTab} expanded={dockExpanded} setExpanded={setDockExpanded} items={items} selectedId={selectedId} onSelect={setSelectedId} onUpdateItem={updateItem} onTemplate={applyTemplate} showApi={showApi} fullHeight={fullHeight} />;
  // The dock fills its panel, so the panel's own height replaces the fixed 175/350 px
  // sizes. The chevron button still expands and shrinks it.
  const dockPanelBody = (
    <BottomDock
      multiplayer={multiplayer}
      tab={dockTab} setTab={setDockTab}
      expanded={layout.dock.size > 260}
      setExpanded={(expanded) => setPanel("dock", { size: expanded ? 420 : 175 })}
      items={items} selectedId={selectedId} onSelect={setSelectedId} onUpdateItem={updateItem}
      onTemplate={applyTemplate} showApi={showApi} fullHeight
    />
  );
  // Docked panels own their size; a detached panel renders as a floating window instead.
  const dockNode = !mobile && layout.dock.open && !layout.dock.floating ? <PanelShell id="dock" title="Output">{dockPanelBody}</PanelShell> : null;
  const projectSettings = <ProjectSettings inline={mobile} project={projectName} rename={setProjectName} save={() => void saveProject()} exportFile={downloadProject} exportArchive={downloadArchive} importFile={importProject} newProject={newProject} mode={interfaceMode} setMode={setInterfaceMode} onClose={() => setSettingsOpen(false)} />;
  const mobileTools = <MobileTools selected={selected} selectedPoint={selectedPoint} snap={snap}
    onSnap={() => setSnap((v) => !v)} onCopy={copySelected} onPaste={paste}
    onDuplicate={duplicateSelected} onDelete={deleteSelected}
    onAddPoint={addPoint} onRemovePoint={removePoint} onReversePath={reversePath}
    onAutoArrange={autoArrange} onReset={resetSim} onImportModel={() => openModelImport()}
    onLayouts={() => { setLayoutsSignal((v) => v + 1); setMobilePanel('library'); }}
    onApi={() => { setDockTab('program'); setShowApi((v) => v + 1); setMobilePanel('program'); }}
    onShare={() => void shareProject()} onProperties={() => setMobilePanel('inspector')} />;

  return (
    <div data-skin={appearance.skin} className={cn("larp-app flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-[#1e1e1e] text-white antialiased", mobile && "touch-workspace")}>
      {mobile ? <MobileChrome project={projectName} tool={tool} setTool={setTool} undo={undo} redo={redo} canUndo={historyCounts.past > 0} canRedo={historyCounts.future > 0} onProject={() => setMobilePanel("project")} onFactory={() => setGenOpen(true)} /> : (
      <AppChrome
        onMultiplayer={() => setMultiplayerOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onCopy={copySelected}
        onPaste={paste}
        exportedName={exportedName}
        projectName={projectName}
        onRenameProject={(name) => { setProjectName(name); multiplayer.updateMeta({...metadataRef.current, projectName:name}); }}
        tool={tool}
        setTool={setTool}
        snap={snap}
        onToggleSnap={() => setSnap((v) => !v)}
        canUndo={historyCounts.past > 0}
        canRedo={historyCounts.future > 0}
        onUndo={undo}
        onRedo={redo}
        selected={selected}
        selectedPoint={selectedPoint}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        running={running}
        onToggleRun={toggleRun}
        onReset={resetSim}
        onAddKind={(kind) => addComponent(kind)}
        onAutoArrange={autoArrange}
        onOpenGenerator={() => setGenOpen(true)}
        onNewProject={newProject}
        onSave={() => void saveProject()}
        onExport={downloadProject}
        onExportArchive={downloadArchive}
        onImport={importProject}
        onImportModel={() => openModelImport()}
        onShare={shareProject}
        onSearch={openSearch}
        onToast={notify}
        onAddPoint={addPoint}
        onRemovePoint={removePoint}
        onReversePath={reversePath}
        onEditProgram={editProgram}
        onTemplate={applyTemplate}
        onShowApi={() => {
          if (mobile) setMobilePanel("program");
          setDockTab("program");
          setShowApi((v) => v + 1);
        }}
        onShowLayouts={() => setLayoutsSignal((v) => v + 1)}
      />
      )}
      <main className="relative flex min-h-0 flex-1">
        {!mobile && layout.catalog.open && !layout.catalog.floating && (
          <PanelShell id="catalog" title="Catalog" hiddenBelow="lg">
            {libraryPanel}
          </PanelShell>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <Viewport multiplayer={multiplayer} multiplayerActive={multiplayerStatus === "host" || multiplayerStatus === "guest"} mobile={mobile} skin={appearance.skin} quality={appearance.graphics} building={appearance.building} items={items} productItems={productItems} selectedId={selectedId} selectedIds={selectedIds} onSelect={selectViewport} onSelectMany={setSelectedIds} selectedPoint={selectedPoint} onSelectPoint={setSelectedPoint} tool={tool} snap={snap} running={running} onToggleRun={toggleRun} onResetSim={resetSim} simSpeed={simSpeed} onSimSpeed={changeSimSpeed} layoutName={layoutName} onAddAt={addComponent} onAddCatalogAt={addCatalogModel} onImportFiles={(files,position) => openModelImport(files,undefined,position)} loadingPosition={loadingPosition} onMoveLoading={moveLoading} onViewCenterReady={registerViewCenter} onUpdateItem={updateItem} onUpdateItems={updateMany} onBeginEdit={beginEdit} onDuplicateItem={duplicateItem} onCopy={copySelected} onCut={cutSelected} onPaste={paste} canPaste={hasClipboard} onDeleteSelected={deleteSelected} onDuplicateSelected={duplicateSelected} onShowFloorMap={() => setFloorMapOpen(true)} />
            {!mobile && <div className="absolute bottom-3 left-[110px] z-20 flex gap-1.5 xl:hidden"><button type="button" onClick={() => setMobilePanel("inspector")} className="flex items-center gap-1.5 rounded border border-white/15 bg-[#2a2a2c]/95 px-2.5 py-1.5 text-[10px] text-white/80"><SlidersHorizontal size={12} className="text-[var(--teal)]" />{t("Properties")}</button></div>}
          </div>
          {dockNode}
        </div>
        {!mobile && layout.inspector.open && !layout.inspector.floating && (
          <PanelShell id="inspector" title="Properties" hiddenBelow="xl">
            {inspector}
          </PanelShell>
        )}
        {mobilePanel && (mobile || mobilePanel === "inspector") && <div className="absolute inset-0 z-30 flex flex-col justify-end">
          <button type="button" aria-label={t("Close panel")} onClick={() => setMobilePanel(null)} className="absolute inset-0 bg-black/40" />
          <section ref={mobilePanelFrame} role="dialog" aria-modal="true" aria-label={t(mobilePanel === "library" ? "Catalog" : mobilePanel === "inspector" ? "Properties" : mobilePanel === "program" ? "Program" : mobilePanel === "tools" ? "Tools" : "Project")} style={mobilePanelSize ? (mobile ? { height: mobilePanelSize.height, maxHeight: '100%' } : { width: mobilePanelSize.width, maxWidth: '100%' }) : undefined} className={cn("app-panel relative flex min-h-0 flex-col overflow-hidden border-t border-white/15 bg-[#2d2d30] shadow-[0_-20px_60px_rgba(0,0,0,.5)] animate-[sheet-in_.22s_ease-out]", mobile ? "h-[94%] rounded-t-2xl" : "ml-auto h-full w-[350px]")}>
            <div className="flex min-h-10 shrink-0 items-center justify-between border-b border-white/10 px-4"><span className="text-[11px] font-medium text-white/65">{t(mobilePanel === "library" ? "Catalog" : mobilePanel === "inspector" ? "Properties" : mobilePanel === "program" ? "Program" : mobilePanel === "tools" ? "Tools" : "Project")}</span><button type="button" aria-label={t("Close sheet")} onClick={() => setMobilePanel(null)} className="flex h-9 w-9 items-center justify-center rounded text-white/50"><X size={17} /></button></div>
            <div className="flex min-h-0 flex-1">{mobilePanel === "library" ? libraryPanel : mobilePanel === "inspector" ? inspector : mobilePanel === "program" ? dock(true) : mobilePanel === "tools" ? mobileTools : projectSettings}</div>
            <WindowResizeHandle frame={mobilePanelFrame} edge={mobile ? "top" : "left"} withinParent margin={0} minWidth={240} minHeight={180} onResize={setMobilePanelSize} />
          </section>
        </div>}
      </main>
      {mobile ? <MobileNav panel={mobilePanel} setPanel={(panel) => { if (panel === "program") setDockTab("program"); setMobilePanel(panel); }} onFactory={() => setGenOpen(true)} /> : <StatusBar selectedName={selected?.name} tool={tool} snap={snap} count={items.length} running={running} />}
      {/* Detached panels float above the workspace and keep their own content. */}
      {!mobile && layout.catalog.floating && <PanelShell id="catalog" title="Catalog">{libraryPanel}</PanelShell>}
      {!mobile && layout.inspector.floating && <PanelShell id="inspector" title="Properties">{inspector}</PanelShell>}
      {!mobile && layout.dock.floating && <PanelShell id="dock" title="Output">{dockPanelBody}</PanelShell>}
      <FloorMapWindow open={floorMapOpen} onClose={() => setFloorMapOpen(false)} items={items} selectedId={selectedId} onSelect={setSelectedId} building={appearance.building} />
      <input
        ref={projectInput}
        type="file"
        accept=".txt,.json,.lcmx,text/plain,application/json,application/zip"
        className="hidden"
        aria-hidden
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importProject(file); }}
      />
      {catalogEditId && workpieces.find(item=>item.id===catalogEditId) && <CatalogModelEditor item={workpieces.find(item=>item.id===catalogEditId)!} onUpdate={updateCatalogModel} onBeginEdit={beginEdit} onClose={()=>setCatalogEditId(null)} />}
      <ModelImportDialog open={modelOpen} initialFiles={modelFiles} requireRig={!!modelTarget} onLoadingChange={setImportLoading} onClose={() => { setModelOpen(false); setModelFiles(null); setModelTarget(null); }} onImported={addImportedModel} />
      {!storageReady && <div role="status" className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[#1e1e1e]/95 text-sm text-white/75">
        <span>{t("Restoring project…")}</span>
        {restoreSlow && <button type="button" className="rounded border border-white/30 px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => {
          skipRestore.current = true; autosaveDisabled.current = true;
          handleGeneration.current++; fileHandle.current = null; setExportedName(null);
          setStorageFailed(true); setStorageReady(true);
        }}>{t("Continue without restoring or autosave — export a copy")}</button>}
      </div>}
      {storageFailed && <div role="alert" className="fixed bottom-8 right-4 z-[105] max-w-[300px] rounded border border-amber-400/40 bg-[#382c1b] p-3 text-[11px] text-amber-100">{t("Browser autosave is unavailable. Export a project copy to keep your work.")}</div>}
      {multiplayerOpen && <MultiplayerDialog client={multiplayer} open onClose={() => setMultiplayerOpen(false)} />}
      <GeneratorDialog open={genOpen} initial={genOptions} productItems={productItems} onClose={() => setGenOpen(false)} onBuild={buildGenerated} />
      {settingsOpen && <SettingsDialog>{projectSettings}</SettingsDialog>}
      <div className={cn("pointer-events-none fixed left-1/2 z-[100] flex w-full max-w-[420px] -translate-x-1/2 flex-col items-center gap-1.5 px-4", mobile ? "bottom-[78px]" : "top-[158px]")}>
        {toasts.map((toast) => <div key={toast.id} className={cn("pointer-events-auto flex w-full items-center gap-2.5 rounded border bg-[#2b2b2d]/97 px-3 py-2 shadow-xl", toast.tone === "success" ? "border-[var(--green)]/40" : "border-[var(--app-accent)]/35", "animate-[toast-in_.2s_ease-out]")}>{toast.tone === "success" ? <CheckCircle2 size={13} className="shrink-0 text-[var(--green)]" /> : <Info size={13} className="shrink-0 text-[var(--app-accent-bright)]" />}<span className="flex-1 text-[11px] leading-snug text-white/80">{t(toast.message)}</span><button type="button" aria-label={t("Close")} onClick={() => setToasts((cur) => cur.filter((entry) => entry.id !== toast.id))} className="shrink-0 rounded p-0.5 text-white/30"><X size={10} /></button></div>)}
      </div>
    </div>
  );
}

function StatusBar({ selectedName, tool, snap, count, running }: { selectedName?: string; tool: string; snap: boolean; count: number; running: boolean }) {
  const snapshot = useSimSnapshot(500);
  return (
    <footer className="app-status flex h-[22px] shrink-0 items-center justify-between border-t border-white/10 bg-[#1c6fb5] px-3 text-[10.5px] text-white/90">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-[var(--green-bright)]" : "bg-white/60")} />
          {t(running ? "Simulating" : "Ready")}
        </span>
        <span className="hidden sm:inline">{t("Tool:")} {t(tool)}</span>
        <span className="hidden sm:inline">{t("Snap:")} {t(snap ? "0.25 m" : "off")}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:inline">{snapshot.boxes} {t("cartons in play")}</span>
        <span className="hidden md:inline">{count} {t("components")}</span>
        <span className="hidden lg:inline">{t(selectedName ? `Selected: ${selectedName}` : "No selection")}</span>
      </div>
    </footer>
  );
}
