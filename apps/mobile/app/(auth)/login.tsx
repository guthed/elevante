import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithPassword } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Fyll i e-post och lösenord');
      return;
    }
    setPending(true);
    setError(null);
    const { error: authError } = await signInWithPassword(email.trim(), password);
    setPending(false);
    if (authError) {
      setError(
        authError.message.toLowerCase().includes('invalid')
          ? 'Fel e-post eller lösenord.'
          : 'Något gick fel. Försök igen.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>Elevante</Text>
          <Text style={styles.title}>Logga in</Text>
          <Text style={styles.subtitle}>
            För lärare som spelar in lektioner.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-post</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="du@skolan.se"
              placeholderTextColor={colors.inkSubtle}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Lösenord</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={pending}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
              pending ? styles.buttonDisabled : null,
            ]}
          >
            {pending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Logga in</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSubtle },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 1.5,
  },
  brand: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  title: {
    marginTop: spacing.xxl,
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: colors.inkMuted,
  },
  field: { marginTop: spacing.lg },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.primary,
  },
  error: {
    marginTop: spacing.md,
    color: colors.error,
    fontSize: 14,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonPressed: { backgroundColor: colors.accent600 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
