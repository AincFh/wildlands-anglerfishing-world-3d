/* WILDLANDS NEXT: WebGL2 Three.js runtime.
   Lake renderer derived from Luminous Lake (MIT, Bles Software); see ../LICENSE. */
import * as THREE from 'three';
import {createWorld} from './world/world.js';
import {createAngler} from './angler.js';
import {enhanceForest} from './world/forestUpgrade.js';
import {createShoreDetails} from './world/shoreDetails.js';

const loading=document.getElementById('loading');
function crash(reason){
 console.error('[WILDLANDS NEXT] failed to start',reason);
 loading.innerHTML='<div style="padding:24px;text-align:center;color:#f2f6ef"><h2>无法启动 3D 场景</h2><p>请确认浏览器允许 WebGL 2 和网络加载 Three.js。</p><pre style="white-space:pre-wrap;max-width:620px;font-size:11px;color:#ffb8aa">'+String(reason?.message||reason).slice(0,300)+'</pre></div>';
}
function boot(){
 const canvas=document.getElementById('scene');
 let renderer,world,angler,shore;let forestState={loaded:false,instances:0};
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const softwareGPU=!!navigator.webdriver;
  const mobile=softwareGPU||matchMedia('(pointer:coarse)').matches||window.innerWidth<700;
  world=createWorld({renderer,isMobile:mobile});
  shore=createShoreDetails(world.terrain.heightAt,{lowPower:softwareGPU||mobile});
  world.scene.add(shore.group);
  if(softwareGPU){world.water.cubeEnabled=false;world.setWildlife(.42);renderer.setPixelRatio(.7)}
  angler=createAngler(world);
  // Only request optional external forest assets when explicitly enabled; many
  // third-party hosts disallow CORS and must not generate console errors.
  if(new URLSearchParams(location.search).get('externalTrees')==='1'){
    enhanceForest(world,{softwareGPU,mobile}).then(result=>{forestState=result;});
  }else forestState={loaded:false,instances:0,source:'local-volume-forest',disabledReason:'external assets require CORS'};
  world.setTimeOfDay(.31,{resumeCycle:true});world.setWeather(.05);world.setWind(.26);
  world.setCalmness(.74);world.setWildlife(.80);
  const resize=()=>world.resize(window.innerWidth,window.innerHeight);
  window.addEventListener('resize',resize);resize();
 }catch(err){crash(err);return}
 let last=performance.now(),frames=0,first=true,lastClock=0;
 function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.045,Math.max(.0005,(now-last)/1000));last=now;
  try{
   angler.update(dt);
   world.update(dt);
   if(first){first=false;loading.classList.add('out');setTimeout(()=>loading.remove(),1050)}
   if(now-lastClock>650){
    lastClock=now;const sky=world.getState();const minute=Math.floor((((sky.timeOfDay%1)+1)%1)*1440);const time=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
    const weather=sky.weather>.68?'风雨':sky.weather>.30?'薄雾':'晴朗';
    document.getElementById('clock').textContent=weather+' · '+time+' · '+sky.fps+' FPS';
   }
   frames++;
  }catch(err){
   console.error('[WILDLANDS NEXT] frame failure:',err);
   if(frames<4){crash(err);return}
   throw err;
  }
 }
 requestAnimationFrame(frame);
 window.__wildlandsNext={
  renderer,world,angler,scene:world.scene,
  getState:()=>({renderer:'webgl',...world.getState(),...angler.getState(),forestUpgrade:forestState,shoreDetails:shore.count}),
  test:{setWeather:v=>world.setWeather(v),forceBite:()=>angler.debug.forceBite(),
       forceFish:()=>angler.debug.forceFish(),forceCatch:()=>angler.debug.forceCatch(),
       setCoins:n=>angler.debug.setCoins(n),moveLocation:i=>angler.viewLocation(i)},
  version:'next-0.3.0'
 };
}
boot();
