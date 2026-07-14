import { createClient } from '@supabase/supabase-js'
import 'expo-sqlite/localStorage/install';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// 自定义 auth 锁：使用 Promise 链串行所有 auth 操作
// 避免 Web 端 navigator.locks 的 "steal" 行为导致 "Lock ... was released because another request stole it"
const authLocks: Record<string, Promise<unknown>> = {};
const customAuthLock = async <T,>(name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> => {
  const previous = authLocks[name] ?? Promise.resolve();
  const current = previous.then(fn, fn);
  authLocks[name] = current.catch(() => undefined) as Promise<unknown>;
  try {
    return await current;
  } finally {
    if (authLocks[name] === current) {
      delete authLocks[name];
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: false,      // 禁用自动刷新，避免与ctx.tsx中AppState回前台手动refreshSession()竞争锁
    persistSession: true,
    detectSessionInUrl: false,
    lock: customAuthLock,          // 替换默认 navigatorLock，防止 Web 预览下并发锁竞争
  },
})
