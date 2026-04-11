import { Badge } from '@/components/ui/Badge';
import type { TranscriptStatus } from '@/lib/supabase/database';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  status: TranscriptStatus;
  labels: Dictionary['app']['pages']['teacher']['statuses'];
};

const toneFor: Record<
  TranscriptStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'error'
> = {
  pending: 'neutral',
  processing: 'warning',
  ready: 'success',
  failed: 'error',
};

export function LessonStatusBadge({ status, labels }: Props) {
  return <Badge tone={toneFor[status]}>{labels[status]}</Badge>;
}
