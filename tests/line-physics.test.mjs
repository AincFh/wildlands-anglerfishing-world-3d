import test from 'node:test';
import assert from 'node:assert/strict';
import {LINE_SEGMENTS,lineCurve} from '../next/src/sim/linePhysics.mjs';
const a={x:0,y:3,z:0},b={x:16,y:0,z:6};
test('fishing line is a stable 15-vertex suspended curve with real endpoints',()=>{
 const buffer=new Float32Array(LINE_SEGMENTS*3);
 const line=lineCurve(a,b,{tension:.2,wind:.5,time:1},buffer);
 assert.equal(line,buffer);
 assert.deepEqual([...buffer.slice(0,3)],[0,3,0]);
 assert.deepEqual([...buffer.slice(-3)],[16,0,6]);
 assert.equal(buffer.length,45);
 assert.ok(buffer.every(Number.isFinite));
});
test('tight line stretches straighter, slack line sags significantly',()=>{
 const loose=lineCurve(a,b,{tension:.01});
 const tight=lineCurve(a,b,{tension:1});
 const idx=Math.floor(LINE_SEGMENTS/2)*3+1;
 assert.ok(loose[idx]<tight[idx]-.2,{loose:loose[idx],tight:tight[idx]});
});
test('a strong breeze moves center but never moves endpoints',()=>{
 const still=lineCurve(a,b,{wind:0,time:1});
 const gust=lineCurve(a,b,{wind:1,time:1});
 const idx=Math.floor(LINE_SEGMENTS/2)*3;
 assert.ok(Math.abs(still[idx]-gust[idx])>.001);
 assert.equal(gust[0],a.x);assert.equal(gust[gust.length-3],b.x);
 assert.throws(()=>lineCurve(a,b,{},new Float32Array(6)),RangeError);
});
