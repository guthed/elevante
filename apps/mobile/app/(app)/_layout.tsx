import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.bgSubtle },
      }}
    />
  );
}
