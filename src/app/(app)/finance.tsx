/**
 * 城市财政 → 已合并至行政线专项经费
 * 本页面仅作跳转桥接，保留路由路径避免旧链接404
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function FinanceRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(app)/city-gov-fund' as never);
  }, [router]);
  return null;
}
