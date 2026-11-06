import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPHICS_MODES,normalizeGraphicsMode,resolveGraphicsSettings} from '../next/src/sim/graphics.mjs';

test('four named presets are unique, default is adaptive, untrusted saved values normalize',()=>{
 assert.deepEqual(GRAPHICS_MODES.map(x=>x.id),['auto','cinematic','balanced','performance']);
 assert.equal(normalizeGraphicsMode(undefined),'auto');
 assert.equal(normalizeGraphicsMode('__proto__'),'auto');
 assert.equal(normalizeGraphicsMode('performance'),'performance');
});
test('manual presets actually differ in reflection, wave CPU cadence, rain and pixel ratio',()=>{
 const base={nativePixelRatio:2.5,isMobile:false,softwareGPU:false};
 const high=resolveGraphicsSettings({...base,mode:'cinematic'});
 const medium=resolveGraphicsSettings({...base,mode:'balanced'});
 const low=resolveGraphicsSettings({...base,mode:'performance'});
 assert.deepEqual([high.tier,medium.tier,low.tier],['high','medium','low']);
 assert.deepEqual([high.reflectionInterval,medium.reflectionInterval,low.reflectionInterval],[2,3,4]);
 assert.deepEqual([high.vertexEvery,medium.vertexEvery,low.vertexEvery],[1,2,4]);
 assert.deepEqual([high.normalMapEvery,medium.normalMapEvery,low.normalMapEvery],[1,2,3]);
 assert.ok(high.pixelRatio>medium.pixelRatio&&medium.pixelRatio>low.pixelRatio);
 assert.ok(high.rainMax>medium.rainMax&&medium.rainMax>low.rainMax);
 assert.equal(high.shadows,true);assert.equal(low.shadows,false);
});
test('automatic quality respects adaptive tier selection without locking manual overrides',()=>{
 const auto0=resolveGraphicsSettings({mode:'auto',adaptiveTier:0});
 const auto1=resolveGraphicsSettings({mode:'auto',adaptiveTier:1});
 const auto2=resolveGraphicsSettings({mode:'auto',adaptiveTier:2});
 assert.equal(auto0.tier,'high');assert.equal(auto1.tier,'medium');
 assert.equal(auto2.tier,'low');
 assert.equal(resolveGraphicsSettings({mode:'cinematic',adaptiveTier:2}).tier,'high');
 assert.equal(resolveGraphicsSettings({mode:'performance',adaptiveTier:0}).tier,'low');
 assert.equal(resolveGraphicsSettings({mode:'bad',adaptiveTier:Infinity}).tier,'high');
});
test('mobile/shader fallbacks are capped even when user requests cinematic',()=>{
 const mobile=resolveGraphicsSettings({mode:'cinematic',isMobile:true,nativePixelRatio:4});
 assert.equal(mobile.pixelRatio,1.5);assert.equal(mobile.shadows,false);
 const soft=resolveGraphicsSettings({mode:'cinematic',softwareGPU:true,nativePixelRatio:4});
 assert.equal(soft.pixelRatio,.75);assert.equal(soft.shadows,false);
 const dpr=resolveGraphicsSettings({mode:'balanced',nativePixelRatio:1.1});
 assert.equal(dpr.pixelRatio,1.1);
 const invalid=resolveGraphicsSettings({mode:'cinematic',nativePixelRatio:-500});
 assert.equal(invalid.pixelRatio,1);
});
test('real rendering control does not specify or modify fish, inventory, physics or money',()=>{
 for(const choice of GRAPHICS_MODES){
  const g=resolveGraphicsSettings({mode:choice.id,nativePixelRatio:2});
  assert.ok(g.reflectionInterval>=2&&g.reflectionInterval<=4);
  assert.ok(g.vertexEvery>=1&&g.vertexEvery<=4);
  assert.ok(g.pixelRatio>=.5&&g.pixelRatio<=2);
  assert.deepEqual(Object.keys(g).sort(),[
   'adaptive','fireflyMax','mode','normalMapEvery','pixelRatio',
   'rainMax','reflectionInterval','shadows','tier','vertexEvery'
  ].sort());
 }
});
