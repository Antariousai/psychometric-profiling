import { load, save } from './storage';

const QUEUE_KEY = 'ant.syncQueue';

export async function enqueue(item) {
  const queue = await load(QUEUE_KEY, []);
  queue.push({ ...item, enqueuedAt: Date.now() });
  await save(QUEUE_KEY, queue);
}

export async function loadQueue() {
  return load(QUEUE_KEY, []);
}

export async function clearQueue() {
  await save(QUEUE_KEY, []);
}

export async function removeFromQueue(enqueuedAt) {
  const queue = await load(QUEUE_KEY, []);
  await save(QUEUE_KEY, queue.filter(i => i.enqueuedAt !== enqueuedAt));
}
