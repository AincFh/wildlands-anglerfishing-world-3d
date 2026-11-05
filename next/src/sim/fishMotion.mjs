/** WILDLANDS NEXT — anatomically distinct fish silhouettes and finite tail beats.
 * Species indices correspond to angler.js SPECIES. Pure data/math so fish
 * motion can be tested without Three.js or a GPU.
 */
export const FISH_SHAPES=Object.freeze([
  {label:'Rainbow trout',length:1.07,width:.90,depth:.91,tail:1.00,beat:8.2},
  {label:'Largemouth bass',length:.96,width:1.13,depth:1.12,tail:.91,beat:7.0},
  {label:'Yellow perch',length:.79,width:.98,depth:1.18,tail:.83,beat:9.0},
  {label:'Mirror carp',length:.93,width:1.26,depth:1.35,tail:.84,beat:5.7},
  {label:'Northern pike',length:1.51,width:.81,depth:.71,tail:1.07,beat:7.1},
  {label:'Lake trout',length:1.24,width:.96,depth:.94,tail:1.14,beat:6.8},
  {label:'King salmon',length:1.33,width:1.03,depth:1.02,tail:1.18,beat:8.0},
  {label:'Lake sturgeon',length:1.66,width:1.12,depth:.77,tail:1.40,beat:4.8},
]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
export function fishShape(index){
  return FISH_SHAPES[Number.isInteger(index)&&index>=0&&index<FISH_SHAPES.length?index:0];
}
/** A flapping tail and paired fins, not whole-body spinning. Driven by clock
 * time for deterministic playback independent of renderer frame rate.
 * intensity=0 yields gentle breathing; intensity=1 is a short fighting burst.
 */
export function fishSwimPose(time,intensity=0.7,index=0){
  const shape=fishShape(index);
  const t=Number.isFinite(time)?time:0;
  const effort=clamp(intensity,0,1);
  const beat=shape.beat;
  const phase=t*beat;
  return {
    tailYaw:Math.sin(phase)*(.06+effort*.36)*shape.tail,
    leftFinYaw:Math.sin(phase*.43+.9)*(.06+effort*.17),
    rightFinYaw:-Math.sin(phase*.43-.7)*(.06+effort*.17),
    roll:Math.sin(phase*.23)*(.008+effort*.048),
    pitch:Math.sin(phase*.19+.5)*(.012+effort*.035)
  };
}
