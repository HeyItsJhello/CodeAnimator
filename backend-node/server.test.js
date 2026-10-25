import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUTPUTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'outputs');
const stale = path.join(OUTPUTS_DIR, 'test_stale.mp4');
const fresh = path.join(OUTPUTS_DIR, 'test_fresh.mp4');

let server, base;

beforeAll(async () => {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  fs.writeFileSync(stale, 'old');
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(stale, hourAgo, hourAgo);
  fs.writeFileSync(fresh, '0123456789');

  const { app } = await import('./server.js'); // sweeps on import
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
  fs.rmSync(fresh, { force: true });
});

test('startup sweep deletes outputs older than the TTL and keeps fresh ones', () => {
  expect(fs.existsSync(stale)).toBe(false);
  expect(fs.existsSync(fresh)).toBe(true);
});

test('stream supports range requests', async () => {
  const res = await fetch(`${base}/api/stream/test_fresh.mp4`, { headers: { Range: 'bytes=2-4' } });
  expect(res.status).toBe(206);
  expect(await res.text()).toBe('234');
});

test('rejects path traversal', async () => {
  const res = await fetch(`${base}/api/stream/..%2Fserver.js`);
  expect(res.status).toBe(400);
});

test('download deletes the video', async () => {
  const res = await fetch(`${base}/api/download/test_fresh.mp4`);
  expect(await res.text()).toBe('0123456789');
  await new Promise((r) => setTimeout(r, 50));
  expect(fs.existsSync(fresh)).toBe(false);
});
