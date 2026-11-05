/* WILDLANDS NEXT — persistent lake ranger contracts.
 * Deterministic and DOM-free so mission rules can be regression tested.
 * Rewards are claimed explicitly, never granted merely by opening the board.
 */
export const CONTRACTS=Object.freeze([
 {id:'first-cast',name:'第一份渔获',detail:'成功捕获任意鱼类 1 条',goal:1,unlock:0,reward:260},
 {id:'north-bank',name:'晨岸巡护',detail:'在晨雾北岸捕获任意鱼类 2 条',goal:2,unlock:1,reward:380,location:0},
 {id:'birch-cove',name:'白桦湾观察员',detail:'在白桦浅湾捕获黄鲈或镜鲤 2 条',goal:2,unlock:2,reward:640,location:1,species:['黄鲈','镜鲤']},
 {id:'bass-survey',name:'黑鲈体重调查',detail:'捕获重量至少 1.50 kg 的大口黑鲈',goal:1,unlock:3,reward:520,species:['大口黑鲈'],minWeight:1.5},
 {id:'rocky-pike',name:'岬角掠食者',detail:'在岬角深水捕获一条北方狗鱼',goal:1,unlock:4,reward:950,location:2,species:['北方狗鱼']},
 {id:'silver-challenge',name:'银光追踪',detail:'用银色亮片捕获湖鳟或北方狗鱼 2 条',goal:2,unlock:5,reward:980,bait:2,species:['湖鳟','北方狗鱼']},
 {id:'lake-naturalist',name:'生态记录师',detail:'从接取任务起记录 3 种不同鱼类',goal:3,unlock:6,reward:1250,distinct:true},
 {id:'deep-legend',name:'深水传奇',detail:'用深水钓组在深水区捕获至少 8 kg 的湖鲟',goal:1,unlock:8,reward:2600,bait:3,minDepth:.55,minWeight:8,species:['湖鲟']}
]);
const validInt=(v,max)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.trunc(Number(v)))):0;
const allowedSpecies=new Set(['虹鳟','大口黑鲈','黄鲈','镜鲤','北方狗鱼','湖鳟','帝王鲑','湖鲟']);
export function normalizeContracts(raw){
 const source=raw&&typeof raw==='object'?raw:{};
 const counts={},claimed={},unique={};
 for(const job of CONTRACTS){
  const seen=Array.isArray(source.unique?.[job.id])?source.unique[job.id]:[];
  unique[job.id]=[...new Set(seen.filter(v=>allowedSpecies.has(v)))].slice(0,8);
  counts[job.id]=validInt(source.counts?.[job.id],job.goal);
  if(job.distinct)counts[job.id]=Math.min(job.goal,unique[job.id].length);
  claimed[job.id]=source.claimed?.[job.id]===true && counts[job.id]>=job.goal;
 }
 return {counts,claimed,unique};
}
export function contractUnlocked(job,totalCatches){
 return validInt(totalCatches,100000000)>=job.unlock;
}
export function recordCatch(raw,catchInfo,totalCatches){
 const progress=normalizeContracts(raw);
 const species=catchInfo?.species;
 if(!allowedSpecies.has(species))return {progress,completed:[],advanced:[]};
 const weight=Number(catchInfo.weight);
 const depth=Number(catchInfo.depth);
 const advanced=[],completed=[];
 for(const job of CONTRACTS){
  if(!contractUnlocked(job,totalCatches)||progress.claimed[job.id]||progress.counts[job.id]>=job.goal)continue;
  if(job.species&&!job.species.includes(species))continue;
  if(job.location!==undefined&&catchInfo.location!==job.location)continue;
  if(job.bait!==undefined&&catchInfo.bait!==job.bait)continue;
  if(job.minWeight!==undefined&&(!Number.isFinite(weight)||weight<job.minWeight))continue;
  if(job.minDepth!==undefined&&(!Number.isFinite(depth)||depth<job.minDepth))continue;
  const before=progress.counts[job.id];
  if(job.distinct){
   if(progress.unique[job.id].includes(species))continue;
   progress.unique[job.id].push(species);
   progress.counts[job.id]=Math.min(job.goal,progress.unique[job.id].length);
  }else progress.counts[job.id]=Math.min(job.goal,before+1);
  if(progress.counts[job.id]>before){
   advanced.push(job.id);
   if(progress.counts[job.id]===job.goal)completed.push(job.id);
  }
 }
 return {progress,completed,advanced};
}
export function claimContract(raw,id,totalCatches){
 const progress=normalizeContracts(raw);
 const job=CONTRACTS.find(c=>c.id===id);
 if(!job||!contractUnlocked(job,totalCatches)||progress.counts[id]<job.goal||progress.claimed[id])
  return {ok:false,reward:0,progress};
 progress.claimed[id]=true;
 return {ok:true,reward:job.reward,progress};
}
export function availableClaims(raw,totalCatches){
 const p=normalizeContracts(raw);
 return CONTRACTS.filter(job=>contractUnlocked(job,totalCatches)&&p.counts[job.id]>=job.goal&&!p.claimed[job.id]).length;
}
