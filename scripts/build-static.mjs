import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'dist');
const pages = ['index.html', 'atlas.html', 'radiologia.html'];
const files = [...pages, 'service-worker.js', 'THIRD_PARTY_NOTICES.md', 'src', 'public'];

// Keep the same URL layout as the local server, including /public/models/.
// Only browser assets are published; server scripts and tests stay in the repo.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await cp(join(root, file), join(output, file), { recursive: true });

async function requireAsset(url, source) {
  const path = decodeURIComponent(new URL(url, 'https://atlas.invalid/').pathname);
  const local = path.endsWith('/') ? `${path}index.html` : path;
  if (!(await stat(join(output, local)).catch(() => null))?.isFile()) {
    throw new Error(`Arquivo ausente na publicação: ${url} (referenciado em ${source})`);
  }
}
for (const page of pages) {
  const html = await readFile(join(output, page), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|data:|mailto:|#)/.test(url)) continue;
    await requireAsset(url, page);
  }
}
const context = { window: {} };
vm.runInNewContext(await readFile(join(output, 'src/data/systems.js'), 'utf8'), context);
for (const system of context.window.ANATOMY_SYSTEMS) {
  if (system.available && system.model) await requireAsset(system.model, system.name);
}
const worker = await readFile(join(output, 'service-worker.js'), 'utf8');
const cached = worker.match(/const CORE_ASSETS = (\[[\s\S]*?\]);/);
if (!cached) throw new Error('Não foi possível validar os arquivos do service worker.');
for (const url of vm.runInNewContext(cached[1])) await requireAsset(url, 'service-worker.js');
await requireAsset('public/models/body-context.glb', 'silhueta corporal');
console.log('Publicação pronta em dist/: páginas, referências locais, modelos e cache validados.');
