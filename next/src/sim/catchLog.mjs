/* Bounded, normalized field journal for local save compatibility.
 * Recording occurs exactly once at landed-fish settlement.
 */
import {FISH_NAMES} from './ecology.mjs';
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,finite(n,a)));
const species=new Set(FISH_NAMES);
export function normalizeCatchLog(raw){
 if(!Array.isArray(raw))return[];
 return raw.slice(-40).filter(v=>v&&typeof v==='object'&&species.has(v.species))
  .map(v=>({
   species:v.species,
   weight:Math.round(clamp(v.weight,.01,100)*100)/100,
   location:Math.floor(clamp(v.location,0,2)),
   bait:Math.floor(clamp(v.bait,0,3)),
   depth:Math.round(clamp(v.depth,0,1)*100)/100,
   time:Math.round(clamp(v.time,0,1)*1440)/1440,
   weather:Math.round(clamp(v.weather,0,1)*100)/100,
   payout:Math.floor(clamp(v.payout,0,10000000)),
   number:Math.floor(clamp(v.number,0,100000000))
  }));
}
export function recordLanding(log,fish){
 if(!fish||!species.has(fish.species))return normalizeCatchLog(log);
 return normalizeCatchLog([...normalizeCatchLog(log),fish]).slice(-40);
}
export function journalStats(log){
 const items=normalizeCatchLog(log);
 const heaviest=items.reduce((best,x)=>!best||x.weight>best.weight?x:best,null);
 return {count:items.length,unique:new Set(items.map(x=>x.species)).size,
  heaviest,totalEarned:items.reduce((sum,x)=>sum+x.payout,0)};
}
