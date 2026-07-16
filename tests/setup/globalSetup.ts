// tests/setup/globalSetup.ts
import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('[E2E] Starting global setup...');
  
  // Start local Supabase if not running
  try {
    execSync('supabase status', { stdio: 'ignore' });
    console.log('[E2E] Supabase already running');
  } catch {
    console.log('[E2E] Starting local Supabase...');
    execSync('supabase start', { stdio: 'inherit' });
  }

  // Run database migrations
  try {
    execSync('supabase db reset --linked=false', { stdio: 'inherit' });
    console.log('[E2E] Database reset complete');
  } catch (e) {
    console.warn('[E2E] Database reset failed:', e);
  }

  // Build app for testing
  try {
    execSync('npx expo export --platform ios --output-dir dist/ios', { stdio: 'inherit' });
    console.log('[E2E] iOS build complete');
  } catch (e) {
    console.warn('[E2E] iOS build failed:', e);
  }
}