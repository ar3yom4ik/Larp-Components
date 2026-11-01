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

/// Advance an active machine's cycle clock. Host retains ownership of products and
/// applies completion side effects in machine iteration order.
/// Record: busy time, remaining time, progress, cycle duration.
/// # Safety
/// `state` must point to four initialized f64 values.
#[no_mangle]
pub unsafe extern "C" fn advance_machine_clock(state: *mut f64, dt: f64) {
    let s = std::slice::from_raw_parts_mut(state, 4);
    s[0] += dt;
    s[1] -= dt;
    let progress = 1.0 - s[1] / s[3];
    // JS Math.min propagates NaN, while Rust f64::min does not.
    s[2] = if progress.is_nan() { f64::NAN } else { 1.0_f64.min(progress) };
}

/// Advance one machine's automatic workflow. The host supplies candidate boxes in
/// the same order as its spatial index (or scene order for assembly). Record:
/// busy, cycle, remaining, busy_time, progress, required_parts, is_assembly,
/// table_x, table_z, has_part, action, cycles. Box records: x,y,z,half_height,
/// is_free, unclaimed, last_machine_matches, input_matches, result_marker.
/// Actions: 0 idle, 1 ordinary start, 2 assembly attempt, 3 active, 4 completion,
/// 5 missing part. Assembly markers are 1 for the first part, 2 for consumed parts.
/// The host applies object identity, product metadata, and renderer-facing fields.
/// # Safety
/// Both pointers must reference non-overlapping initialized arrays of the lengths specified.
#[no_mangle]
pub unsafe extern "C" fn step_machine(s: *mut f64, boxes: *mut f64, count: usize, dt: f64, table_top: f64) {
    let s = std::slice::from_raw_parts_mut(s, 12);
    let boxes = std::slice::from_raw_parts_mut(boxes, count * 9);
    s[10] = 0.0;
    if s[0] != 0.0 {
        s[3] += dt;
        s[2] -= dt;
        let progress = 1.0 - s[2] / s[1];
        s[4] = if progress.is_nan() { f64::NAN } else { 1.0_f64.min(progress) };
        if s[9] == 0.0 { s[0] = 0.0; s[10] = 5.0; return; }
        if s[2] <= 0.0 { s[0] = 0.0; s[11] += 1.0; s[10] = 4.0; }
        else { s[10] = 3.0; }
        return;
    }
    let assembly = s[6] != 0.0;
    let mut eligible = Vec::new();
    for (i, b) in boxes.chunks_exact_mut(9).enumerate() {
        b[8] = 0.0;
        if b[4] == 0.0 { continue; }
        if assembly && (b[5] == 0.0 || b[6] != 0.0) { continue; }
        let radius = if assembly { 0.48 } else { 0.45 };
        let vertical = if assembly { 0.12 } else { 0.09 };
        if (b[0] - s[7]).hypot(b[2] - s[8]) < radius && (b[1] - b[3] - table_top).abs() < vertical {
            eligible.push(i);
            if !assembly { break; }
        }
    }
    if assembly {
        if (eligible.len() as f64) < s[5] { return; }
        for (n, &i) in eligible.iter().enumerate() { boxes[i * 9 + 8] = if n == 0 { 1.0 } else { 2.0 }; }
        s[10] = 2.0;
    } else if eligible.is_empty() { return; }
    let first = eligible[0] * 9;
    if boxes[first + 5] == 0.0 || boxes[first + 6] != 0.0 || boxes[first + 7] == 0.0 { return; }
    if !assembly { boxes[first + 8] = 1.0; s[10] = 1.0; }
    s[0] = 1.0;
    s[2] = if s[1].is_nan() { f64::NAN } else { s[1].max(0.5) };
    s[4] = 0.0;
}

#[cfg(test)]
mod machine_tests {
    use super::step_machine;

