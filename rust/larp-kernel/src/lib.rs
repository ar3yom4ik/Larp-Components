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

struct NavGrid<'a> {
    min_x: f64, min_z: f64, width: usize, height: usize,
    cache: Vec<i8>, barriers: &'a [f64], obstacles: &'a [f64],
}
impl NavGrid<'_> {
    fn position(&self, id: usize) -> (f64,f64) {
        (self.min_x + (id % self.width) as f64 * 0.5,
         self.min_z + (id / self.width) as f64 * 0.5)
    }
    fn free(&mut self, id: usize) -> bool {
        if id >= self.cache.len() { return false; }
        if self.cache[id] == 0 {
            let (x,z)=self.position(id);
            self.cache[id]=if unsafe {point_is_free(x,z,0.0,self.barriers.as_ptr(),self.barriers.len()/5,self.obstacles.as_ptr(),self.obstacles.len()/3)} != 0 {1} else {-1};
        }
        self.cache[id] == 1
    }
    fn nearest(&mut self, point: (f64,f64)) -> Option<usize> {
        let cx=(((point.0-self.min_x)/0.5+0.5).floor() as isize).clamp(0,self.width as isize-1);
        let cz=(((point.1-self.min_z)/0.5+0.5).floor() as isize).clamp(0,self.height as isize-1);
        let mut best=None; let mut distance=f64::INFINITY;
        for radius in 0isize..=5 {
            for dz in -radius..=radius { for dx in -radius..=radius {
                let (x,z)=(cx+dx,cz+dz);
                if x<0 || z<0 || x>=self.width as isize || z>=self.height as isize {continue;}
                let id=x as usize+z as usize*self.width;
                if !self.free(id) {continue;}
                let q=self.position(id); let d=(q.0-point.0).hypot(q.1-point.1);
                if d<distance {best=Some(id);distance=d;}
            }}
            if best.is_some() {break;}
        }
        best
    }
}
#[derive(Clone,Copy)]
struct HeapNode { id: usize, score: f64 }
fn nav_push(heap: &mut Vec<HeapNode>, v: HeapNode) {
    heap.push(v); let mut n=heap.len()-1;
    while n>0 {let p=(n-1)>>1; if heap[p].score<=v.score {break;} heap[n]=heap[p];n=p;}
    heap[n]=v;
}
fn nav_pop(heap: &mut Vec<HeapNode>) -> HeapNode {
    let first=heap[0];let last=heap.pop().unwrap();
    if !heap.is_empty() {let mut n=0;loop {let mut c=n*2+1;if c>=heap.len(){break;}if c+1<heap.len() && heap[c+1].score<heap[c].score {c+=1;}if heap[c].score>=last.score{break;}heap[n]=heap[c];n=c;}heap[n]=last;}
    first
}

