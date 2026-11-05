/**
 * Stamp every first-party browser ES-module URL with the same immutable
 * GitHub commit revision. GitHub Pages caches .js files across deploys; an
 * HTML query alone does NOT refresh nested ESM imports. This converts the
 * copied dist/next tree, never checked-in source files.
 */
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'dist','next');
const source=path.join(site,'src');
const htmlFile=path.join(site,'index.html');
const sha=(process.env.GITHUB_SHA||process.argv[2]||'').trim().toLowerCase();
if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Set GITHUB_SHA to a 40-char git commit SHA');
if(!existsSync(htmlFile)||!existsSync(source))
  throw Error('dist/next must contain an actual copied NEXT site before stamping');
const stamp=sha.slice(0,12);
let html=readFileSync(htmlFile,'utf8');
const entry='./src/main.js';
if(!html.includes('src="'+entry+'"'))throw Error('NEXT browser entry point changed unexpectedly');
html=html.replace('src="'+entry+'"','src="'+entry+'?v='+stamp+'"');
writeFileSync(htmlFile,html);
let files=0,edges=0;
function walk(dir){
  for(const item of readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name);
    if(item.isDirectory()){walk(file);continue}
    if(!/\.(?:js|mjs)$/.test(file))continue;
    let code=readFileSync(file,'utf8');
    // Handle static from "./x.js", side-effect import "./x.js" and
    // dynamic import("./x.js") with the same shared revision.
    const pattern=/(\b(?:from|import)\s*(?:\(\s*)?)(['"])(\.{1,2}\/[^'"]+?\.(?:m?js))\2/g;
    code=code.replace(pattern,(full,prefix,quote,ref)=>{
      const moduleFile=path.resolve(path.dirname(file),ref);
      if(!moduleFile.startsWith(source+path.sep)||!existsSync(moduleFile))
        throw Error('Unresolved or out-of-tree NEXT module: '+file+' -> '+ref);
      edges++;
      return prefix+quote+ref+'?v='+stamp+quote;
    });
    // Fail if a relative ESM import escaped the stamping pass.
    if(/\bfrom\s*['"]\.{1,2}\/[^'"]+\.m?js['"]/.test(code))
      throw Error('Unstamped ES module import in '+file);
    writeFileSync(file,code);
    files++;
  }
}
walk(source);
if(files<12||edges<12)throw Error('Incomplete NEXT import graph: files='+files+', edges='+edges);
console.log('PASS cache-safe NEXT release '+stamp+': '+files+' first-party modules, '+edges+' versioned edges');
