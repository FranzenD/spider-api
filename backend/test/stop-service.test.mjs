import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { StopService } from '../src/services/StopService.ts';

const originalApiKey = process.env.API_KEY;
process.env.API_KEY = 'unit-test-key';
after(() => {
  if (originalApiKey === undefined) delete process.env.API_KEY;
  else process.env.API_KEY = originalApiKey;
});

test('search errors omit the upstream URL and API key', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    throw new Error(`request to ${url} failed`);
  });

  await assert.rejects(StopService.searchStops('Slussen'), { message: 'Failed to search stops' });
});

test('traffic timeout covers the response body after headers arrive', async t => {

  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reading = Promise.withResolvers();
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
    ok: true,
    json() {
      reading.resolve();
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    },
  }));
  const result = StopService.getTraffic('1');
  await reading.promise;
  t.mock.timers.tick(5000);
  await assert.rejects(result, { name: 'AbortError', message: 'Trafiklab request timed out' });
});
