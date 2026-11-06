/* WILDLANDS NEXT · Lake League
 * Real repeatable fishing tournaments. No DOM, clock, random state, server or
 * synthetic fish: only successful water casts and landed fish may advance a
 * tournament. All settlement paths are immutable and independently testable.
 * This is a local career competition, NOT an online multiplayer leaderboard.
 */
export const LEAGUE_CUPS=Object.freeze([
 {id:'morning',name:'晨光杯 · 入门岸钓',en:'MORNING CUP',detail:'6 次有效抛投内上岸 3 条鱼；晨岸钓点有加分。',
  unlock:0,fee:0,goal:3,limit:6,favoredSpot:0,thresholds:[160,280,430],prizes:[180,350,620]},
 {id:'explorer',name:'三岸巡回赛',en:'THREE SHORE TOUR',detail:'8 次有效抛投内钓到 4 条鱼；不同鱼种与新钓点有额外积分。',
  unlock:5,fee:220,goal:4,limit:8,favoredSpot:1,thresholds:[300,490,720],prizes:[450,800,1350]},
 {id:'legend',name:'深湖冠军赛',en:'DEEP LAKE CHAMPIONSHIP',detail:'10 次有效抛投内上岸 5 条鱼；稀有鱼、大鱼与深水落点加分。',
  unlock:12,fee:620,goal:5,limit:10,favoredSpot:2,thresholds:[560,930,1450],prizes:[950,1650,3200]}
]);
const KNOWN_SPECIES=Object.freeze({
 '虹鳟':12,'大口黑鲈':20,'黄鲈':10,'镜鲤':26,
 '北方狗鱼':55,'湖鳟':44,'帝王鲑':90,'湖鲟':120
});
const MEDALS=['bronze','silver','gold'];
export const MEDAL_LABELS=Object.freeze({
 none:'未达入围线',bronze:'铜牌',silver:'银牌',gold:'金牌',abandoned:'主动退赛'
});
const bounded=(n,min,max)=>Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;
const int=(n,max)=>Math.trunc(bounded(n,0,max));
const validCup=id=>LEAGUE_CUPS.find(c=>c.id===id);
const listOf=(raw,valid,max)=>Array.isArray(raw)?
 [...new Set(raw.filter(valid))].slice(0,max):[];