/// Bounded grid A* matching the host's route search and tie-breaking rules.
/// Returns route point count, or -1 for insufficient output buffer, or -2 for
/// non-finite input. Caller can fall back to the host implementation on -2.
/// # Safety
/// All pointers must address non-overlapping initialized arrays. `out` must
/// have capacity for `out_capacity * 2` f64 values.
#[no_mangle]
pub unsafe extern "C" fn navigate_path(sx:f64,sz:f64,ex:f64,ez:f64,barriers:*const f64,barrier_count:usize,
                                       obstacles:*const f64,obstacle_count:usize,out:*mut f64,out_capacity:usize)->i32 {
    let barriers=std::slice::from_raw_parts(barriers,barrier_count*5);
    let obstacles=std::slice::from_raw_parts(obstacles,obstacle_count*3);
    if ![sx,sz,ex,ez].iter().chain(barriers.iter()).chain(obstacles.iter()).all(|v|v.is_finite()) {return -2;}
    let (mut min_x,mut max_x)=(sx.min(ex),sx.max(ex));
    let (mut min_z,mut max_z)=(sz.min(ez),sz.max(ez));
    for b in barriers.chunks_exact(5) {min_x=min_x.min(b[0]).min(b[2]);max_x=max_x.max(b[0]).max(b[2]);min_z=min_z.min(b[1]).min(b[3]);max_z=max_z.max(b[1]).max(b[3]);}
    for o in obstacles.chunks_exact(3) {min_x=min_x.min(o[0]);max_x=max_x.max(o[0]);min_z=min_z.min(o[1]);max_z=max_z.max(o[1]);}
    min_x-=3.0;min_z-=3.0;
    let width=(((max_x-min_x+3.0)/0.5).ceil()+1.0).min(240.0) as usize;
    let height=(((max_z-min_z+3.0)/0.5).ceil()+1.0).min(240.0) as usize;
    if width==0 || height==0 {return -2;}
    let mut grid=NavGrid{min_x,min_z,width,height,cache:vec![0;width*height],barriers,obstacles};
    let (start,end)=match (grid.nearest((sx,sz)),grid.nearest((ex,ez))) {(Some(a),Some(b))=>(a,b),_=>return 0};
    let mut g=vec![f64::INFINITY;width*height];g[start]=0.0;
    let mut parents=vec![usize::MAX;width*height];let mut closed=vec![false;width*height];
    let heuristic=|id:usize| {let x=min_x+(id%width) as f64*0.5;let z=min_z+(id/width) as f64*0.5;(x-ex).hypot(z-ez)};
    let mut heap=Vec::new();nav_push(&mut heap,HeapNode{id:start,score:heuristic(start)});
    let dirs=[(1isize,0isize),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)];
    for _ in 0..18000 {
        if heap.is_empty(){break;}
        let cur=nav_pop(&mut heap).id;if closed[cur]{continue;}
        if cur==end {
            let mut route=Vec::new();let mut node=cur;
            while node!=start && node!=usize::MAX {route.push(grid.position(node));node=parents[node];}
            if start!=end {route.push(grid.position(start));}
            let count=route.len()+1;if count>out_capacity{return -1;}
            let output=std::slice::from_raw_parts_mut(out,out_capacity*2);
            for (i,(x,z)) in route.iter().rev().enumerate() {output[i*2]=*x;output[i*2+1]=*z;}
            output[(count-1)*2]=ex;output[(count-1)*2+1]=ez;return count as i32;
        }
        closed[cur]=true;
        let (cx,cz)=((cur%width) as isize,(cur/width) as isize);
        for (dx,dz) in dirs {
            let (x,z)=(cx+dx,cz+dz);
            if x<0 || z<0 || x>=width as isize || z>=height as isize {continue;}
            let next=x as usize+z as usize*width;
            if closed[next] || !grid.free(next) {continue;}
            if dx!=0 && dz!=0 && (!grid.free((cx+dx) as usize+cz as usize*width) || !grid.free(cx as usize+(cz+dz) as usize*width)) {continue;}
            let score=g[cur]+(dx as f64).hypot(dz as f64)*0.5;
            if score>=g[next] {continue;}
            parents[next]=cur;g[next]=score;nav_push(&mut heap,HeapNode{id:next,score:score+heuristic(next)});
        }
    }
    0
}

#[cfg(test)]
mod navigation_tests {
    use super::navigate_path;
    #[test]
    fn route_and_output_capacity() {
        let barriers=[3.,-1.,3.,1.,0.34];let obstacles:[f64;0]=[];
        let mut out=[0.;512];
        let n=unsafe{navigate_path(0.,0.,7.,0.,barriers.as_ptr(),1,obstacles.as_ptr(),0,out.as_mut_ptr(),256)};
        assert!(n>1); assert_eq!((out[(n as usize-1)*2],out[(n as usize-1)*2+1]),(7.,0.));
        assert_eq!(unsafe{navigate_path(0.,0.,7.,0.,barriers.as_ptr(),1,obstacles.as_ptr(),0,out.as_mut_ptr(),1)},-1);
    }
}

fn js_min(a:f64,b:f64)->f64 {if a.is_nan()||b.is_nan(){f64::NAN}else{a.min(b)}}
fn js_max(a:f64,b:f64)->f64 {if a.is_nan()||b.is_nan(){f64::NAN}else{a.max(b)}}

/// Robot inverse kinematics from a local-space tip position and arm geometry.
/// Input: lx, ly, lz, shoulder, L1, L2, wrist length. Output: waist,
/// shoulder, elbow, wrist. The browser continues to own frames and script jobs.
/// # Safety
/// Both pointers must reference non-overlapping initialized arrays (7 and 4 f64).
#[no_mangle]
pub unsafe extern "C" fn solve_robot(input:*const f64, output:*mut f64) {
    let v=std::slice::from_raw_parts(input,7); let out=std::slice::from_raw_parts_mut(output,4);
    let (lx,ly,lz,shoulder,l1,l2,lw)=(v[0],v[1],v[2],v[3],v[4],v[5],v[6]);
    let r=lx.hypot(lz); let wy=ly+lw-shoulder; let raw=r.hypot(wy);
    let d=js_max((l1-l2).abs()+0.05,js_min(l1+l2-0.01,raw));
    let phi=wy.atan2(r);
    let cos_a=js_max(-1.0,js_min(1.0,(l1*l1+d*d-l2*l2)/(2.0*l1*d)));
    let th1=phi+cos_a.acos();
    let ex=l1*th1.cos(); let ey=l1*th1.sin();
    let wxr=d*phi.cos(); let wyr=d*phi.sin();
    let th2=(wyr-ey).atan2(wxr-ex);
    out[0]=(-lz).atan2(lx);out[1]=th1;out[2]=th2-th1;out[3]=-std::f64::consts::FRAC_PI_2-th2;
}

