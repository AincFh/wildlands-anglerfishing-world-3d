// Instanced forest: trunk + merged triple-cone canopy, wind sway on a
// rotating subset of instances so the woods feel alive for ~free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng } from '../sim/rng.js';

const MAX_TREES = 600;
const SWAY_SUBSET = 42;

function buildCanopyGeometry() {
  // Dense irregular branch masses, not the three stacked perfect cones used
  // by the early prototype. Built once then instanced across the forest.
  const clusters = [];
  for(let layer=0;layer<7;layer++){
    const t=layer/7;
    const radius=1.43*(1-t*.84),y=2.1+t*3.65;
    const branches=layer<3?5:4;
    for(let i=0;i<branches;i++){
      const angle=i*Math.PI*2/branches+layer*.71;
      const blob=new THREE.IcosahedronGeometry(1,0);
      blob.scale(radius*(.43+.06*Math.sin(layer*3+i)),.31+.05*(1-t),radius*.43);
      blob.rotateY(angle);
      blob.translate(Math.cos(angle)*radius*.53,y+(i%2)*.09,Math.sin(angle)*radius*.53);
      clusters.push(blob);
    }
  }
  const crown=new THREE.IcosahedronGeometry(1,1);
  crown.scale(.43,1.17,.43);crown.translate(0,5.43,0);clusters.push(crown);
  return mergeGeometries(clusters);
}

export function createForest({ heightAt, seed = 5150 }) {
  const rng = new Rng(seed);

  // Poisson-ish placement: jittered annulus samples with a min-distance grid.
  const placements = [];
  const cell = 3.4;
  const grid = new Map();
  const keyOf = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  let attempts = 0;
  while (placements.length < MAX_TREES && attempts < MAX_TREES * 40) {
    attempts++;
    const angle = rng.float(0, Math.PI * 2);
    // denser far ring: bias radius outward
    const u = rng.float();
    const r = 63 + (175 - 63) * (u < 0.45 ? rng.float(0, 0.45) : rng.float(0.3, 1));
    const x = Math.cos(angle) * r + rng.float(-2, 2);
    const z = Math.sin(angle) * r + rng.float(-2, 2);
    const h = heightAt(x, z);
    if (h < 0.8 || h > 16) continue;
    // All three shore spawn points must have a clear sightline and a walkable
    // landing. Previously the camera spawned *inside* an instanced conifer;
    // its low-poly crown filled the right third of the picture.
    const landings=[[18,65],[-61,27],[57,-32]];
    if(landings.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<20))continue;
    // Clear the shoreline walking belt. Do not plant foreground trunks where
    // the camera is likely to be physically moving.
    if(r<69 && Math.hypot(x-18,z-65)<32)continue;

    const k = keyOf(x, z);
    if (grid.has(k)) continue;
    grid.set(k, true);
    placements.push({
      x,
      z,
      y: h - 0.15,
      rotY: rng.float(0, Math.PI * 2),
      scale: rng.float(0.5, 1.75) * (r > 120 ? rng.float(1, 1.35) : 1),
      tint: rng.float()
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 2.4, 5);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const canopyGeo = buildCanopyGeometry();
  const canopyMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, placements.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, placements.length);
  trunks.castShadow = true;
  canopies.castShadow = true;
  trunks.receiveShadow = true;
  canopies.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const trunkColor = new THREE.Color();
  const canopyColor = new THREE.Color();
  const deepGreen = new THREE.Color(0x1d4a24);
  const warmGreen = new THREE.Color(0x3d6b2a);
  const blueSpruce = new THREE.Color(0x1c3d33);
  const bark = new THREE.Color(0x4a3524);
  const barkDark = new THREE.Color(0x33241a);

  placements.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    canopies.setMatrixAt(i, dummy.matrix);

    trunkColor.lerpColors(barkDark, bark, p.tint);
    trunks.setColorAt(i, trunkColor);
    if (p.tint < 0.055) canopyColor.setHex(0x52673e); // muted foliage, no luminous yellow
    else if (p.tint < 0.4) canopyColor.lerpColors(deepGreen, warmGreen, (p.tint - 0.08) / 0.32);
    else canopyColor.lerpColors(warmGreen, blueSpruce, (p.tint - 0.4) / 0.6);
    canopies.setColorAt(i, canopyColor);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(trunks, canopies);
  group.name = 'forest';

  let swayCursor = 0;
  let swayAmplitude = 0.5;

  const api = {
    group,
    count: placements.length,
    setWind(wind) {
      swayAmplitude = 0.15 + wind * 1.1;
    },
    update(time) {
      // Rotate through the forest, bending SWAY_SUBSET trees per frame.
      for (let n = 0; n < SWAY_SUBSET; n++) {
        const i = (swayCursor + n) % placements.length;
        const p = placements[i];
        const sway = Math.sin(time * 1.3 + p.x * 0.15 + p.z * 0.11) * 0.022 * swayAmplitude;
        const sway2 = Math.cos(time * 0.9 + p.z * 0.2) * 0.014 * swayAmplitude;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(sway, p.rotY, sway2);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        canopies.setMatrixAt(i, dummy.matrix);
      }
      swayCursor = (swayCursor + SWAY_SUBSET) % placements.length;
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;
    }
  };
  return api;
}
