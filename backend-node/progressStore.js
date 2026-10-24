const EXPIRY_MS = 30 * 60 * 1000;

const store = new Map();

export function setProgress(taskId, data) {
  store.set(taskId, { ...data, _updatedAt: Date.now() });
}

export function getProgress(taskId) {
  const entry = store.get(taskId);
  if (!entry) return null;
  const { _updatedAt, ...data } = entry;
  return data;
}

setInterval(() => {
  const cutoff = Date.now() - EXPIRY_MS;
  for (const [id, entry] of store) {
    if (entry._updatedAt < cutoff) store.delete(id);
  }
}, 60_000).unref();
