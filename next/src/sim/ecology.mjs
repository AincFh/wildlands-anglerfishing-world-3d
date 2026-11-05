/* WILDLANDS NEXT — ambient lake ecology and species forecast.
 * Pure simulation; all probabilities derive from the same actual cast state.
 * No wall-clock dependencies, DOM or random side effects.
 */
import {speciesWeights,waitForBite} from './bait.mjs';
export const FISH_NAMES=Object.freeze(['虹鳟','大口黑鲈','黄鲈','镜鲤','北方狗鱼','湖鳟','帝王鲑','湖鲟']);
export const SPOT_NAMES=Object.freeze(['晨雾北岸','白桦浅湾','岬角深水']);
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
const circularDistance=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
function pulse(t,centre,spread){
 const d=circularDistance(t,centre);
 return Math.exp(-.5*(d/spread)**2);
}
export function habitat({bait=0,depth=.2,location=0,timeOfDay=.34,weather=.05,wind=.25}={}){
 const t=clamp(timeOfDay,0,.999999),storm=clamp(weather),breeze=clamp(wind),d=clamp(depth);
 const dawn=pulse(t,.275,.075),dusk=pulse(t,.755,.075),midday=pulse(t,.51,.13);
 const night=Math.max(pulse(t,.04,.14),pulse(t,.95,.14));
 const base=speciesWeights({bait,depth:d,location});
 const daylight=dawn+dusk;
 const factors=[
  .78+1.18*daylight+.27*storm,             // trout surface at twilight
  .75+.93*midday+.25*breeze,              // bass daylight shelter
  .82+.80*dawn+.25*(1-storm),             // perch early light
  .78+.60*midday+.30*(1-breeze),          // carp calm shallows
  .67+.82*dusk+.65*storm+.17*breeze,      // pike active in changing weather
  .71+.85*dawn+.34*storm+.2*d,           // lake trout deeper dawn
  .56+1.3*dusk+.48*storm+.25*d,          // salmon at dusk
  .52+1.35*night+.45*d+.23*storm         // sturgeon in dark deep water
 ];
 const weights=base.map((n,i)=>Math.max(.0001,n*factors[i]));
 const total=weights.reduce((a,b)=>a+b,0);
 const probabilities=weights.map(n=>n/total);
 // Dynamic bite speed: twilight and mild rain help, severe wind inhibits.
 const activity=clamp(1+.25*daylight+.11*storm-.21*Math.max(0,breeze-.67),.68,1.48);
 return {weights,probabilities,activity,depth:d,location:clamp(location,0,2),bait,
   timeOfDay:t,weather:storm,wind:breeze,conditions:{
    period:t<.23||t>=.82?'夜间':t<.35?'黎明':t<.68?'白昼':'黄昏',
    weather:storm>.68?'风雨':storm>.3?'多云薄雾':'晴朗'
   }};
}
export function chooseLakeSpecies(options={}){
 const env=habitat(options);
 const chance=clamp(options.random??.5,0,.999999999);
 let threshold=chance*env.weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<env.weights.length;i++){
  threshold-=env.weights[i];
  if(threshold<0)return i;
 }
 return env.weights.length-1;
}
export function biteSeconds(options={}){
 const env=habitat(options);
 const base=waitForBite(env.bait,clamp(options.random??.5));
 const gustPenalty=1+.32*Math.max(0,env.wind-.6);
 return clamp(base*gustPenalty/env.activity,2.3,19.5);
}
export function speciesForecast(options={}){
 const env=habitat(options);
 return env.probabilities.map((p,id)=>({id,name:FISH_NAMES[id],probability:p,percent:Math.round(p*1000)/10}))
  .sort((a,b)=>b.probability-a.probability);
}
