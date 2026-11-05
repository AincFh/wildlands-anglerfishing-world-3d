import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCatchLog,recordLanding,journalStats} from '../next/src/sim/catchLog.mjs';
const fish={species:'虹鳟',weight:2.18,location:1,bait:2,depth:.45,time:.3,weather:.7,payout:214,number:1};
test('legacy saves start with an empty journal, invalid records are dropped',()=>{
 assert.deepEqual(normalizeCatchLog(null),[]);
 assert.deepEqual(normalizeCatchLog([{species:'fake',weight:999},fish]),[fish]);
});
test('records are immutable and capped to latest 40 fish',()=>{
 let log=[];
 for(let i=1;i<=55;i++){const prev=log;log=recordLanding(log,{...fish,number:i});
  assert.notEqual(prev,log);
 }
 assert.equal(log.length,40);assert.equal(log[0].number,16);assert.equal(log[39].number,55);
});
test('journal summary uses actual settled catches and prevents bad values',()=>{
 const log=recordLanding([fish],{...fish,species:'镜鲤',weight:18,payout:-20});
 const stats=journalStats(log);
 assert.equal(stats.count,2);assert.equal(stats.unique,2);
 assert.equal(stats.heaviest.species,'镜鲤');assert.equal(stats.totalEarned,214);
});
