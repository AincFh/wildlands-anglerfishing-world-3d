const test=require('node:test'),assert=require('node:assert/strict');
const Fight=require('../fight.js');
const f=id=>({id,base:1.8,pull:id==='sturgeon'?2:id==='bluegill'?.37:.8});
test('species have different behavior and power',()=>{
 const small=Fight.profile(f('bluegill'),.8),large=Fight.profile(f('sturgeon'),12);
 assert.equal(small.kind,'dart');assert.equal(large.kind,'dive');
 assert.ok(large.power>small.power);assert.notEqual(large.burstPeriod,small.burstPeriod);
});
test('drag is bounded even for invalid save values',()=>{
 assert.equal(Fight.clampDrag(-50),.2);assert.equal(Fight.clampDrag(999),.9);
 assert.equal(Fight.clampDrag(NaN),.2);assert.equal(Fight.clampDrag(.55),.55);
});
test('time step is bounded and cannot silently win by exhaustion',()=>{
 const start=Fight.makeFight(f('bluegill'),.75,65);
 const depleted={...start,stamina:0,distance:55};
 const result=Fight.stepFight(depleted,{dt:1,reeling:false,drag:.5});
 assert.notEqual(result.outcome,'caught');
 assert.ok(result.distance>2.4);
});
test('waiting without reeling never grants a catch',()=>{
 let s=Fight.makeFight(f('bass'),2.3,40);
 for(let i=0;i<450&&!s.outcome;i++)s=Fight.stepFight(s,{dt:.1,reeling:false,drag:.5});
 assert.notEqual(s.outcome,'caught');
});
test('bursts change direction and generate distinct events',()=>{
 let s=Fight.makeFight(f('pike'),3,50),surges=0,headings=new Set();
 for(let i=0;i<400;i++){s=Fight.stepFight(s,{dt:.08,reeling:i%4===0,drag:.35});if(s.lastEvent==='surge'){surges++;headings.add(s.heading);}if(s.outcome)break;}
 assert.ok(surges>=2);assert.ok(s.burstCount>=2);assert.ok(Number.isFinite(s.bearing));
});
test('very high drag plus constant reeling eventually snaps the line',()=>{
 let s=Fight.makeFight(f('sturgeon'),18,85);
 for(let i=0;i<1200&&!s.outcome;i++)s=Fight.stepFight(s,{dt:.08,reeling:true,drag:.9,line:1,retrieve:1});
 assert.equal(s.outcome,'snap');
});
test('appropriate pumping and drag can catch a common fish',()=>{
 let s=Fight.makeFight(f('bluegill'),.6,40);
 for(let i=0;i<3000&&!s.outcome;i++){
  const reeling=s.tension<.72;
  s=Fight.stepFight(s,{dt:.06,reeling,drag:.42,line:1,retrieve:1});
 }
 assert.equal(s.outcome,'caught');assert.ok(s.distance<=2.4);
});
test('stronger rods help retrieve the same fish',()=>{
 const first=Fight.makeFight(f('rainbow'),2,45),turn={dt:.09,reeling:true,drag:.5};
 let a=first,b=first;
 for(let i=0;i<50;i++){a=Fight.stepFight(a,{...turn,line:1,retrieve:1});b=Fight.stepFight(b,{...turn,line:1.8,retrieve:1.8});}
 assert.ok(b.distance<a.distance,'better rod should shorten distance sooner');
});
test('input step does not mutate the previous fight snapshot',()=>{
 const start=Fight.makeFight(f('carp'),3.4,40),copy=JSON.stringify(start);
 const next=Fight.stepFight(start,{dt:.08,reeling:true,drag:.7});
 assert.equal(JSON.stringify(start),copy);assert.notEqual(start.tension,next.tension);
});
