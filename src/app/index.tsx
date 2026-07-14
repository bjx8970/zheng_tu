import { Redirect } from 'expo-router';
import { useSession } from '@/ctx';
import { useGame } from '@/ctx/GameContext';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const { session, isLoading: sessionLoading } = useSession();
  const { save, isLoading: gameLoading } = useGame();

  if (sessionLoading || (session && gameLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (save?.needsCharacterCreation) return <Redirect href="/(app)/character-create" />;
  return <Redirect href="/(app)/home" />;
}
