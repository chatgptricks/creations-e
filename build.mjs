import { mkdir, cp, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = ['index.html', 'styles.css', 'app.js', 'playground-scene.js', 'project-objects.js', 'playground-audio.js'];
const sources = await Promise.all(files.map(file => readFile(file, 'utf8')));
const version = createHash('sha256').update(sources.join('\0')).update(await readFile('package-lock.json')).update(await readFile('assets/projects.json')).digest('hex').slice(0, 12);
const versionImports = source => source.replace(/(\bfrom\s*["'])(\.\/[^"'?#]+\.js)(["'])/g, `$1$2?v=${version}$3`);
await rm('dist', { recursive: true, force: true });
await mkdir('dist/vendor', { recursive: true });
// Version both entry points and imported modules: a new page must not reuse old modules.
for (const [index, file] of files.entries()) {
  let source = sources[index];
  if (file.endsWith('.html')) source = source.replace(/((?:href|src)=["'])([^"'?#]+\.(?:css|js))(["'])/g, `$1$2?v=${version}$3`);
  if (file.endsWith('.js')) source = versionImports(source);
  await writeFile(`dist/${file}`, source);
}
await cp('assets', 'dist/assets', { recursive: true, filter: source => !/inventory-[ab]\.json$/.test(source) });
for (const file of ['three.module.min.js', 'three.core.min.js']) await writeFile(`dist/vendor/${file}`, versionImports(await readFile(`node_modules/three/build/${file}`, 'utf8')));
await copyFile('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
console.log('Built static portfolio in dist/');
