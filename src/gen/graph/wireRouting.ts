export interface WirePoint {x:number;y:number}
export interface WireObstacle {id:string;x:number;y:number;width:number;height:number}
const EPS=0.001;

/** Cheap cubic fast path; when it crosses a node, route orthogonally through
 * a clear lane around the real node rectangles. */
export function graphWirePath(a:WirePoint,b:WirePoint,boxes:readonly WireObstacle[],sourceId:string,targetId:string):string {
  const bend=Math.max(36,Math.abs(b.x-a.x)*.45);
  const cubic=`M ${a.x} ${a.y} C ${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`;
  const other=boxes.filter(box=>box.id!==sourceId&&box.id!==targetId);
  const contains=(box:WireObstacle,p:WirePoint,pad=6)=>p.x>box.x-pad&&p.x<box.x+box.width+pad&&p.y>box.y-pad&&p.y<box.y+box.height+pad;
  let blocked=false;
  for(let i=1;i<32&&!blocked;i++) {
    const t=i/32,u=1-t;
    const p={x:u*u*u*a.x+3*u*u*t*(a.x+bend)+3*u*t*t*(b.x-bend)+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*a.y+3*u*t*t*b.y+t*t*t*b.y};
    blocked=other.some(box=>contains(box,p)) || (b.x<a.x && boxes.some(box=>(box.id===sourceId||box.id===targetId)&&contains(box,p,0)));
  }
  if(!blocked)return cubic;
  const intersects=(p:WirePoint,q:WirePoint,box:WireObstacle,pad=7)=>{
    const left=box.x-pad,right=box.x+box.width+pad,top=box.y-pad,bottom=box.y+box.height+pad;
    if(Math.abs(p.x-q.x)<EPS)return p.x>left&&p.x<right&&Math.max(p.y,q.y)>top&&Math.min(p.y,q.y)<bottom;
    return p.y>top&&p.y<bottom&&Math.max(p.x,q.x)>left&&Math.min(p.x,q.x)<right;
  };
  const clear=(p:WirePoint,q:WirePoint,includeEnds:boolean)=>!boxes.some(box=>{
    if(!includeEnds&&(box.id===sourceId||box.id===targetId))return false;
    return intersects(p,q,box,box.id===sourceId||box.id===targetId ? 0 : 7);
  });
  // Leave each port in its natural direction. The 48+ px arrangement gutter
  // provides room even for feedback links that run from right to left.
  const sx=a.x+20,tx=b.x-20;
  const start={x:sx,y:a.y},end={x:tx,y:b.y};
  const lanes=[a.y,b.y,...boxes.flatMap(box=>[box.y-16,box.y+box.height+16])]
    .sort((x,y)=>Math.abs(x-(a.y+b.y)/2)-Math.abs(y-(a.y+b.y)/2));
  if(clear(a,start,false)&&clear(end,b,false)) for(const y of lanes) {
    const p={x:sx,y},q={x:tx,y};
    if(clear(start,p,true)&&clear(p,q,true)&&clear(q,end,true))return `M ${a.x} ${a.y} L ${sx} ${a.y} L ${sx} ${y} L ${tx} ${y} L ${tx} ${b.y} L ${b.x} ${b.y}`;
  }
  // A single horizontal lane can be boxed in at one port. Use a bounded
  // orthogonal visibility grid as a fallback, allowing extra turns around
  // nearby nodes. Every candidate segment is still checked against *all*
  // rectangles, including those outside the grid's coordinate budget.
  if (clear(a,start,false) && clear(end,b,false)) {
    const distance=(box:WireObstacle)=> {
      const cx=box.x+box.width/2,cy=box.y+box.height/2;
      return Math.max(0,Math.abs(cx-(sx+tx)/2)-Math.abs(sx-tx)/2) + Math.max(0,Math.abs(cy-(a.y+b.y)/2)-Math.abs(a.y-b.y)/2);
    };
    const candidates=[...boxes].sort((x,y)=>distance(x)-distance(y)).slice(0,48);
    const xs=new Set<number>([sx,tx]),ys=new Set<number>([a.y,b.y]);
    for(const box of candidates) {xs.add(box.x-16);xs.add(box.x+box.width+16);ys.add(box.y-16);ys.add(box.y+box.height+16);}
    // Global outside lanes permit escaping a dense group without creating a
    // quadratic number of coordinates for very large graphs.
    for(const box of boxes) { xs.add(Math.min(sx,tx,box.x)-32); xs.add(Math.max(sx,tx,box.x+box.width)+32); ys.add(Math.min(a.y,b.y,box.y)-32); ys.add(Math.max(a.y,b.y,box.y+box.height)+32); }
    const trim=(values:Set<number>,anchors:number[])=>{
      const all=[...values], lo=Math.min(...all),hi=Math.max(...all);
      if(all.length<=102)return all.sort((x,y)=>x-y);
      const required=new Set([...anchors,lo,hi]);
      const ranked=all.filter(v=>!required.has(v)).sort((x,y)=>Math.min(...anchors.map(a=>Math.abs(x-a)))-Math.min(...anchors.map(a=>Math.abs(y-a))));
      return [...required,...ranked.slice(0,102-required.size)].sort((x,y)=>x-y);
    };
    const xlist=trim(xs,[sx,tx]),ylist=trim(ys,[a.y,b.y]),w=xlist.length,h=ylist.length;
    const startId=ylist.indexOf(a.y)*w+xlist.indexOf(sx),endId=ylist.indexOf(b.y)*w+xlist.indexOf(tx);
    const costs=new Float64Array(w*h);costs.fill(Infinity);costs[startId]=0;
    const previous=new Int32Array(w*h);previous.fill(-1);
    const open:{id:number;score:number}[]=[];
    const push=(entry:{id:number;score:number})=>{let i=open.length;open.push(entry);while(i>0){const parent=(i-1)>>1;if(open[parent].score<=entry.score)break;open[i]=open[parent];i=parent;}open[i]=entry;};
    const pop=()=>{const first=open[0],last=open.pop()!;if(open.length){let i=0;while(i*2+1<open.length){let c=i*2+1;if(c+1<open.length&&open[c+1].score<open[c].score)c++;if(open[c].score>=last.score)break;open[i]=open[c];i=c;}open[i]=last;}return first;};
    const heuristic=(x:number,y:number)=>Math.abs(x-tx)+Math.abs(y-b.y);
    push({id:startId,score:heuristic(sx,a.y)});
    const closed=new Uint8Array(w*h);
    while(open.length) {
      const {id}=pop();if(closed[id])continue;closed[id]=1;if(id===endId)break;
      const xi=id%w,yi=Math.floor(id/w),p={x:xlist[xi],y:ylist[yi]};
      for(const [nx,ny] of [[xi-1,yi],[xi+1,yi],[xi,yi-1],[xi,yi+1]]) {
        if(nx<0||nx>=w||ny<0||ny>=h)continue;
        const next=ny*w+nx;if(closed[next])continue;
        const q={x:xlist[nx],y:ylist[ny]};if(!clear(p,q,true))continue;
        const cost=costs[id]+Math.abs(q.x-p.x)+Math.abs(q.y-p.y);
        if(cost>=costs[next])continue;costs[next]=cost;previous[next]=id;push({id:next,score:cost+heuristic(q.x,q.y)});
      }
    }
    if(closed[endId]) {
      const points:WirePoint[]=[];
      for(let id=endId;id!==-1;id=previous[id])points.push({x:xlist[id%w],y:ylist[Math.floor(id/w)]});
      points.reverse();
      // Merge collinear segments so the SVG remains small and easy to hit-test.
      const simplified:WirePoint[]=[];
      for(const point of [a,...points,b]) {
        const n=simplified.length;
        if(n>=2 && ((simplified[n-2].x===simplified[n-1].x&&simplified[n-1].x===point.x)||(simplified[n-2].y===simplified[n-1].y&&simplified[n-1].y===point.y))) simplified[n-1]=point;
        else simplified.push(point);
      }
      return simplified.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
    }
  }
  return cubic; // Overlapping manually positioned nodes may leave no free exit.
}
