/** Find the nearest compatible, visible DOM port in screen pixels. Measuring
 * distance to the hit rectangle (not just its tiny glyph) works at every zoom. */
export function nearestPort<T>(elements:Iterable<HTMLElement>, x:number, y:number, radius:number, identify:(element:HTMLElement)=>T | null): {value:T;x:number;y:number} | null {
  let best:{value:T;x:number;y:number} | null=null, bestDistance=radius;
  for(const element of elements) {
    const value=identify(element); if(value===null)continue;
    const rect=element.getBoundingClientRect();
    const style=getComputedStyle(element);
    if(style.visibility!=='visible' || style.pointerEvents==='none')continue;
    // Includes opacity inherited from parents. An invisible overlay/port must
    // never win a proximity snap just because its rectangle still has size.
    if (typeof element.checkVisibility === 'function' && !element.checkVisibility({opacityProperty:true,visibilityProperty:true})) continue;
    if(!rect.width || !rect.height || rect.right<0 || rect.bottom<0 || rect.left>window.innerWidth || rect.top>window.innerHeight)continue;
    const owner=element.closest<HTMLElement>('[data-node]');
    if(owner && getComputedStyle(owner).pointerEvents==='none')continue;
    const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom);
    const distance=Math.hypot(dx,dy);
    // Tie-break overlapping hit rectangles by center, independent of DOM order.
    const centerDistance=Math.hypot(rect.left+rect.width/2-x,rect.top+rect.height/2-y);
    const score=distance + centerDistance*.001;
    if(score>bestDistance)continue;
    bestDistance=score;best={value,x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  }
  return best;
}
