//! Browser-independent simulation kernels. Keep operations aligned with the legacy
//! implementation until their behavior is covered by cross-runtime parity tests.

/// Squared distance to a clamped 2D line segment. Uses f64 like JavaScript numbers.
#[no_mangle]
pub extern "C" fn distance_sq_to_segment(x: f64, z: f64, ax: f64, az: f64, bx: f64, bz: f64) -> f64 {
    let dx = bx - ax;
    let dz = bz - az;
    let len2 = dx * dx + dz * dz;
    // JavaScript's `len2 || 1` also replaces NaN, unlike Rust's floating-point APIs.
    let denominator = if len2 == 0.0 || len2.is_nan() { 1.0 } else { len2 };
    let mut u = ((x - ax) * dx + (z - az) * dz) / denominator;
    if u < 0.0 { u = 0.0; } else if u > 1.0 { u = 1.0; }
    let ex = x - (ax + u * dx);
    let ez = z - (az + u * dz);
    ex * ex + ez * ez
}

/// Scratch storage for packed browser data. A caller must release each allocation once.
#[no_mangle]
pub extern "C" fn alloc_f64(count: usize) -> *mut f64 {
    let values = vec![0.0_f64; count].into_boxed_slice();
    Box::into_raw(values) as *mut f64
}

/// # Safety
/// `ptr` must be an allocation returned by `alloc_f64(count)` and not yet released.
#[no_mangle]
pub unsafe extern "C" fn free_f64(ptr: *mut f64, count: usize) {
    if !ptr.is_null() {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, count)));
    }
}

/// Barrier data: ax, az, bx, bz, clearance. Obstacle data: x, z, radius.
/// # Safety
/// Both pointers must address initialized arrays of the specified lengths.
#[no_mangle]
pub unsafe extern "C" fn point_is_free(
    x: f64, z: f64, tolerance: f64,
    barriers: *const f64, barrier_count: usize,
    obstacles: *const f64, obstacle_count: usize,
) -> u32 {
    let barriers = std::slice::from_raw_parts(barriers, barrier_count * 5);
    let obstacles = std::slice::from_raw_parts(obstacles, obstacle_count * 3);
    for barrier in barriers.chunks_exact(5) {
        let (ax, az, bx, bz) = (barrier[0], barrier[1], barrier[2], barrier[3]);
        let clearance = barrier[4] - tolerance;
        let r = if clearance.is_nan() { f64::NAN } else { clearance.max(0.0) };
        // Match Math.min/Math.max for NaN rather than Rust's NaN-ignoring min/max.
        let (min_x, max_x) = if ax.is_nan() || bx.is_nan() { (f64::NAN, f64::NAN) } else { (ax.min(bx), ax.max(bx)) };
        let (min_z, max_z) = if az.is_nan() || bz.is_nan() { (f64::NAN, f64::NAN) } else { (az.min(bz), az.max(bz)) };
        if x < min_x - r || x > max_x + r || z < min_z - r || z > max_z + r { continue; }
        if distance_sq_to_segment(x, z, ax, az, bx, bz) < r * r { return 0; }
    }
    for obstacle in obstacles.chunks_exact(3) {
        let radius = obstacle[2] - tolerance;
        let dx = x - obstacle[0];
        let dz = z - obstacle[1];
        if dx * dx + dz * dz < radius * radius { return 0; }
    }
    1
}

/// Advance all feeders in insertion order, preserving sequential spawn/block semantics.
/// Feeder record (8 f64): x,z,interval,timer,active,supply,require_supply,spawn.
/// Box record (4 f64): x,y,z,is_not_dead. Spawn flags and state are written in place.
/// # Safety
/// Pointers must reference valid arrays of the indicated record counts; arrays must not alias.
#[no_mangle]
pub unsafe extern "C" fn step_feeders(feeders: *mut f64, feeder_count: usize, boxes: *const f64, box_count: usize, dt: f64, max_boxes: usize) {
    let fs = std::slice::from_raw_parts_mut(feeders, feeder_count * 8);
    let bs = std::slice::from_raw_parts(boxes, box_count * 4);
    let mut spawned: Vec<(f64, f64)> = Vec::new();
    for f in fs.chunks_exact_mut(8) {
        f[7] = 0.0;
        if f[4] == 0.0 || (f[6] != 0.0 && f[5] <= 0.0) { continue; }
        f[3] -= dt;
        if f[3] > 0.0 { continue; }
        let blocked = bs.chunks_exact(4).any(|b| b[3] != 0.0 && (b[0] - f[0]).hypot(b[2] - f[1]) < 0.5 && b[1] > 0.4 && b[1] < 1.52)
            || spawned.iter().any(|(x,z)| (x - f[0]).hypot(z - f[1]) < 0.5);
        if blocked || box_count + spawned.len() >= max_boxes { f[3] = 0.25; continue; }
        f[3] = f[2];
        f[5] -= 1.0;
        f[7] = 1.0;
        spawned.push((f[0], f[1]));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn point_on_segment_and_outside_segment() {
        assert_eq!(distance_sq_to_segment(1.0, 2.0, 0.0, 0.0, 2.0, 0.0), 4.0);
        assert_eq!(distance_sq_to_segment(3.0, 0.0, 0.0, 0.0, 2.0, 0.0), 1.0);
    }
    #[test]
    fn degenerate_and_non_finite() {
        assert_eq!(distance_sq_to_segment(3.0, 4.0, 0.0, 0.0, 0.0, 0.0), 25.0);
        assert!(distance_sq_to_segment(f64::NAN, 0.0, 0.0, 0.0, 1.0, 1.0).is_nan());
    }
}
