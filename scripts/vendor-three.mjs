/**
 * Vendor ONLY the exact pinned Three.js browser ESM runtime into the static
 * NEXT directory. Production visitors must never depend on a JS CDN.
 *
 * This is a build-time npm dependency (CI), not a runtime HTTP dependency.
 * Every published file is from the same MIT-licensed npm package version.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=path.join(root,'node_modules','three');
const requiredVersion='0.179.1';
const manifest=path.join(pkg,'package.json');
if (!existsSync(manifest)) {
  throw new Error('Missing Three.js dependency. Run npm install first.');
}
const meta=JSON.parse(readFileSync(manifest,'utf8'));
if (meta.version!==requiredVersion) {
  throw new Error('Three.js version mismatch: expected '+requiredVersion+', got '+meta.version);
}
const destination=path.join(root,'next','vendor','three');
const build=path.join(destination,'build');
const addons=path.join(destination,'examples','jsm');
rmSync(destination,{recursive:true,force:true});
mkdirSync(build,{recursive:true});
for(const file of ['three.module.js','three.core.js']){
  const source=path.join(pkg,'build',file);
  if(!existsSync(source))throw new Error('Three.js npm package missing '+file);
  copyFileSync(source,path.join(build,file));
}
cpSync(path.join(pkg,'examples','jsm'),addons,{recursive:true,force:true});
copyFileSync(path.join(pkg,'LICENSE'),path.join(destination,'LICENSE'));
console.log('Self-hosted Three.js '+requiredVersion+': ESM core, all official examples modules and MIT LICENSE');
