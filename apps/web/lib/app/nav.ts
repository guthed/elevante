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

// `label` = full etikett (sidomeny på laptop).
// `mobileLabel` = kort etikett (bottom-nav på mobil).
export type NavItem = { id: NavId; href: string; label: string; mobileLabel: string };

// Enda källa för nav-items per roll. Konsumeras av både Sidebar (laptop)
// och MobileNav (mobil). `base` är t.ex. `/sv/app`.
export function navItemsFor(role: Role, base: string, dict: Dictionary): NavItem[] {
  if (role === 'student') {
    const s = dict.app.sidebar.student;
    const m = dict.app.mobileNav.student;
    return [
      { id: 'overview', href: `${base}/student`, label: s.overview, mobileLabel: m.overview },
      { id: 'library', href: `${base}/student/bibliotek`, label: s.library, mobileLabel: m.library },
      { id: 'chat', href: `${base}/student/chat`, label: s.chat, mobileLabel: m.chat },
      { id: 'examPrep', href: `${base}/student/provplugg`, label: s.examPrep, mobileLabel: m.examPrep },
      { id: 'learnerProfile', href: `${base}/student/profil`, label: s.learnerProfile, mobileLabel: m.learnerProfile },
    ];
  }
  if (role === 'teacher') {
    const t = dict.app.sidebar.teacher;
    const m = dict.app.mobileNav.teacher;
    return [
      { id: 'overview', href: `${base}/teacher`, label: t.overview, mobileLabel: m.overview },
      { id: 'classes', href: `${base}/teacher/klasser`, label: t.classes, mobileLabel: m.classes },
      { id: 'lessons', href: `${base}/teacher/lektioner`, label: t.lessons, mobileLabel: m.lessons },
      { id: 'sharedTests', href: `${base}/teacher/prov`, label: t.sharedTests, mobileLabel: m.sharedTests },
    ];
  }
  const a = dict.app.sidebar.admin;
  const m = dict.app.mobileNav.admin;
  return [
    { id: 'overview', href: `${base}/admin`, label: a.overview, mobileLabel: m.overview },
    { id: 'schools', href: `${base}/admin/skolor`, label: a.schools, mobileLabel: m.schools },
    { id: 'users', href: `${base}/admin/anvandare`, label: a.users, mobileLabel: m.users },
    { id: 'schedule', href: `${base}/admin/schema`, label: a.schedule, mobileLabel: m.schedule },
    { id: 'stats', href: `${base}/admin/statistik`, label: a.stats, mobileLabel: m.stats },
    { id: 'prospects', href: `${base}/admin/intresse`, label: a.prospects, mobileLabel: m.prospects },
  ];
}
