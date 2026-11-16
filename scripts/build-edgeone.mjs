import './build.mjs';
import {build} from 'esbuild';
import {copyFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['edge-functions/api/frostline-pvp.js'],outfile:'dist/edge-functions/api/frostline-pvp.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await copyFile('Frostline_v3_4_holes.html','dist/index.html');
await writeFile('dist/edgeone.json',JSON.stringify({headers:[{source:'/api/*',headers:[{key:'Cache-Control',value:'no-store'}]},{source:'/',headers:[{key:'Cache-Control',value:'no-cache'}]}]},null,2));
console.log('EdgeOne upload root: dist (includes index.html and bundled API).');
