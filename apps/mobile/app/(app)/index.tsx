import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchProfile, signOut, useSession, type Profile } from '@/lib/auth';
import { getTodayLessons, type UpcomingLesson } from '@/lib/lessons';
import { flushQueue, pendingJobs } from '@/lib/queue';
import { colors, radius, spacing } from '@/lib/theme';

export default function ScheduleScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lessons, setLessons] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const prof = await fetchProfile(session.user.id);
    setProfile(prof);
    if (prof && prof.role === 'teacher') {
      const todayLessons = await getTodayLessons(prof.id);
      setLessons(todayLessons);
    }
    const queue = await pendingJobs();
    setPendingCount(queue.length);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  // Försök tömma upload-kön när skärmen monteras
  useEffect(() => {
    flushQueue().then(({ uploaded }) => {
      if (uploaded > 0) load();
    });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await flushQueue();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleStart = (lesson: UpcomingLesson) => {
    router.push({
      pathname: '/(app)/record',
      params: {
        course_id: lesson.course_id,
        class_id: lesson.class_id,
        timeslot_id: lesson.id,
        course_name: lesson.course_name,
        class_name: lesson.class_name,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (profile && profile.role !== 'teacher') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notTeacher}>
          Den här appen är bara för lärare just nu.
        </Text>
        <Pressable onPress={handleSignOut} style={styles.linkButton}>
          <Text style={styles.linkText}>Logga ut</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Idag</Text>
          <Text style={styles.title}>
            {profile?.full_name ?? profile?.email ?? '—'}
          </Text>
        </View>
        <Pressable onPress={handleSignOut}>
          <Text style={styles.signOut}>Logga ut</Text>
        </Pressable>
      </View>

      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>
            {pendingCount} {pendingCount === 1 ? 'inspelning' : 'inspelningar'} väntar på upload
          </Text>
        </View>
      ) : null}

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Inga lektioner idag</Text>
            <Text style={styles.emptyBody}>
              Schemat är tomt. Be admin lägga till lektioner via webbappen.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleStart(item)}
            style={({ pressed }) => [
              styles.lessonCard,
              pressed ? styles.lessonCardPressed : null,
            ]}
          >
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonTime}>
                {item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}
              </Text>
              <Text style={styles.lessonRoom}>{item.room ?? ''}</Text>
            </View>
            <Text style={styles.lessonTitle}>{item.course_name}</Text>
            <Text style={styles.lessonSubtitle}>
              {item.class_name} · {item.course_code}
            </Text>
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>Tryck för att spela in</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSubtle },
  center: {
    flex: 1,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notTeacher: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  linkButton: { padding: spacing.md },
  linkText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.inkSubtle,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  signOut: { fontSize: 14, color: colors.inkMuted },
  pendingBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
  },
  pendingText: { color: '#92400E', fontSize: 13 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  lessonCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonCardPressed: { borderColor: colors.accent },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  lessonTime: { fontSize: 14, fontWeight: '600', color: colors.accent },
  lessonRoom: { fontSize: 12, color: colors.inkSubtle },
  lessonTitle: { fontSize: 22, fontWeight: '700', color: colors.primary },
  lessonSubtitle: { marginTop: spacing.xs, fontSize: 13, color: colors.inkMuted },
  recBadge: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.recordRed,
  },
  recText: { fontSize: 13, color: colors.inkMuted },
});
