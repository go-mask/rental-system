import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(
  await readFile(new URL('../supabase-config.js', import.meta.url), 'utf8'),
  context,
  { timeout: 1000 },
);
const { url, anonKey } = context.window.RENTAL_SUPABASE_CONFIG;
const endpoint = new URL('/rest/v1/properties', url);
if (endpoint.protocol !== 'https:' || !anonKey) {
  throw new Error('Supabase HTTPS URL and public API key are required.');
}
// Exercise the database API without retrieving any tenant records.
endpoint.searchParams.set('select', 'id');
endpoint.searchParams.set('limit', '0');

let healthy = false;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: anonKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
    });
    if (!response.ok) {
      // Do not print response bodies or keys in public workflow logs.
      throw new Error(`HTTP ${response.status}; check project status and API permissions`);
    }
    const result = await response.json();
    if (!Array.isArray(result) || result.length !== 0) {
      throw new Error('Unexpected response from zero-row database query');
    }
    console.log('Supabase database API is reachable. No records retrieved or changed.');
    healthy = true;
    break;
  } catch (error) {
    console.error(`Attempt ${attempt}/3 failed: ${error.message}`);
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
if (!healthy) process.exitCode = 1;