const speciesList=raw=>listOf(raw,x=>Object.hasOwn(KNOWN_SPECIES,x),8);
const spots=raw=>listOf(raw,x=>Number.isInteger(x)&&x>=0&&x<=2,3);
function normalizeRound(raw){
 const cup=validCup(raw?.id);
 if(!cup||!raw||typeof raw!=='object')return null;
 const medal=Object.hasOwn(MEDAL_LABELS,raw.medal)?raw.medal:'none';
 return{id:cup.id,score:int(raw.score,100000),catches:int(raw.catches,cup.goal),
  attempts:int(raw.attempts,cup.limit),medal,prize:int(raw.prize,100000),
  endedAt:typeof raw.endedAt==='string'&&!Number.isNaN(Date.parse(raw.endedAt))?raw.endedAt:null};
}
export function normalizeLeague(raw){
 const source=raw&&typeof raw==='object'?raw:{};
 const history=Array.isArray(source.history)?source.history.map(normalizeRound).filter(Boolean).slice(-12):[];
 const best={};
 for(const cup of LEAGUE_CUPS){
  const old=int(source.best?.[cup.id],100000);
  best[cup.id]=Math.max(old,...history.filter(r=>r.id===cup.id).map(r=>r.score),0);
 }
 const cup=validCup(source.active?.id),v=source.active;
 let active=null;
 if(cup&&v&&typeof v==='object'){
  const attempts=int(v.attempts,cup.limit),catches=Math.min(attempts,int(v.catches,cup.goal));
  active={id:cup.id,score:int(v.score,100000),attempts,catches,
   pending:v.pending===true&&attempts>catches&&attempts<=cup.limit,
   seenSpecies:speciesList(v.seenSpecies),seenSpots:spots(v.seenSpots)};
  // A corrupted or stale save cannot keep a match over quota forever.
  if(catches>=cup.goal)active.pending=false;
 }
 return{active,history,best};
}
export function leagueRank(cup,score){
 const points=int(score,100000);
 return points>=cup.thresholds[2]?'gold':
   points>=cup.thresholds[1]?'silver':
   points>=cup.thresholds[0]?'bronze':'none';
}
function resolve(league,{forfeit=false,endedAt=new Date().toISOString()}={}){
 const active=league.active;
 if(!active)return{league,reward:0,finished:false,medal:null,round:null};
 const cup=validCup(active.id);
 const medal=forfeit?'abandoned':leagueRank(cup,active.score);
 const prize=MEDALS.includes(medal)?cup.prizes[MEDALS.indexOf(medal)]:0;
 const round={id:cup.id,score:active.score,catches:active.catches,
  attempts:active.attempts,medal,prize,endedAt};
 const next=normalizeLeague({active:null,
  history:[...league.history,round],best:{...league.best,[cup.id]:Math.max(league.best[cup.id],active.score)}});
 return{league:next,reward:prize,finished:true,medal,round};
}
export function enterLeague(raw,id,coins,lifetimeCatches){
 const league=normalizeLeague(raw),cup=validCup(id);
 const balance=int(coins,100000000);
 if(!cup)return{ok:false,reason:'unknown_cup',league,coins:balance};
 if(league.active)return{ok:false,reason:'already_playing',league,coins:balance};
 if(int(lifetimeCatches,100000000)<cup.unlock)return{ok:false,reason:'locked',league,coins:balance};
 if(balance<cup.fee)return{ok:false,reason:'insufficient_coins',league,coins:balance};
 league.active={id:cup.id,score:0,attempts:0,catches:0,pending:false,seenSpecies:[],seenSpots:[]};
 return{ok:true,reason:null,league,coins:balance-cup.fee,cup};
}
export function leagueWaterCast(raw){
 const league=normalizeLeague(raw),active=league.active;
 if(!active||active.pending||active.attempts>=validCup(active.id).limit)return{ok:false,league};
 active.attempts++;
 active.pending=true;
 return{ok:true,league};
}
export function scoreLakeCatch(cupId,fish,seenSpecies=[],seenSpots=[]){
 const cup=validCup(cupId),rarity=KNOWN_SPECIES[fish?.species],
  weight=Number(fish?.weight),location=fish?.location,depth=Number(fish?.depth);
 if(!cup||rarity===undefined||!Number.isFinite(weight)||weight<=0||weight>50||
  !Number.isInteger(location)||location<0||location>2||!Number.isFinite(depth)||depth<0||depth>1)return 0;
 const newSpecies=!seenSpecies.includes(fish.species),newSpot=!seenSpots.includes(location);
 return int(18+weight*19+rarity+(newSpecies?28:0)+(newSpot?18:0)+
  (location===cup.favoredSpot?24:0)+(cup.id==='legend'&&depth>=.55?42:0),950);
}
export function leagueFishLanded(raw,fish,endedAt){
 const league=normalizeLeague(raw),a=league.active;
 if(!a||!a.pending)return{ok:false,league,scoreGain:0,reward:0,finished:false,medal:null};
 const gain=scoreLakeCatch(a.id,fish,a.seenSpecies,a.seenSpots);
 if(gain===0)return{ok:false,league,scoreGain:0,reward:0,finished:false,medal:null};
 a.pending=false;a.catches++;a.score+=gain;
 a.seenSpecies=speciesList([...a.seenSpecies,fish.species]);
 a.seenSpots=spots([...a.seenSpots,fish.location]);
 const cup=validCup(a.id);
 if(a.catches>=cup.goal||a.attempts>=cup.limit)
  return{ok:true,scoreGain:gain,...resolve(league,{endedAt})};
 return{ok:true,scoreGain:gain,league,reward:0,finished:false,medal:null};
}
export function leagueMiss(raw,endedAt){
 const league=normalizeLeague(raw),a=league.active;
 if(!a||!a.pending)return{league,reward:0,finished:false,medal:null};
 a.pending=false;
 if(a.attempts>=validCup(a.id).limit)return resolve(league,{endedAt});
 return{league,reward:0,finished:false,medal:null};
}
export function abandonLeague(raw,endedAt){
 const league=normalizeLeague(raw);
 return resolve(league,{forfeit:true,endedAt});
}
export function leagueProgress(raw){
 const l=normalizeLeague(raw),a=l.active;
 const cup=a?validCup(a.id):null;
 return{active:a?{...a,name:cup.name,goal:cup.goal,limit:cup.limit,
   thresholds:[...cup.thresholds],projectedMedal:leagueRank(cup,a.score)}:null,
  completed:l.history.length,best:{...l.best},recent:l.history.slice(-8).reverse()};
}
