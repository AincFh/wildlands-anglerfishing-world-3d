/* WILDLANDS NEXT · Graphics preference policy.
 * Pure values: user choice selects real rendering work rather than a cosmetic
 * badge. Auto delegates to the already-hysteretic QualityScaler.
 */
import { TIERS } from './quality.js';

export const GRAPHICS_MODES=Object.freeze([
 {id:'auto',label:'自动适配',caption:'根据实际帧率升降画质，优先保持稳定交互'},
 {id:'cinematic',label:'高画质',caption:'完整波纹、细腻反射、高清渲染和岸边气氛'},
 {id:'balanced',label:'均衡',caption:'平衡画面精度、动态反射和能耗'},
 {id:'performance',label:'流畅',caption:'降低 GPU/CPU 压力，保持正常玩法及真实鱼群'}
]);
export function normalizeGraphicsMode(value){
 return GRAPHICS_MODES.some(mode=>mode.id===value)?value:'auto';
}
const modeTier=Object.freeze({cinematic:0,balanced:1,performance:2});
export function resolveGraphicsSettings({
 mode='auto',adaptiveTier=0,isMobile=false,softwareGPU=false,nativePixelRatio=1
}={}){
 const selected=normalizeGraphicsMode(mode);
 const index=selected==='auto'?
  Math.max(0,Math.min(TIERS.length-1,Number.isFinite(adaptiveTier)?Math.trunc(adaptiveTier):0)):
  modeTier[selected];
 const tier=TIERS[index];
 // A manual high-quality choice must never exceed hardware safety limits.
 // Software WebGL is kept under a tight cap for deterministic browser QA.
 const device=Number.isFinite(nativePixelRatio)&&nativePixelRatio>.3?nativePixelRatio:1;
 const cap=softwareGPU?.75:isMobile?1.5:1.8;
 return {
  mode:selected,tier:tier.name,adaptive:selected==='auto',
  pixelRatio:Math.min(device,tier.pixelRatioCap,cap),
  shadows:!!tier.shadows&&!isMobile&&!softwareGPU,
  reflectionInterval:tier.cubeInterval,
  normalMapEvery:tier.normalMapEvery,
  vertexEvery:index===0?1:index===1?2:4,
  fireflyMax:tier.fireflyMax,
  rainMax:tier.rainMax
 };
}
