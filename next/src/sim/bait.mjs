/* WILDLANDS NEXT · Local bait economy and water-depth species ecology.
 * Pure ESM: shared by the actual Three.js game and deterministic Node tests.
 * All random values are injected; no network, purchases or hidden backend.
 */
export const BAITS=Object.freeze([
  {id:0,name:'通用溪饵',en:'Trail mix',price:0,pack:0,wait:.98,weight:1,detail:'免费常备，浅水常见鱼种',weights:[1.2,1,1.25,1.05,.6,.55,.25,.12]},
  {id:1,name:'天然蚯蚓',en:'Earthworm',price:90,pack:8,wait:.79,weight:1.02,detail:'加快咬钩 · 鲈鱼、黄鲈、鲤鱼',weights:[1.0,1.25,2.4,2.25,.6,.7,.3,.1]},
  {id:2,name:'银色亮片',en:'Silver spinner',price:280,pack:6,wait:.94,weight:1.09,detail:'吸引掠食鱼 · 狗鱼、湖鳟和鲑鱼',weights:[1.0,1.8,.5,.35,3.9,2.5,2.15,.55]},
  {id:3,name:'深水钓组',en:'Deep-water jig',price:520,pack:5,wait:1.14,weight:1.16,detail:'深水大型鱼 · 鲑鱼、鲟鱼概率提升',weights:[.35,.48,.24,.9,1.35,2.1,3.1,5.5]}
]);
const BASE_WEIGHTS=Object.freeze([24,23,21,18,7,5,1.6,.45]);
const safe=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,safe(n,a)));
export function baitStock(stock) {
  return {1:clamp(Math.floor(Number(stock?.[1])||0),0,99999),
          2:clamp(Math.floor(Number(stock?.[2])||0),0,99999),
          3:clamp(Math.floor(Number(stock?.[3])||0),0,99999)};
}
export function selectedBait(id,stock) {
  const index=Number(id);
  if(!Number.isInteger(index)||index<0||index>=BAITS.length) return 0;
  return index===0||(baitStock(stock)[index]||0)>0?index:0;
}
export function buyBait(coins,stock,id) {
  const bait=BAITS[id],balance=Number(coins);
  if(!bait||bait.id===0||!Number.isFinite(balance)||balance<bait.price||balance<0)
    return {ok:false,coins,stock:baitStock(stock)};
  const current=baitStock(stock);
  if(current[id]>99999-bait.pack)return {ok:false,coins,stock:current};
  current[id]+=bait.pack;
  return {ok:true,coins:Math.round((balance-bait.price)*100)/100,stock:current};
}
export function consumeBait(stock,id){
  const current=baitStock(stock),effective=selectedBait(id,current);
  if(effective!==0)current[effective]--;
  return {id:effective,stock:current};
}
export function waitForBite(id,random){
  const r=clamp(random,0,1);
  return (3.8+r*7.2)*BAITS[selectedBait(id,{1:1,2:1,3:1})].wait;
}
/**
 * Returns species index in the same 8-item order as angler.js. Deep water
 * is highest near the lake centre (depth≈1). The location modifier favours
 * pike at Rocky Point and perch/carp at Birch Cove. Unselected index weights
 * remain non-zero so every species can be found with starter bait.
 */
export function speciesWeights({bait=0,depth=0,location=0}={}){
  const type=BAITS[Number.isInteger(bait)&&bait>=0&&bait<BAITS.length?bait:0];
  const d=clamp(depth,0,1),loc=clamp(location,0,2);
  return BASE_WEIGHTS.map((base,i)=>{
    let w=base*type.weights[i];
    if(i>=4)w*=.75+d*1.95;
    if(i===7)w*=.55+d*3.0;
    if(i<=2)w*=1.18-d*.35;
    if(loc===1&&(i===2||i===3))w*=1.4;
    if(loc===2&&(i===4||i===5||i===7))w*=1.38;
    return Math.max(.0001,w);
  });
}
export function chooseSpecies({bait=0,depth=0,location=0,random=.5}={}){
  const weights=speciesWeights({bait,depth,location});
  const total=weights.reduce((a,b)=>a+b,0);
  let remaining=clamp(random,0,0.999999999)*total;
  for(let i=0;i<weights.length;i++){remaining-=weights[i];if(remaining<0)return i}
  return weights.length-1;
}
