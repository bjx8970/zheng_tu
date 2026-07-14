/**
 * 纪委调查入口页面 —— 重定向至纪检深度玩法
 * 历史路由兼容：home.tsx 中"纪委调查"NavCard 跳转此路由
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function DisciplineInvestigationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(app)/discipline-deep' as never);
  }, [router]);
  return (
    <View style={{ flex: 1, backgroundColor: '#0A1020', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#C8A84B" size="large" />
    </View>
  );
}
