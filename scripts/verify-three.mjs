/**
 * Post-vendor verification of the *published* browser dependency graph.
 * This explicitly fails CI when a runtime module or license is missing.
 */
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'next','vendor','three');
const page=readFileSync(path.join(root,'next','index.html'),'utf8');
const expectMap={
  three:'./vendor/three/build/three.module.js',
  'three/addons/':'./vendor/three/examples/jsm/'
};
const match=page.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if(!match)throw new Error('NEXT index is missing ESM importmap');
const map=JSON.parse(match[1]).imports;
for(const [key,value]of Object.entries(expectMap)){
  if(map[key]!==value)throw new Error('NEXT importmap points '+key+' to '+map[key]+', expected '+value);
}
const required=['build/three.module.js','build/three.core.js','LICENSE',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/utils/BufferGeometryUtils.js'];
for(const relative of required){
  const file=path.join(base,relative);
  if(!existsSync(file)||statSync(file).size<400)
    throw new Error('Missing/empty self-hosted browser dependency: '+relative);
}
const license=readFileSync(path.join(base,'LICENSE'),'utf8');
if(!/MIT License/i.test(license))throw new Error('Three.js MIT license was not included');
let scanned=0,addonRefs=0;
function scan(folder) {
  for(const entry of readdirSync(folder,{withFileTypes:true})){
    const p=path.join(folder,entry.name);
    if(entry.isDirectory()){scan(p);continue}
    if(!p.endsWith('.js')&&!p.endsWith('.mjs'))continue;
    scanned++;
    const content=readFileSync(p,'utf8');
    const direct=[...content.matchAll(/['"]three\/addons\/([^'"]+)['"]/g)];
    for(const [,relative]of direct){
      addonRefs++;
      if(!/^[\w./-]+\.js$/.test(relative))throw new Error('Unexpected addon import '+relative+' in '+p);
      const asset=path.join(base,'examples','jsm',relative);
      if(!existsSync(asset))throw new Error('Module '+p+' imports missing addon '+relative);
    }
  }
}
scan(path.join(root,'next','src'));
if(addonRefs<1)throw new Error('Expected genuine imported Three.js addons to be verified');
console.log('PASS Three.js offline runtime: '+required.length+' core assets; '
  +scanned+' WILDLANDS ESM source files, '+addonRefs+' addon imports verified');