/// Reachability for local-space robot position and arm geometry.
/// # Safety
/// `input` must point to seven initialized f64 values.
#[no_mangle]
pub unsafe extern "C" fn robot_reachable(input:*const f64)->u32 {
    let v=std::slice::from_raw_parts(input,7);
    let r=v[0].hypot(v[2]);let dy=v[1]+v[6]-v[3];let d=r.hypot(dy);
    (r>=0.3 && v[1]>=0.0 && d<=v[4]+v[5]-0.03 && d>=(v[4]-v[5]).abs()+0.08) as u32
}

#[cfg(test)]
mod robot_tests {
    use super::{solve_robot,robot_reachable};
    #[test]
    fn reach_and_solve() {
        let input=[1.2,1.1,0.,0.95,1.2,1.1,0.55]; let mut joints=[0.;4];
        assert_eq!(unsafe {robot_reachable(input.as_ptr())},1);
        unsafe {solve_robot(input.as_ptr(),joints.as_mut_ptr())};
        assert!(joints.iter().all(|v|v.is_finite()));
        let too_far=[100.,1.,0.,0.95,1.2,1.1,0.55];
        assert_eq!(unsafe {robot_reachable(too_far.as_ptr())},0);
    }
}

/// Integrate one free product for one fixed step using host-selected support and
/// conveyor information. Host owns scene lookup, statistics and collision response.
/// State: x,y,z,vx,vy,vz,yaw,tilt,tilt_velocity,axis_x,axis_z,half_height,radius,
/// support_kind. Support: top,kind,is_conveyor,lat,tx,tz,s,speed,blocked,stopper,
/// length. Returns whether the product contacted the support.
/// # Safety
/// State and support point to non-overlapping initialized arrays of 14 and 11 f64.
#[no_mangle]
pub unsafe extern "C" fn integrate_product(state:*mut f64, support:*const f64, dt:f64)->u32 {
    let b=std::slice::from_raw_parts_mut(state,14);let s=std::slice::from_raw_parts(support,11);
    let previous=b[13];
    let grounded=b[1]-b[11]<=s[0]+0.004 && b[4]<=0.05;
    if grounded {
        b[1]=s[0]+b[11];
        if previous==0.0 && b[4]< -1.3 {b[4]= -b[4]*0.12;} else {b[4]=0.0;}
        b[13]=s[1];
        if s[2]!=0.0 {
            let sp=if s[8]!=0.0 {0.0} else {s[7]};
            let vlat=js_max(-0.5,js_min(0.5,-s[3]*4.0));
            let dvx=s[4]*sp+ -s[5]*vlat;let dvz=s[5]*sp+s[4]*vlat;
            let k=js_min(1.0,12.0*dt);
            b[3]+=(dvx-b[3])*k;b[5]+=(dvz-b[5])*k;
            let target=(-s[5]).atan2(s[4]);let angle=target-b[6];
            b[6]+=angle.sin().atan2(angle.cos())*js_min(1.0,5.0*dt);
            if s[9]!=0.0 {
                let limit=s[10]-0.06-b[12];
                if s[6]>limit {
                    let back=s[6]-limit;b[0]-=s[4]*back;b[2]-=s[5]*back;
                    let vn=b[3]*s[4]+b[5]*s[5];
                    if vn>0.0 {b[3]-=s[4]*vn;b[5]-=s[5]*vn;}
                }
            }
        } else {
            let sp=b[3].hypot(b[5]);
            if sp>0.0 {let next=js_max(0.0,sp-7.0*dt);b[3]*=next/sp;b[5]*=next/sp;}
        }
        b[8]+=(-70.0*b[7]-10.0*b[8])*dt;b[7]+=b[8]*dt;
        if b[7].abs()<0.002 && b[8].abs()<0.02 {b[7]=0.0;b[8]=0.0;}
    } else {
        if previous==2.0 {
            let sp=b[3].hypot(b[5]);if sp>0.04 {b[9]=b[5]/sp;b[10]= -b[3]/sp;b[8]=1.6+sp*2.4;}
        }
        b[13]=0.0;b[4]-=9.81*dt;b[7]=js_min(1.25,b[7]+b[8]*dt);
    }
    b[0]+=b[3]*dt;b[1]+=b[4]*dt;b[2]+=b[5]*dt;
    grounded as u32
}

#[cfg(test)]
mod product_tests {
    use super::integrate_product;
    #[test]
    fn gravity_and_ground_contact() {
        let mut b=[0.,1.,0.,0.,0.,0.,0.,0.,0.,1.,0.,0.1,0.2,0.];
        let support=[0.,1.,0.,0.,0.,0.,0.,0.,0.,0.,0.];
        assert_eq!(unsafe {integrate_product(b.as_mut_ptr(),support.as_ptr(),0.1)},0);
        assert!(b[1]<1. && b[4]<0.);
        b[1]=0.1;b[4]= -0.5;
        assert_eq!(unsafe {integrate_product(b.as_mut_ptr(),support.as_ptr(),0.1)},1);
        assert_eq!(b[4],0.);assert_eq!(b[13],1.);
    }
}
