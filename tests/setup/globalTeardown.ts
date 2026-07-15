// tests/setup/globalTeardown.ts
import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('[E2E] Starting global teardown...');
  
  // Stop local Supabase
  try {
    execSync('supabase stop', { stdio: 'ignore' });
    console.log('[E2E] Supabase stopped');
  } catch {
    // Ignore
  }

  console.log('[E2E] Global teardown complete');
}