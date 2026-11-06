import test from 'node:test';
import assert from 'node:assert/strict';
import {LEAGUE_CUPS,MEDAL_LABELS,normalizeLeague,enterLeague,leagueWaterCast,
 scoreLakeCatch,leagueFishLanded,leagueMiss,abandonLeague,leagueRank,leagueProgress} from '../next/src/sim/lakeLeague.mjs';

const trout={species:'虹鳟',weight:2.6,location:0,depth:.34};
const pike={species:'北方狗鱼',weight:7.1,location:2,depth:.63};
const carp={species:'镜鲤',weight:8.4,location:1,depth:.24};
function start(id='morning',coins=1500,catches=20){return enterLeague(null,id,coins,catches)}
function land(league,fish=trout,stamp='2026-11-06T10:00:00Z'){
 const cast=leagueWaterCast(league);assert.equal(cast.ok,true,'A valid water cast is required');
 return leagueFishLanded(cast.league,fish,stamp);
}
test('three distinctive competitions have valid finite scores, limits and rewards',()=>{
 assert.equal(LEAGUE_CUPS.length,3);
 assert.deepEqual(LEAGUE_CUPS.map(c=>c.goal),[3,4,5]);
 for(const c of LEAGUE_CUPS){
  assert.ok(c.limit>c.goal&&c.fee>=0);
  assert.ok(c.thresholds.every((n,i)=>n>0&&(!i||n>c.thresholds[i-1])));
  assert.ok(c.prizes.every((n,i)=>n>0&&(!i||n>c.prizes[i-1])));
 }
 assert.equal(MEDAL_LABELS.gold,'金牌');
});
test('unlock, entry cost, reentrancy and fake cup IDs are enforced',()=>{
 assert.deepEqual(enterLeague(null,'fake',1000,100).reason,'unknown_cup');
 assert.deepEqual(enterLeague(null,'legend',10000,11).reason,'locked');
 assert.deepEqual(enterLeague(null,'legend',600,100).reason,'insufficient_coins');
 const v=enterLeague(null,'explorer',900,9);
 assert.equal(v.ok,true);assert.equal(v.coins,680);
 assert.equal(enterLeague(v.league,'morning',1000,100).reason,'already_playing');
 assert.equal(v.league.active.attempts,0);
});
test('only valid water landing opens one pending cast; fish may score only once',()=>{
 let l=start().league;
 assert.equal(leagueFishLanded(l,trout).ok,false);
 const cast=leagueWaterCast(l);
 assert.equal(cast.ok,true);l=cast.league;
 assert.equal(leagueWaterCast(l).ok,false,'can not register two water casts at once');
 assert.equal(leagueFishLanded(l,{...trout,weight:-999}).ok,false);
 assert.equal(leagueFishLanded(l,{...trout,location:7}).ok,false);
 assert.equal(leagueFishLanded(l,{species:'unknown',weight:2,location:0,depth:.3}).ok,false);
 const one=leagueFishLanded(l,trout);assert.equal(one.ok,true);
 assert.equal(one.league.active.catches,1);assert.equal(one.league.active.attempts,1);
 assert.ok(one.scoreGain>=100);assert.equal(leagueFishLanded(one.league,trout).ok,false);
});
test('weight, rarity, preferred location and first species/spot alter score',()=>{
 const a=scoreLakeCatch('morning',trout,[],[]);
 const b=scoreLakeCatch('morning',{...trout,location:2},[],[]);
 assert.ok(a>b);
 assert.ok(scoreLakeCatch('morning',pike,[],[])>a);
 assert.ok(scoreLakeCatch('morning',trout,['虹鳟'],[0])<a);
 assert.ok(scoreLakeCatch('legend',pike,[],[])>scoreLakeCatch('morning',pike,[],[]));
 assert.equal(scoreLakeCatch('morning',{...trout,depth:NaN},[],[]),0);
 assert.equal(scoreLakeCatch('morning',{...trout,weight:Infinity},[],[]),0);
});
test('completion awards once, keeps best and permits a new paid session',()=>{
 let l=start().league,totalRewards=0;
 for(const fish of [trout,carp,pike]){
  const result=land(l,fish);
  l=result.league;totalRewards+=result.reward;
 }
 assert.equal(l.active,null);
 assert.equal(l.history.length,1);
 assert.ok(l.history[0].score>=160);
 assert.ok(l.history[0].medal!=='none');
 assert.equal(totalRewards,LEAGUE_CUPS[0].prizes[['bronze','silver','gold'].indexOf(l.history[0].medal)]);
 assert.equal(leagueMiss(l).reward,0);
 assert.equal(leagueFishLanded(l,trout).reward,0);
 const another=enterLeague(l,'morning',1500,50);
 assert.equal(another.ok,true);
 assert.equal(another.league.best.morning,l.history[0].score);
});
test('missed fish, aborted floats, cast budget exhaustion and forfeit are real costs',()=>{
 let l=start('morning',1000).league;
 for(let n=0;n<5;n++){
  const c=leagueWaterCast(l);assert.equal(c.ok,true);
  const m=leagueMiss(c.league);assert.equal(m.finished,false);
  l=m.league;
 }
 const last=leagueMiss(leagueWaterCast(l).league,'2026-11-06T10:00:00Z');
 assert.equal(last.finished,true);assert.equal(last.reward,0);
 assert.equal(last.league.active,null);assert.equal(last.league.history[0].attempts,6);
 assert.equal(last.league.history[0].medal,'none');
 const paid=start('legend',1200);
 assert.equal(paid.coins,580);
 const forfeit=abandonLeague(paid.league,'2026-11-06T12:00:00Z');
 assert.equal(forfeit.medal,'abandoned');assert.equal(forfeit.reward,0);
 assert.equal(abandonLeague(forfeit.league).finished,false);
});
test('last valid float may still land and settle after the cast limit',()=>{
 let l=start().league;
 for(let i=0;i<5;i++)l=leagueMiss(leagueWaterCast(l).league).league;
 const result=land(l,pike);
 assert.equal(result.finished,true);
 assert.equal(result.league.history[0].attempts,6);
 assert.equal(result.league.history[0].catches,1);
 assert.equal(result.reward,0);
 assert.equal(result.medal,'none','one fish cannot earn a medal when three are required');
});
test('corrupt old saves, forged scores, invalid species and round history are bounded',()=>{
 const legacy=normalizeLeague({});
 assert.equal(legacy.active,null);assert.equal(legacy.history.length,0);
 const noisy=normalizeLeague({active:{id:'legend',attempts:999,catches:999,score:Infinity,pending:true,
   seenSpecies:['虹鳟','evil','虹鳟'],seenSpots:[0,999,0]},
   best:{legend:99999999},history:[
    {id:'bad',score:2000},
    ...Array(20).fill({id:'morning',score:180,medal:'gold',catches:3,attempts:3,prize:620})]});
 assert.equal(noisy.active.attempts,10);assert.equal(noisy.active.catches,5);
 assert.equal(noisy.active.pending,false);
 assert.deepEqual(noisy.active.seenSpecies,['虹鳟']);
 assert.deepEqual(noisy.active.seenSpots,[0]);
 assert.equal(noisy.history.length,12);assert.equal(noisy.best.legend,100000);
 const stats=leagueProgress(noisy);
 assert.equal(stats.recent.length,8);
});
test('the league state is JSON roundtrip stable without timers or cross-player server state',()=>{
 const original=start('explorer',2000,18).league;
 const l=leagueWaterCast(original).league;
 const copy=normalizeLeague(JSON.parse(JSON.stringify(l)));
 assert.deepEqual(copy,l);
 const fish=leagueFishLanded(copy,carp);
 assert.equal(fish.ok,true);
 assert.equal(fish.league.active.seenSpecies[0],'镜鲤');
 assert.equal(fish.league.active.seenSpots[0],1);
});

test('even enormous rare fish scores cannot bypass the required landed-fish count',()=>{
 let l=start('legend',5000,100).league;
 // Two excellent fish can clear the Gold score threshold; the league requires 5.
 for(const fish of [pike,{species:'湖鲟',weight:32,location:2,depth:.92}]){
  const r=land(l,fish);l=r.league;
 }
 assert.ok(l.active.score>LEAGUE_CUPS[2].thresholds[2],l.active);
 // Spend the remaining 8 legitimate water casts without catching any fish.
 let last=null;
 for(let i=0;i<8;i++){
  last=leagueMiss(leagueWaterCast(l).league,'2026-11-06T18:00:00Z');
  l=last.league;
 }
 assert.equal(last.finished,true);
 assert.equal(last.medal,'none');
 assert.equal(last.reward,0);
 assert.equal(last.league.history.at(-1).catches,2);
 assert.equal(last.league.history.at(-1).score>1450,true);
 assert.equal(last.league.history.at(-1).prize,0);
});
