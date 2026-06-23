import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

export type NavId =
  | 'overview'
  | 'library'
  | 'chat'
  | 'examPrep'
  | 'learnerProfile'
  | 'classes'
  | 'lessons'
  | 'sharedTests'
  | 'schools'
  | 'users'
  | 'schedule'
  | 'stats'
  | 'prospects';

export type NavItem = { id: NavId; href: string; label: string };

// Enda källa för nav-items per roll. Konsumeras av både Sidebar (laptop)
// och MobileNav (mobil). `base` är t.ex. `/sv/app`.
export function navItemsFor(role: Role, base: string, dict: Dictionary): NavItem[] {
  if (role === 'student') {
    const s = dict.app.sidebar.student;
    return [
      { id: 'overview', href: `${base}/student`, label: s.overview },
      { id: 'library', href: `${base}/student/bibliotek`, label: s.library },
      { id: 'chat', href: `${base}/student/chat`, label: s.chat },
      { id: 'examPrep', href: `${base}/student/provplugg`, label: s.examPrep },
      { id: 'learnerProfile', href: `${base}/student/profil`, label: s.learnerProfile },
    ];
  }
  if (role === 'teacher') {
    const t = dict.app.sidebar.teacher;
    return [
      { id: 'overview', href: `${base}/teacher`, label: t.overview },
      { id: 'classes', href: `${base}/teacher/klasser`, label: t.classes },
      { id: 'lessons', href: `${base}/teacher/lektioner`, label: t.lessons },
      { id: 'sharedTests', href: `${base}/teacher/prov`, label: t.sharedTests },
    ];
  }
  const a = dict.app.sidebar.admin;
  return [
    { id: 'overview', href: `${base}/admin`, label: a.overview },
    { id: 'schools', href: `${base}/admin/skolor`, label: a.schools },
    { id: 'users', href: `${base}/admin/anvandare`, label: a.users },
    { id: 'schedule', href: `${base}/admin/schema`, label: a.schedule },
    { id: 'stats', href: `${base}/admin/statistik`, label: a.stats },
    { id: 'prospects', href: `${base}/admin/intresse`, label: a.prospects },
  ];
}
