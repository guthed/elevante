import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioRecorder, RecordingPresets, useAudioRecorderState } from 'expo-audio';
import { fetchProfile, useSession } from '@/lib/auth';
import { createLesson } from '@/lib/lessons';
import { enqueueUpload, flushQueue } from '@/lib/queue';
import { colors, radius, spacing } from '@/lib/theme';

type Params = {
  course_id?: string;
  class_id?: string;
  timeslot_id?: string;
  course_name?: string;
  class_name?: string;
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { session } = useSession();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [phase, setPhase] = useState<'idle' | 'recording' | 'finishing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  const courseName = params.course_name ?? 'Lektion';
  const className = params.class_name ?? '';

  useEffect(() => {
    return () => {
      // Säkerhet: stoppa inspelning om användaren navigerar bort
      if (recorderState.isRecording) {
        recorder.stop().catch(() => undefined);
      }
    };
  }, [recorder, recorderState.isRecording]);

  const handleStart = async () => {
    setError(null);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setPhase('recording');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Kunde inte starta inspelning: ${msg}`);
    }
  };

  const handleStop = async () => {
    if (!session?.user?.id) {
      setError('Ingen användare inloggad');
      return;
    }
    if (!params.course_id || !params.class_id) {
      setError('Saknar kurs- eller klass-ID');
      return;
    }

    setPhase('finishing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setError('Inspelningen kunde inte sparas');
        setPhase('idle');
        return;
      }

      const profile = await fetchProfile(session.user.id);
      if (!profile || !profile.school_id) {
        setError('Profilen saknar skola — kontakta admin');
        setPhase('idle');
        return;
      }

      // Skapa lessons-rad innan upload
      const lessonId = await createLesson({
        schoolId: profile.school_id,
        courseId: params.course_id,
        classId: params.class_id,
        teacherId: profile.id,
        timeslotId: params.timeslot_id ?? null,
        title: courseName,
      });
      if (!lessonId) {
        setError('Kunde inte skapa lektionsrad');
        setPhase('idle');
        return;
      }

      const durationMs = startedAt.current ? Date.now() - startedAt.current : 0;
      await enqueueUpload({
        filePath: uri,
        schoolId: profile.school_id,
        lessonId,
        mimeType: 'audio/mp4',
        durationSeconds: Math.round(durationMs / 1000),
      });

      // Försök ladda upp direkt — om vi är offline ligger den kvar i kön
      const result = await flushQueue();

      Alert.alert(
        'Inspelning klar',
        result.uploaded > 0
          ? 'Lektionen är uppladdad och köar för transkribering.'
          : 'Lektionen är sparad lokalt och laddas upp så fort du har internet.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(app)/'),
          },
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Något gick fel: ${msg}`);
      setPhase('idle');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={phase === 'recording'}>
          <Text
            style={[
              styles.cancel,
              phase === 'recording' ? styles.cancelDisabled : null,
            ]}
          >
            Avbryt
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>{className}</Text>
        <Text style={styles.title}>{courseName}</Text>

        <View style={styles.timerWrap}>
          <Text style={styles.timer}>
            {formatDuration(recorderState.durationMillis ?? 0)}
          </Text>
          {phase === 'recording' ? (
            <View style={styles.liveDot} />
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.buttonWrap}>
          {phase === 'idle' ? (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.recButton,
                pressed ? styles.recButtonPressed : null,
              ]}
            >
              <View style={styles.recButtonInner} />
            </Pressable>
          ) : phase === 'recording' ? (
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.stopButton,
                pressed ? styles.stopButtonPressed : null,
              ]}
            >
              <View style={styles.stopButtonInner} />
            </Pressable>
          ) : (
            <ActivityIndicator color="#FFFFFF" size="large" />
          )}
        </View>

        <Text style={styles.hint}>
          {phase === 'idle'
            ? 'Tryck för att börja'
            : phase === 'recording'
              ? 'Tryck för att stoppa och ladda upp'
              : 'Sparar och laddar upp…'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancel: { color: '#FFFFFF', fontSize: 16 },
  cancelDisabled: { opacity: 0.4 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  timerWrap: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.recordRed,
  },
  error: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonWrap: {
    marginTop: spacing.xl,
  },
  recButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recButtonPressed: { opacity: 0.7 },
  recButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.recordRed,
  },
  stopButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.recordRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonPressed: { opacity: 0.7 },
  stopButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: colors.recordRed,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: spacing.md,
  },
});
