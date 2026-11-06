// World orchestrator — owns the scene graph, simulation state, quality
// scaling, and the per-frame update pipeline.
import * as THREE from 'three';
import { Rng } from '../sim/rng.js';
import { clamp01 } from '../sim/controls.js';
import { TimeCycle, fireflyVisibility, dawnFactor, nightFactor } from '../sim/timecycle.js';
import { WeatherMachine } from '../sim/weather.js';
import { QualityScaler, FpsMeter } from '../sim/quality.js';
import { normalizeGraphicsMode, resolveGraphicsSettings } from '../sim/graphics.mjs';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { createForest } from './forest.js';
import { createSky } from './sky.js';
import { createRain, createMist } from './weatherView.js';
import { createAnimalsView } from './animalsView.js';
import { createFishingBoat } from './boat.js';
import { createFishSchoolsView } from './fishSchools.js';
import { CameraDirector } from './cameras.js';

export function createWorld({ renderer, isMobile = false, softwareGPU = false }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
  // Azimuth chosen so the low night moon sits inside the default orbit frame.
  camera.position.set(16, 14, 60);
  camera.lookAt(0, 1, 0);

  const rng = new Rng(4242);

  // --- subsystems ---
  const terrain = createTerrain();
  scene.add(terrain.mesh);

  const water = createWater({ isMobile });
  scene.add(water.mesh);
  scene.add(water.cubeCamera);

  const forest = createForest({ heightAt: terrain.heightAt });
  scene.add(forest.group);

  const sky = createSky({});
  scene.add(sky.group);
  scene.environment = sky.envTexture;
  scene.fog = sky.fog;

  const rain = createRain({});
  scene.add(rain.points);
  const mist = createMist({});
  scene.add(mist.group);

  const animals = createAnimalsView({ heightAt: terrain.heightAt });
  scene.add(animals.group);

  const boat = createFishingBoat();
  scene.add(boat.group);

  // Real subsurface schools use only two instanced draws on either device.
  const shoals=createFishSchoolsView({heightAt:terrain.heightAt,isMobile});
  scene.add(shoals.group);

  // Mist banks, cloud sprites, the moon's additive halo, and firefly points
  // all smear soft blobs/streaks across the cube-map reflection (worst at
  // night) — exclude them from the cube camera. The moon DISC stays in, so
  // the water keeps a crisp moonlight streak.
  water.hiddenFromReflection = [mist.group, sky.cloudGroup, sky.moonHalo, sky.stars, animals.fireflyPoints, shoals.group];

  // --- simulation state ---
  const cycle = new TimeCycle(0.36);
  const weather = new WeatherMachine(rng);
  const state = {
    wind: 0.45,
    wildlife: 0.65,
    calmness: 0.55,
    mist: 0.35
  };

  // --- quality ---
  const scaler = new QualityScaler({ startTier: isMobile ? 1 : 0 });
  const fps = new FpsMeter(1.2);
  let graphicsMode = 'auto';
  let graphics = resolveGraphicsSettings({
    mode:graphicsMode,adaptiveTier:scaler.tierIndex,isMobile,softwareGPU,
    nativePixelRatio:window.devicePixelRatio||1
  });
  let pixelRatio = 1;

  function applyGraphics(){
    graphics=resolveGraphicsSettings({
      mode:graphicsMode,adaptiveTier:scaler.tierIndex,isMobile,softwareGPU,
      nativePixelRatio:window.devicePixelRatio||1
    });
    water.refreshInterval=graphics.reflectionInterval;
    water.normalEvery=graphics.normalMapEvery;
    water.vertexEvery=graphics.vertexEvery;
    sky.sunLight.castShadow=graphics.shadows;
    if(Math.abs(graphics.pixelRatio-pixelRatio)>.001){
      pixelRatio=graphics.pixelRatio;
      renderer.setPixelRatio(pixelRatio);
    }
    return graphics;
  }

  // --- cameras ---
  const director = new CameraDirector(camera, renderer.domElement);
  director.followUnderwaterFish(()=>shoals.simulation.fish.find(f=>f.cooldown===0&&!f.reserved));
  director.followBoat(()=>boat.getState());

  // --- lighting/shadows ---
  renderer.shadowMap.enabled = !isMobile&&!softwareGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  applyGraphics();

  let worldTime = 0;
  let forceSkyRefresh = true;

  const api = {
    scene,
    camera,
    director,
    terrain,
    weather,
    water,
    sky,
    boat,
    shoals,

    // ---- setters (wired to UI + debug handle) ----
    setTimeOfDay(v, { resumeCycle = false } = {}) {
      cycle.set(clamp01(v));
      cycle.auto = !!resumeCycle;
      forceSkyRefresh = true;
    },
    setWeather(v) {
      weather.setSlider(v);
    },
    setWind(v) {
      state.wind = clamp01(v);
    },
    setWildlife(v) {
      state.wildlife = clamp01(v);
    },
    setCalmness(v) {
      state.calmness = clamp01(v);
    },
    setMist(v) {
      state.mist = clamp01(v);
    },
    setCameraMode(mode) {
      director.setMode(mode);
    },
    setGraphicsMode(value){
      graphicsMode=normalizeGraphicsMode(value);
      applyGraphics();
      return {...graphics};
    },

    getState() {
      return {
        timeOfDay: cycle.t,
        weather: weather.slider,
        weatherState: weather.state,
        wind: state.wind,
        wildlife: state.wildlife,
        calmness: state.calmness,
        mist: state.mist,
        cameraMode: director.mode,
        cameraY: +camera.position.y.toFixed(3),
        qualityTier: graphics.tier,
        graphicsMode,
        graphics: {...graphics},
        fps: Math.round(fps.avg),
        rainCount: rain.activeCount,
        treeCount: forest.count,
        boat:boat.getState(),
        fishSchools:shoals.getState(),
        pixelRatio
      };
    },

    update(dt) {
      worldTime += dt;
      cycle.update(dt);
      weather.update(dt);

      const tod = cycle.t;
      const tier = graphics;

      sky.setFlash(weather.lightningFlash);
      sky.update(tod, weather.cloudCover, weather.darkness, dt, state.wind, forceSkyRefresh);
      forceSkyRefresh = false;

      water.setCalmLook(state.calmness);
      water.setNightLook(nightFactor(tod));
      water.update(worldTime, state.calmness, state.wind);
      water.updateReflection(renderer, scene);

      forest.setWind(state.wind);
      forest.update(worldTime);

      boat.update(dt, worldTime, state.calmness, state.wind);
      shoals.update(dt,{timeOfDay:tod,weather:weather.slider,wind:state.wind});

      const mistLevel = clamp01(
        state.mist * (0.45 + dawnFactor(tod) * 0.9) * (1 - nightFactor(tod) * 0.7) +
          weather.rainIntensity * 0.1
      );
      animals.update(dt, worldTime, {
        density: state.wildlife,
        calmness: state.calmness,
        wind: state.wind,
        fireflyVis: fireflyVisibility(tod) * (1 - weather.cloudCover * 0.35),
        fireflyCap: tier.fireflyMax
      });

      rain.update(dt, weather.rainIntensity, state.wind, tier.rainMax);
      mist.update(dt, worldTime, mistLevel, camera.position);

      director.update(dt, worldTime);

      // Adaptive quality
      const avg = fps.sample(dt);
      const action = graphicsMode==='auto'?scaler.update(dt,avg):null;
      if(action)applyGraphics();

      renderer.render(scene, camera);
    },

    resize(width, height) {
      camera.aspect = width / height;
      // Portrait: widen the view so the lake keeps a visible band.
      const portrait = camera.aspect < 0.8;
      camera.fov = portrait ? 72 : 55;
      camera.updateProjectionMatrix();
      director.setPortrait(portrait);
      renderer.setSize(width, height, false);
    }
  };

  director.onUserExit(() => {
    api.setCameraMode('orbit');
    if (api.onCameraExit) api.onCameraExit();
  });

  return api;
}
