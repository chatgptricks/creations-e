import { mkdir, cp, rm, copyFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/vendor', { recursive: true });
for (const file of ['index.html', 'styles.css', 'windows.css', 'explorer.css', 'theme.css', 'app.js', 'scene.js', 'windows.js', 'explorer.js', 'browser.js', 'desktop-drag.js']) await copyFile(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true, filter: source => !/inventory-[ab]\.json$/.test(source) });
for (const file of ['three.module.min.js', 'three.core.min.js']) await copyFile(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
await copyFile('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
console.log('Built static portfolio in dist/');
