/* WILDLANDS NEXT: WebGL2 Three.js runtime.
   Lake renderer derived from Luminous Lake (MIT, Bles Software); see ../LICENSE. */
import * as THREE from 'three';
import {createWorld} from './world/world.js';
import {createAngler} from './angler.js';

const loading=document.getElementById('loading');
function crash(reason){
 console.error('[WILDLANDS NEXT] failed to start',reason);
 loading.innerHTML='<div style="padding:24px;text-align:center;color:#f2f6ef"><h2>无法启动 3D 场景</h2><p>请确认浏览器允许 WebGL 2 和网络加载 Three.js。</p><pre style="white-space:pre-wrap;max-width:620px;font-size:11px;color:#ffb8aa">'+String(reason?.message||reason).slice(0,300)+'</pre></div>';
}
function boot(){
 const canvas=document.getElementById('scene');
 let renderer,world,angler;
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const mobile=matchMedia('(pointer:coarse)').matches||window.innerWidth<700;
  world=createWorld({renderer,isMobile:mobile});
  angler=createAngler(world);
  world.setTimeOfDay(.31);world.setWeather(.05);world.setWind(.26);
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
    lastClock=now;document.getElementById('clock').textContent=(world.getState().weather>0.6?'雨 · ':'晴 · ')+'06:30 · '+world.getState().fps+' FPS';
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
  getState:()=>({renderer:'webgl',...world.getState(),...angler.getState()}),
  test:{setWeather:v=>world.setWeather(v),forceBite:()=>angler.debug.forceBite(),
       forceFish:()=>angler.debug.forceFish(),forceCatch:()=>angler.debug.forceCatch(),
       setCoins:n=>angler.debug.setCoins(n),moveLocation:i=>angler.viewLocation(i)},
  version:'next-0.2.0'
 };
}
boot();
