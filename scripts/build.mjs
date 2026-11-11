// Netlify static build: deploy the games and launcher, not source Functions or secrets.
import { readdir, mkdir, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';
const root = process.cwd(), output = join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const excluded = new Set(['.git', '.netlify', 'node_modules', 'dist', 'netlify', 'scripts', '.github']);
const includeFiles = /\.(html?|css|js|mjs|png|jpe?g|gif|webp|svg|ico|wasm|woff2?|json|mp3|ogg|wav|mp4)$/i;
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith('.')) continue;
  if (entry.isDirectory()) {
    await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
  } else if (entry.isFile() && includeFiles.test(entry.name) && entry.name !== 'package.json' && entry.name !== 'package-lock.json') {
    await cp(join(root, entry.name), join(output, entry.name));
  }
}
console.log('SURVIVAL HUB: static files built to dist/');
