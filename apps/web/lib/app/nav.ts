import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

export type NavId =
  | 'overview'
  | 'library'
  | 'chat'
  | 'examPrep'
  | 'learnerProfile'
  | 'classTests'
  | 'classes'
  | 'lessons'
  | 'sharedTests'
  | 'schools'
  | 'users'
  | 'schedule'
  | 'stats'
  | 'prospects'
  | 'crm';

// `label` = full etikett (sidomeny på laptop).
// `mobileLabel` = kort etikett (bottom-nav på mobil).
// `description` = kort förklaring under rubriken (visas bara i sidomenyn).
export type NavItem = {
  id: NavId;
  href: string;
  label: string;
  mobileLabel: string;
  description: string;
};

// Enda källa för nav-items per roll. Konsumeras av både Sidebar (laptop)
// och MobileNav (mobil). `base` är t.ex. `/sv/app`.
export function navItemsFor(role: Role, base: string, dict: Dictionary): NavItem[] {
  if (role === 'student') {
    const s = dict.app.sidebar.student;
    const m = dict.app.mobileNav.student;
    const d = dict.app.navDescriptions.student;
    return [
      { id: 'overview', href: `${base}/student`, label: s.overview, mobileLabel: m.overview, description: d.overview },
      { id: 'library', href: `${base}/student/bibliotek`, label: s.library, mobileLabel: m.library, description: d.library },
      { id: 'chat', href: `${base}/student/chat`, label: s.chat, mobileLabel: m.chat, description: d.chat },
      { id: 'examPrep', href: `${base}/student/provplugg`, label: s.examPrep, mobileLabel: m.examPrep, description: d.examPrep },
      { id: 'learnerProfile', href: `${base}/student/profil`, label: s.learnerProfile, mobileLabel: m.learnerProfile, description: d.learnerProfile },
      { id: 'classTests', href: `${base}/student/klassprov`, label: s.classTests, mobileLabel: m.classTests, description: d.classTests },
    ];
  }
  if (role === 'teacher') {
    const t = dict.app.sidebar.teacher;
    const m = dict.app.mobileNav.teacher;
    const d = dict.app.navDescriptions.teacher;
    return [
      { id: 'overview', href: `${base}/teacher`, label: t.overview, mobileLabel: m.overview, description: d.overview },
      { id: 'classes', href: `${base}/teacher/klasser`, label: t.classes, mobileLabel: m.classes, description: d.classes },
      { id: 'lessons', href: `${base}/teacher/lektioner`, label: t.lessons, mobileLabel: m.lessons, description: d.lessons },
      { id: 'sharedTests', href: `${base}/teacher/prov`, label: t.sharedTests, mobileLabel: m.sharedTests, description: d.sharedTests },
      { id: 'classTests', href: `${base}/teacher/klassprov`, label: t.classTests, mobileLabel: m.classTests, description: d.classTests },
    ];
  }
  const a = dict.app.sidebar.admin;
  const m = dict.app.mobileNav.admin;
  const d = dict.app.navDescriptions.admin;
  return [
    { id: 'overview', href: `${base}/admin`, label: a.overview, mobileLabel: m.overview, description: d.overview },
    { id: 'schools', href: `${base}/admin/skolor`, label: a.schools, mobileLabel: m.schools, description: d.schools },
    { id: 'users', href: `${base}/admin/anvandare`, label: a.users, mobileLabel: m.users, description: d.users },
    { id: 'schedule', href: `${base}/admin/schema`, label: a.schedule, mobileLabel: m.schedule, description: d.schedule },
    { id: 'stats', href: `${base}/admin/statistik`, label: a.stats, mobileLabel: m.stats, description: d.stats },
    { id: 'prospects', href: `${base}/admin/intresse`, label: a.prospects, mobileLabel: m.prospects, description: d.prospects },
    { id: 'crm', href: `${base}/admin/crm`, label: a.crm, mobileLabel: m.crm, description: d.crm },
  ];
}
