import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.ts';
import { api } from './api.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.disable('x-powered-by');
app.use('/api', api);

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(config.port, () => {
  console.log(`ForgeOne Roof CRM on http://localhost:${config.port}`);
  if (!config.serverKey) console.warn('WARNING: no server API key set (GOOGLE_MAPS_SERVER_KEY). Lookups will fail.');
  if (!config.browserKey) console.warn('WARNING: no browser API key set (GOOGLE_MAPS_BROWSER_KEY). Map will not load.');
});
