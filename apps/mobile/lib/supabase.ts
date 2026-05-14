import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Supabase-session lagras i SecureStore på riktig enhet (Keychain på iOS,
// Keystore på Android). I Expo Go-fallback eller på web används AsyncStorage.
const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Hellre tydligt fel än mystiskt 401 senare
  // eslint-disable-next-line no-console
  console.warn(
    '[elevante] EXPO_PUBLIC_SUPABASE_URL eller EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY saknas. Kopiera .env.example till .env.',
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
