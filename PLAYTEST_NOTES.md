# Playtest Notes & Optimization Opportunities

## Current Performance Profile

**Tested configuration:**
- 48 unit test files passing
- 12 MB standalone HTML bundle
- 6 MB multiplayer ZIP package
- Build time: ~15 seconds
- All browser tests passing

## Identified Optimization Opportunities

### 1. Rendering Optimizations

#### Current State
- WebGL/WebGPU dual rendering path
- Selective bloom with emissive mask
- VXGI with bounded voxel scene (468 triangles)
- Temporal ray accumulation while paused
- Four-tier adaptive quality recovery

#### Opportunities
- **Instance batching**: Currently using individual meshes for repeated components (conveyors, sensors). Could use THREE.InstancedMesh for 10-50x draw call reduction.
- **Frustum culling**: Manual frustum checks before expensive operations (signal updates, physics queries).
- **LOD system**: Simplified geometry for components >50m from camera.
- **Occlusion culling**: Skip rendering objects behind walls/enclosures.

**Estimated improvement**: 20-40% FPS increase in large scenes (200+ components)

### 2. Physics Optimizations

#### Current State
- Cannon.js with fixed timestep
- Spatial index for broad-phase collision
- Imported model collision hulls (convex decomposition)
- Swept CCD for fast-moving objects
- Adaptive step budget

#### Opportunities
- **Sleeping bodies**: More aggressive sleep thresholds for stationary objects.
- **Contact caching**: Reuse contact manifolds between frames.
- **Constraint batching**: Group related constraints for solver efficiency.
- **Custom collision shapes**: Primitive shapes for common components instead of hulls.

**Estimated improvement**: 30-50% physics speedup, allowing 2x more dynamic objects

### 3. Simulation Loop Optimizations

#### Current State
- 60Hz fixed timestep for simulation
- Signal propagation every substep
- Spatial index for proximity queries
- Box index for laser/sensor detection

#### Opportunities
- **Signal batching**: Defer signal updates to end of frame, propagate in bulk.
- **Lazy evaluation**: Only update components that changed or have active triggers.
- **Worker offloading**: Move physics and signal propagation to Web Workers.
- **Delta compression**: Only send changed state in multiplayer, not full snapshots.

**Estimated improvement**: 2-3x simulation speed for complex signal networks

### 4. Memory Optimizations

#### Current State
- Scene state stored in React state
- Box objects allocated dynamically
- Imported models cached by URL
- Material options cached by scene items

#### Opportunities
- **Object pooling**: Reuse Box objects instead of allocating/deallocating.
- **WeakRef caching**: Allow garbage collection of unused imported models.
- **SharedArrayBuffer**: Share geometry data between main thread and workers.
- **Texture atlasing**: Combine small textures into single atlas.

**Estimated improvement**: 40-60% memory reduction, fewer GC pauses

### 5. Load Time Optimizations

#### Current State
- 12 MB standalone HTML (includes all dependencies)
- CAD kernel embedded (OCCT via occt-import-js)
- Three.js + Cannon.js + Yjs bundled
- Asset embedding via base64

#### Opportunities
- **Code splitting**: Lazy-load AI Factory, PTP teaching, multiplayer modules.
- **Compression**: Brotli/gzip for HTML/JS (already done by hosting).
- **Tree shaking**: Remove unused Three.js modules (currently importing all).
- **External CDN**: Load Three.js from CDN for returning visitors (cache hit).

**Estimated improvement**: 30-50% faster initial load (4-6 MB vs 12 MB)

### 6. UX Optimizations

#### Current State
- Keyboard shortcuts work regardless of layout (fixed in alpha.13)
- Responsive design for desktop/mobile
- Resizable windows
- Contextual tooltips

#### Opportunities
- **Undo/redo granularity**: Per-property undo instead of per-action.
- **Keyboard navigation**: Full keyboard control for accessibility.
- **Gesture support**: Pinch-to-zoom, two-finger pan on touch devices.
- **Quick search**: Command palette (Ctrl+K) for fast component access.
- **Snapping improvements**: Magnetic snapping to grid, components, paths.

### 7. Specific Code Improvements

#### engine.ts (3,500+ lines)
- **Break into modules**: Separate physics, signals, robots, conveyors into own files.
- **Type narrowing**: More specific types for Box.state, component kinds.
- **Pure functions**: Extract pure logic for easier testing.

#### Viewport.tsx (1,200+ lines)
- **Extract camera controls**: Separate camera logic from rendering.
- **Memoize expensive operations**: Raycasting, selection, gizmo updates.
- **Reduce re-renders**: Use refs for mutable state, React state for UI only.

#### App.tsx (2,400+ lines)
- **Component extraction**: Move panels, dialogs to separate components.
- **Context optimization**: Split into multiple contexts (scene, UI, simulation).
- **Suspense boundaries**: Lazy-load heavy components.

## Playtest Scenarios to Validate

### Scenario 1: Large Factory (200+ components)
- Add 50 conveyors, 30 sensors, 20 robots, 50 feeders, 50 pallets
- Run simulation for 5 minutes
- Target: 30+ FPS, <500MB memory

### Scenario 2: Complex Signal Network
- Create 100 sensors wired to 50 conveyors with color sorting
- Verify signal propagation latency <1 frame
- Test multi-pallet routing with 5+ destinations

### Scenario 3: Robot Programming
- Teach 20-point PTP sequence with signals
- Play back at 2x speed
- Verify smooth interpolation, no joint jumps

### Scenario 4: Multiplayer Collaboration
- 3 users editing same scene simultaneously
- Add/delete components, verify sync
- Test conflict resolution (simultaneous edits)

### Scenario 5: Mobile Experience
- Open on iPad/Android tablet
- Add 20 components, run simulation
- Verify touch controls work smoothly

## Performance Budgets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial load | <5s | ~8s | ⚠️ Needs work |
| Frame rate (50 components) | 60 FPS | 60 FPS | ✅ Good |
| Frame rate (200 components) | 30 FPS | ~40 FPS | ⚠️ Monitor |
| Memory (200 components) | <500MB | ~350MB | ✅ Good |
| Build size | <10MB | 12MB | ⚠️ Over budget |
| Test suite time | <60s | 55s | ✅ Good |

## Immediate Action Items

1. **Profile large scene performance** - Identify specific bottlenecks
2. **Implement object pooling** - Reduce GC pressure in simulation loop
3. **Add performance monitoring** - Track FPS, memory, load times in production
4. **Optimize bundle size** - Tree shake Three.js, lazy-load modules
5. **Improve mobile touch controls** - Better gesture support

## Long-term Optimization Strategy

1. **Quarterly performance reviews** - Compare metrics against budgets
2. **Performance regression tests** - Automatic detection in CI
3. **User feedback loop** - Collect performance complaints, prioritize fixes
4. **A/B testing** - Test optimization impact on real users
5. **Incremental improvements** - 5-10% gains per release, not big rewrites

---

*Last updated: 2026-11-06*
*Next review: After alpha.14 release*
