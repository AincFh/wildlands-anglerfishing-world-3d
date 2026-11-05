/* Lightweight suspended fishing line: fixed array, no per-frame heap churn.
 * A tension-dependent catenary approximation, not a rigid polyline.
 */
const clip=(value,min,max)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
export const LINE_SEGMENTS=15;
export function lineCurve(from,to,{tension=0,wind=0,time=0}={},target=new Float32Array(LINE_SEGMENTS*3)){
 if(!target||target.length!==LINE_SEGMENTS*3)throw new RangeError('Fishing line buffer length mismatch');
 const t=clip(tension,0,1),gust=clip(wind,0,1);
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const distance=Math.hypot(dx,dy,dz);
 const sag=Math.min(2.6,distance*.03)*(1-.77*t);
 for(let i=0;i<LINE_SEGMENTS;i++){
  const u=i/(LINE_SEGMENTS-1),arc=(i===0||i===LINE_SEGMENTS-1)?0:Math.sin(Math.PI*u);
  const side=.12*gust*Math.sin(time*2.4+i*.54)*arc*(1-.65*t);
  target[i*3]=from.x+dx*u+side;
  target[i*3+1]=from.y+dy*u-sag*arc;
  target[i*3+2]=from.z+dz*u+side*.5;
 }
 return target;
}
