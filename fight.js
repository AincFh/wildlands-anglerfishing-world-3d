/* WILDLANDS Fish Dynamics — deterministic, headless fight simulation.
 * Standalone browser/global + CommonJS tests. No third-party dependencies.
 * Units: seconds, metres, relative drag (0.2–0.9), radians.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WILDLANDS_FIGHT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(n)?n:lo));
  const STYLES=Object.freeze({
    bluegill:{name:'短促摆尾',kind:'dart',burst:3.9,turn:.72,endurance:.72},
    perch:{name:'急转挣扎',kind:'dart',burst:3.4,turn:.86,endurance:.8},
    bass:{name:'近岸突围',kind:'dash',burst:3.0,turn:.55,endurance:1},
    pike:{name:'高速侧冲',kind:'dash',burst:2.55,turn:1.0,endurance:1.2},
    walleye:{name:'低位拉扯',kind:'dive',burst:3.25,turn:.45,endurance:1},
    rainbow:{name:'快速冲刺',kind:'dart',burst:2.9,turn:.7,endurance:.95},
    trout:{name:'深水下潜',kind:'dive',burst:3.8,turn:.38,endurance:1.2},
    carp:{name:'持续拉锯',kind:'steady',burst:4.0,turn:.3,endurance:1.55},
    salmon:{name:'长距离奔袭',kind:'dash',burst:2.8,turn:.67,endurance:1.5},
    sturgeon:{name:'深水强压',kind:'dive',burst:4.3,turn:.25,endurance:2.2},
    char:{name:'冷水激斗',kind:'dart',burst:3.0,turn:.6,endurance:1.25},
    golden:{name:'传奇跃水',kind:'dash',burst:2.45,turn:.9,endurance:1.7}
  });
  const fallback=Object.freeze({name:'来回挣扎',kind:'steady',burst:3.6,turn:.4,endurance:1});
  function profile(fish,weight){
    const style=STYLES[fish?.id]||fallback;
    const mass=clamp(Math.sqrt(clamp(weight,.1,100)/Math.max(.4,fish?.base||1)),.68,1.52);
    const power=clamp((fish?.pull||.7)*mass,.25,3.6);
    return {...style,power,mass,species:fish?.id||'unknown',
      burstPeriod:clamp(style.burst/(.8+power*.12),1.4,5.4),
      lineLimit:clamp(120+power*16,125,190)};
  }
  function clampDrag(n){return clamp(n,.2,.9);}
  function makeFight(fish,weight,distance,bearing=0){
    const p=profile(fish,weight);
    p.lineLimit=Math.max(p.lineLimit,clamp(distance,1,190)+32);
    return {
      profile:p,distance:clamp(distance,1,190),tension:.24,stamina:1,
      stress:0,slack:0,drag:.55,elapsed:0,burst:0,burstCount:0,
      nextBurst:p.burstPeriod,bearing:clamp(bearing,-Math.PI*2,Math.PI*2),
      heading:'平稳游动',outcome:null,lastEvent:null
    };
  }
  function stepFight(previous,input={}){
    if(!previous||!previous.profile)throw new TypeError('A valid fight state is required');
    const f={...previous};
    if(f.outcome)return f;
    const p=f.profile,dt=clamp(input.dt,0,.1);
    if(dt===0)return f;
    const reeling=!!input.reeling,drag=clampDrag(input.drag??f.drag);
    const rodLine=clamp(input.line||1,.5,3),rodRetrieve=clamp(input.retrieve||1,.4,3);
    f.drag=drag;f.elapsed+=dt;f.lastEvent=null;
    if(f.elapsed>=f.nextBurst){
      f.burstCount++;
      f.burst=clamp(.56+p.power*.22,.56,1.28);
      f.nextBurst=f.elapsed+p.burstPeriod*(.82+.18*Math.abs(Math.sin(f.burstCount*2.3+p.power)));
      const turn=Math.sin(f.burstCount*2.11+p.power)*p.turn;
      f.bearing=clamp(f.bearing+turn,-1.1,1.1);
      f.heading=p.kind==='dive'?'鱼正在下潜':p.kind==='dash'?'猛烈侧向逃窜':p.kind==='dart'?'突然转向':'持续沉底拉扯';
      f.lastEvent='surge';
    }
    f.burst=Math.max(0,f.burst-dt*(p.kind==='steady'?.29:.43));
    const fishLoad=p.power*(.26+.67*f.burst)*(.63+.37*f.stamina);
    const pressure=(reeling?.31+drag*.42+fishLoad*.24:fishLoad*.16-drag*.07-.33);
    f.tension=clamp(f.tension+dt*pressure/Math.sqrt(rodLine),0,1.15);
    if(f.tension>.86)f.stress+=dt*(.45+Math.max(0,f.tension-.86)*3.3)*(.82+p.power*.13)/rodLine;
    else f.stress=Math.max(0,f.stress-dt*.60);
    if(f.tension<.028)f.slack+=dt;else f.slack=Math.max(0,f.slack-dt*.8);
    const pull=p.power*(.12+.95*f.burst)*(.54+.46*f.stamina);
    const reel=reeling?(2.7+rodRetrieve*2.1)*(.76+drag*.38)*(1-.42*Math.min(f.tension,1))*(1-.22*f.burst):0;
    f.distance=Math.max(0,f.distance+dt*(pull-reel));
    if(reeling)f.stamina=Math.max(0,f.stamina-dt*(.047+.012*drag)/p.endurance);
    else f.stamina=Math.min(1,f.stamina+dt*.0065);
    if(f.stress>=.94)f.outcome='snap';
    else if(f.slack>=3.2)f.outcome='escape';
    else if(f.distance>p.lineLimit)f.outcome='out_of_line';
    else if(f.distance<=2.4&&f.stamina<.86)f.outcome='caught';
    if(f.outcome)f.lastEvent=f.outcome;
    else if(f.burst<=.12)f.heading=f.tension>.78?'鱼线承受高压':reeling?'持续收线中':'正在卸力恢复';
    return f;
  }
  return Object.freeze({STYLES,profile,makeFight,stepFight,clampDrag});
});