import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

const shared = {
  bundle: true,
  format: 'esm',
  sourcemap: true,
  write: false,
};

const builds = await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/host/index.ts'],
    outfile: 'lib/index.js',
    platform: 'node',
    target: 'node24',
    packages: 'external',
  }),
  build({
    ...shared,
    entryPoints: ['src/client/index.tsx'],
    outfile: 'lib/client.js',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    format: 'cjs',
    external: ['react', 'react/*', '@deepseek-ai/*'],
    loader: { '.css': 'text' },
    banner: { js: `window.__ModuleLoader__.load({ id: "dsh-calorie-helper", factory: (require) => {
const module = { exports: {} };
const exports = module.exports;` },
    footer: { js: 'return module.exports;\n} });' },
  }),
]);

await mkdir('lib', { recursive: true });
await Promise.all(builds.flatMap(({ outputFiles }) => outputFiles.map(({ path, contents }) => writeFile(path, contents))));