    #[test]
    fn automatic_cycle_and_assembly_rejection() {
        let mut machine = [0., 1., 0., 0., 0., 2., 1., 0., 0., 0., 0., 0.];
        // Two eligible assembly parts. The first does not match the input product.
        let mut boxes = [0., 1., 0., 0.05, 1., 1., 0., 0., 0.,
                         0.1, 1., 0., 0.05, 1., 1., 0., 1., 0.];
        unsafe { step_machine(machine.as_mut_ptr(), boxes.as_mut_ptr(), 2, 0.1, 0.95) };
        assert_eq!(machine[10], 2.);
        assert_eq!(machine[0], 0.);
        assert_eq!((boxes[8], boxes[17]), (1., 2.));
        boxes[7] = 1.;
        unsafe { step_machine(machine.as_mut_ptr(), boxes.as_mut_ptr(), 2, 0.1, 0.95) };
        assert_eq!(machine[0], 1.);
        assert_eq!(machine[2], 1.);
        machine[9] = 1.;
        unsafe { step_machine(machine.as_mut_ptr(), boxes.as_mut_ptr(), 0, 1.0, 0.95) };
        assert_eq!(machine[10], 4.);
        assert_eq!(machine[11], 1.);
    }
}

/// Evaluate button, laser, proximity sensor and PLC nodes in scene order.
/// Node record: kind(1 button,2 laser,3 sensor,4 plc), x,z,radius, ax,az,bx,bz,
/// normally_closed, constant_signal, signal_slot, source_offset, source_count.
/// Box record: x,y,z,half_height,radius,state(0 dead,1 dying,2 other).
/// Signals and source slots are indexed separately so duplicate IDs preserve
/// the TypeScript Map's shared signal semantics.
/// # Safety
/// Pointers must refer to initialized, non-overlapping buffers of the declared
/// sizes. Signal slots and source ranges must be valid for their buffers.
#[no_mangle]
pub unsafe extern "C" fn step_logic(nodes: *const f64, node_count: usize, boxes: *const f64, box_count: usize,
                                    signals: *mut f64, signal_count: usize, sources: *const f64, source_count: usize) {
    let nodes=std::slice::from_raw_parts(nodes,node_count*13);
    let boxes=std::slice::from_raw_parts(boxes,box_count*6);
    let signals=std::slice::from_raw_parts_mut(signals,signal_count);
    let sources=std::slice::from_raw_parts(sources,source_count);
    for n in nodes.chunks_exact(13) {
        let slot=n[10] as usize;
        let mut signal=false;
        match n[0] as u32 {
            1 => signal=signals[slot] != 0.0,
            2 => {
                let (dx,dz)=(n[6]-n[4],n[7]-n[5]);
                let len2=dx*dx+dz*dz;
                let denom=if len2==0.0 || len2.is_nan() {1.0} else {len2};
                for b in boxes.chunks_exact(6) {
                    if b[5] != 2.0 || !((b[1]+b[3]-1.0).abs() < 0.5) {continue;}
                    let raw=((b[0]-n[4])*dx+(b[2]-n[5])*dz)/denom;
                    // Math.max/min propagate NaN.
                    let u=if raw.is_nan() {f64::NAN} else {raw.min(1.0).max(0.0)};
                    if (b[0]-(n[4]+u*dx)).hypot(b[2]-(n[5]+u*dz)) < b[4]+0.06 {signal=true;break;}
                }
                if n[8]!=0.0 {signal=!signal;}
            }
            3 => signal=boxes.chunks_exact(6).any(|b| b[5]!=0.0 && (b[0]-n[1]).hypot(b[2]-n[2])<=n[3]),
            4 => {
                let start=n[11] as usize; let end=start+n[12] as usize;
                signal=sources[start..end].iter().any(|&src| signals[src as usize]!=0.0) || n[9]!=0.0;
            }
            _ => {}
        }
        signals[slot]=if signal {1.0} else {0.0};
    }
}

#[cfg(test)]
mod logic_tests {
    use super::step_logic;

    #[test]
    fn sequential_plc_and_laser() {
        // Button slot 0 -> PLC slot 1; the laser is normally closed.
        let nodes=[1.,0.,0.,0.,0.,0.,0.,0.,0.,0.,0.,0.,0.,
                   4.,0.,0.,0.,0.,0.,0.,0.,0.,0.,1.,0.,1.,
                   2.,0.,0.,0.,-1.,0.,1.,0.,1.,0.,2.,1.,0.];
        let boxes=[0.,0.87,0.,0.13,0.2,2.];
        let mut signals=[1.,0.,1.];
        let sources=[0.];
        unsafe {step_logic(nodes.as_ptr(),3,boxes.as_ptr(),1,signals.as_mut_ptr(),3,sources.as_ptr(),1)};
        assert_eq!(signals,[1.,1.,0.]);
    }
}
