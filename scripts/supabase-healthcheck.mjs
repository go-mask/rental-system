import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(
  await readFile(new URL('../supabase-config.js', import.meta.url), 'utf8'),
  context,
  { timeout: 1000 },
);
const { url, anonKey } = context.window.RENTAL_SUPABASE_CONFIG;
const endpoint = new URL('/rest/v1/rpc/is_org_member', url);
const headers = { apikey: anonKey, Accept: 'application/json' };
if (anonKey?.startsWith('eyJ')) headers.Authorization = `Bearer ${anonKey}`;
if (endpoint.protocol !== 'https:' || !anonKey) {
  throw new Error('Supabase HTTPS URL and public API key are required.');
}
// This stable, read-only function checks auth.uid(); an unauthenticated
// request with the nil organization UUID must return false, never records.
endpoint.searchParams.set('target_org', '00000000-0000-0000-0000-000000000000');

let healthy = false;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
    });
    if (!response.ok) {
      // Do not print response bodies or keys in public workflow logs.
      const failure = await response.json().catch(() => ({}));
      const code = /^[A-Z0-9]{5,12}$/.test(failure.code || '') ? ` (${failure.code})` : '';
      throw new Error(`HTTP ${response.status}${code}; check project status and API permissions`);
    }
    const result = await response.json();
    if (result !== false) {
      throw new Error('Unexpected response from unauthenticated membership check');
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
