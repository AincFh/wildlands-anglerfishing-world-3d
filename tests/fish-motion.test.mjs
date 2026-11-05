import test from 'node:test';
import assert from 'node:assert/strict';
import {FISH_SHAPES,fishShape,fishSwimPose} from '../next/src/sim/fishMotion.mjs';

test('all eight species have finite, positive and visibly varied anatomical proportions',()=>{
 assert.equal(FISH_SHAPES.length,8);
 for(const s of FISH_SHAPES){
  assert.ok(s.length>.6&&s.length<2);
  assert.ok(s.width>.6&&s.width<1.5);
  assert.ok(s.depth>.6&&s.depth<1.5);
  assert.ok(s.tail>.5&&s.tail<1.6);
 }
 assert.ok(fishShape(4).length>fishShape(3).length*1.5,'pike visibly longer than carp');
 assert.ok(fishShape(3).depth>fishShape(4).depth*1.6,'carp visibly deeper than pike');
 assert.ok(fishShape(7).length>fishShape(2).length*2,'sturgeon visibly longer than perch');
 assert.equal(fishShape(999),fishShape(0),'unknown species safe fallback');
});
test('tail beats, paired fins and gentle body roll produce continuous bounded animation',()=>{
 const poses=[0,.07,.14,.21].map(t=>fishSwimPose(t,1,0));
 assert.ok(new Set(poses.map(p=>Math.round(p.tailYaw*1000))).size>=3);
 assert.ok(poses.every(p=>Math.abs(p.tailYaw)<.65&&Math.abs(p.roll)<.1));
 assert.notEqual(poses[1].leftFinYaw,poses[1].rightFinYaw);
 assert.equal(fishSwimPose(.7,.5,5).tailYaw,fishSwimPose(.7,.5,5).tailYaw);
});
test('swimming bursts have larger tail swing than resting fish and varying beat speeds',()=>{
 const rest=fishSwimPose(.13,0,1),burst=fishSwimPose(.13,1,1);
 assert.ok(Math.abs(burst.tailYaw)>Math.abs(rest.tailYaw)*3);
 assert.notEqual(fishSwimPose(.14,1,4).tailYaw,fishSwimPose(.14,1,7).tailYaw);
 const bad=fishSwimPose(NaN,99,-2);
 assert.ok(Object.values(bad).every(Number.isFinite));
});
