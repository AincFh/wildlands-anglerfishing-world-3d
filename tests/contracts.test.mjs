import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTRACTS,normalizeContracts,recordCatch,claimContract,availableClaims,contractUnlocked} from '../next/src/sim/contracts.mjs';

const catchInfo=(species,location=0,bait=0,weight=2,depth=.35)=>({species,location,bait,weight,depth});
test('old, corrupt and tampered progress loads safely',()=>{
 const p=normalizeContracts({counts:{'first-cast':999,'deep-legend':-1},claimed:{'first-cast':true,'north-bank':true},unique:{'lake-naturalist':['黄鲈','黄鲈','bad']}});
 assert.equal(p.counts['first-cast'],1);
 assert.equal(p.counts['deep-legend'],0);
 assert.equal(p.claimed['north-bank'],false);
 assert.deepEqual(p.unique['lake-naturalist'],['黄鲈']);
 assert.equal(p.counts['lake-naturalist'],1);
 assert.equal(normalizeContracts(null).counts['first-cast'],0);
});
test('first fish progresses the introductory mission; claim pays exactly once',()=>{
 let p=normalizeContracts();
 const event=recordCatch(p,catchInfo('虹鳟'),1);
 p=event.progress;
 assert.deepEqual(event.completed,['first-cast']);
 assert.equal(availableClaims(p,1),1);
 const first=claimContract(p,'first-cast',1);
 assert.equal(first.ok,true);
 assert.equal(first.reward,260);
 assert.equal(availableClaims(first.progress,1),0);
 assert.equal(claimContract(first.progress,'first-cast',1).reward,0);
});
test('location, size and species requirements cannot be bypassed',()=>{
 let p=normalizeContracts();
 p=recordCatch(p,catchInfo('黄鲈',0),3).progress;
 assert.equal(p.counts['birch-cove'],0);
 p=recordCatch(p,catchInfo('黄鲈',1),3).progress;
 p=recordCatch(p,catchInfo('镜鲤',1),4).progress;
 assert.equal(p.counts['birch-cove'],2);
 assert.equal(claimContract(p,'birch-cove',4).ok,true);
 p=recordCatch(p,catchInfo('大口黑鲈',0,0,1.49),4).progress;
 assert.equal(p.counts['bass-survey'],0);
 p=recordCatch(p,catchInfo('大口黑鲈',0,0,1.5),5).progress;
 assert.equal(p.counts['bass-survey'],1);
});
test('bait and depth must match actual cast, rare legend unlocks progressively',()=>{
 let p=normalizeContracts();
 assert.equal(contractUnlocked(CONTRACTS.at(-1),7),false);
 assert.equal(claimContract(p,'deep-legend',7).ok,false);
 p=recordCatch(p,catchInfo('湖鲟',2,3,20,.4),9).progress;
 assert.equal(p.counts['deep-legend'],0);
 p=recordCatch(p,catchInfo('湖鲟',2,2,20,.9),9).progress;
 assert.equal(p.counts['deep-legend'],0);
 p=recordCatch(p,catchInfo('湖鲟',2,3,8,.8),9).progress;
 assert.equal(p.counts['deep-legend'],1);
 assert.equal(claimContract(p,'deep-legend',9).reward,2600);
});
test('unique-species expedition requires three different fish',()=>{
 let p=normalizeContracts();
 for(let i=0;i<3;i++)p=recordCatch(p,catchInfo('虹鳟'),7+i).progress;
 assert.equal(p.counts['lake-naturalist'],1);
 p=recordCatch(p,catchInfo('镜鲤'),10).progress;
 p=recordCatch(p,catchInfo('帝王鲑'),11).progress;
 assert.equal(p.counts['lake-naturalist'],3);
 assert.equal(claimContract(p,'lake-naturalist',11).ok,true);
 assert.equal(CONTRACTS.length,8);
});
