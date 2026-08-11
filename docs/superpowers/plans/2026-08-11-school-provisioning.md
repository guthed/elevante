# Skol-provisionering (admin-invite, klasser/kurser, lärar- och elevtilldelning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersätt dagens manuella SQL-seedning av skolor/admins/klasser/kurser/lärare/elever med riktiga in-app-flöden: Elevante bjuder in en skolas första admin via e-post, den admin skapar klasser och kurser, bjuder in lärare och kopplar dem till kurser, och importerar elever i bulk via CSV med klasstilldelning.

**Architecture:** Fyra sekventiella faser ovanpå det redan befintliga schemat (`schools → classes/courses → class_members/course_teachers → profiles`), som redan har korrekt skol-scopad RLS för klasser/kurser/kopplingstabeller. Inbjudningar går via Supabase Auth Admin API (`inviteUserByEmail`, service-role, server-only) och en uppdaterad `handle_new_auth_user`-trigger som läser roll + skola ur inbjudningsmetadata. All ny skrivlogik är Next.js Server Actions med Zod-validering, samma mönster som `updateUserRole`/`createSchool` i `apps/web/app/actions/admin.ts`.

**Tech Stack:** Next.js 16 Server Actions, Supabase (Postgres + RLS + Auth Admin API), Zod, `@supabase/ssr` + service-role-klient, befintlig `lib/csv.ts`-parser, i18n-ordbok (`sv.ts`/`en.ts`).

**Viktig avvikelse från mallen:** Det finns ingen testrunner i det här repot (`apps/web/package.json` har varken vitest, jest eller test-scripts — verifierat under research). "TDD-stegen" i varje uppgift är därför ersatta med detta repots faktiska verifieringsmönster: `pnpm --filter @elevante/web typecheck`, `pnpm --filter @elevante/web lint`, och manuell click-through i webbläsaren mot en riktig (eller lokal) Supabase-instans — exakt så som alla tidigare faser i `CLAUDE.md`s Fasminne har verifierats.

**Två saker upptäckta under research som denna plan fixar i förbifarten (de blockerar annars fas 1):**
1. `createSchool` ([app/actions/admin.ts:53](../../../apps/web/app/actions/admin.ts)) kör mot den vanliga, cookie-bundna Supabase-klienten. RLS-policyn `schools_admin_all` kräver `id = current_school_id()` — men en helt ny skola har ett fräscht `gen_random_uuid()` som aldrig kan vara lika med den anropande adminens egen `school_id`. Med andra ord: **ingen admin kan idag faktiskt skapa en ny skola genom UI:t**, RLS blockerar tyst insert. Måste köras via service-role-klienten (appens `profile.role === 'admin'`-koll är fortfarande grinden).
2. `getAdminSchools` ([lib/data/admin.ts](../../../apps/web/lib/data/admin.ts)) har samma problem fast för läsning: RLS-policyn `schools_select_same_school` begränsar till `id = current_school_id()`, så frågan kan aldrig returnera fler än den anropande adminens egen skola — trots att sidans rubrik säger "Översikt över skolor i Elevante" (alla skolor). Måste också gå via service-role-klienten.

---

## Fil-struktur

**Nya filer:**
- `supabase/migrations/20260811120000_school_provisioning.sql` — trigger-uppdatering
- `apps/web/lib/admin/invite-user.ts` — delad inbjudningskärna (service-role, `inviteUserByEmail`)
- `apps/web/app/[locale]/app/[role]/anvandare/InviteUserForm.tsx`
- `apps/web/app/[locale]/app/[role]/anvandare/ImportStudentsForm.tsx`
- `apps/web/app/[locale]/app/[role]/skolor/BootstrapAdminForm.tsx`
- `apps/web/app/[locale]/app/[role]/klasser/AdminClassesView.tsx`
- `apps/web/app/[locale]/app/[role]/kurser/page.tsx`
- `apps/web/app/[locale]/app/[role]/kurser/AdminCoursesView.tsx`

**Ändrade filer:**
- `apps/web/app/actions/admin.ts` — fixar `createSchool`, lägger till `inviteUser`, `createClass`, `deleteClass`, `createCourse`, `deleteCourse`, `assignTeacherToCourse`, `removeTeacherFromCourse`, `importStudents`
- `apps/web/lib/data/admin.ts` — fixar `getAdminSchools` (+ `adminCount`), lägger till `getAdminClasses`, `getAdminCourses`, `getSchoolTeachers`
- `apps/web/app/[locale]/app/[role]/anvandare/page.tsx` — monterar `InviteUserForm` + `ImportStudentsForm`
- `apps/web/app/[locale]/app/[role]/skolor/page.tsx` — monterar `BootstrapAdminForm` per skola utan admin
- `apps/web/app/[locale]/app/[role]/klasser/page.tsx` — grenar på `role === 'admin'`
- `apps/web/lib/app/nav.ts` — nya nav-poster `classes` (`/admin/klasser`) och `courses` (`/admin/kurser`)
- `apps/web/lib/i18n/types.ts` — nya `Dictionary`-fält
- `apps/web/lib/i18n/locales/sv.ts` + `en.ts` — nya etiketter

---

## Fas 1 — Elevante bjuder in skolans första admin

**Mål:** En skola kan skapas och få en riktig, inloggningsbar admin utan manuell SQL. Bygger den återanvändbara inbjudningsmekanismen som fas 3 och 4 sedan återanvänder.

### Task 1: Fixa RLS-blockerad skol-läsning/skrivning i `/admin/skolor`

**Files:**
- Modify: `apps/web/app/actions/admin.ts:53-87` (`createSchool`)
- Modify: `apps/web/lib/data/admin.ts` (`getAdminSchools`, ~rad 95-111)

- [ ] **Step 1: Byt klient i `createSchool`**

I `apps/web/app/actions/admin.ts`, lägg till importen och byt klient:

```ts
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
```

Ändra i `createSchool`:

```ts
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from('schools').insert({
    name,
    slug,
    country: country.slice(0, 2),
  });
```

(Ta bort `await createSupabaseServerClient()`-raden för schools-inserten — resten av funktionen är oförändrad.)

- [ ] **Step 2: Utöka `getAdminSchools` med `adminCount` och service-role**

I `apps/web/lib/data/admin.ts`, ersätt hela `AdminSchoolRow`-typen och `getAdminSchools`:

```ts
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type AdminSchoolRow = {
  id: string;
  name: string;
  slug: string;
  country: string;
  created_at: string;
  adminCount: number;
};

export async function getAdminSchools(): Promise<AdminSchoolRow[]> {
  const supabase = createSupabaseServiceRoleClient();
  const [schoolsRes, adminsRes] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, slug, country, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('school_id').eq('role', 'admin'),
  ]);

  const adminCounts = new Map<string, number>();
  for (const row of adminsRes.data ?? []) {
    if (!row.school_id) continue;
    adminCounts.set(row.school_id, (adminCounts.get(row.school_id) ?? 0) + 1);
  }

  return (schoolsRes.data ?? []).map((s) => ({
    ...s,
    adminCount: adminCounts.get(s.id) ?? 0,
  }));
}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

Förväntat: inga fel. `getAdminSchools` anropas i dag bara från `apps/web/app/[locale]/app/[role]/skolor/page.tsx` med samma retur-shape (bara utökad, inga fält borttagna), så typechecken ska gå igenom utan följdändringar där ännu.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/admin.ts apps/web/lib/data/admin.ts
git commit -m "fix(admin): kör skol-skapande och skol-listning via service-role

RLS på schools kräver id = current_school_id(), vilket gör att en ny
skola (fräscht uuid) aldrig kan skapas eller listas tvärs skolor via
den vanliga klienten. /admin/skolor är en Elevante-intern vy över
alla skolor, inte en per-skola-vy — det är rätt att gå runt RLS här."
```

---

### Task 1b: `is_staff`-flagga — stäng cross-tenant-läckan i /admin/skolor, /admin/crm, /admin/intresse

**Tillagd efter code review av Task 1.** Reviewern flaggade att `/admin/skolor` (nu med service-role, Task 1), `/admin/crm` och `/admin/intresse` bara gatas på `profile.role === 'admin'` — det finns ingen separat "Elevante-personal"-roll i datamodellen. Innan Task 1 skyddade RLS av misstag `/admin/skolor` mot andra skolor, men det skyddet är nu borta (medvetet, service-role krävs för att sidan ska fungera alls). `/admin/crm` och `/admin/intresse` har aldrig haft RLS-skydd eftersom de inte är skol-scopade tabeller. Så fort Task 7 bjuder in en riktig admin åt en kundskola (t.ex. Amerikanska Gymnasiet) skulle den adminen se alla tre sidorna i sin sidomeny och kunna bläddra andra skolors namn/slug/land/admin-antal, skapa nya skolor, och se Elevantes hela sälj-CRM. Detta måste stängas innan Task 7 körs.

**Files:**
- Create: `supabase/migrations/20260811130000_admin_staff_flag.sql`
- Modify: `apps/web/lib/supabase/database.ts` (`Profile`, `ProfileInsert`)
- Modify: `apps/web/lib/supabase/server.ts` (`getCurrentProfile`)
- Modify: `apps/web/app/actions/admin.ts` (`createSchool`-guarden)
- Modify: `apps/web/app/actions/crm.ts` (`requireAdmin`)
- Modify: `apps/web/app/[locale]/app/[role]/skolor/page.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/crm/page.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/intresse/page.tsx`
- Modify: `apps/web/lib/app/nav.ts`
- Modify: `apps/web/components/app/Sidebar.tsx`, `apps/web/components/app/MobileNav.tsx`, `apps/web/components/app/AppShell.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/layout.tsx`

- [ ] **Step 1: Migration**

```sql
alter table public.profiles
  add column if not exists is_staff boolean not null default false;

comment on column public.profiles.is_staff is
  'Elevante-personal (inte en kunds egen admin). Gate:ar /admin/skolor, /admin/crm, /admin/intresse och bootstrap av en ny skolas första admin.';
```

Applicera mot prod på samma sätt (och med samma försiktighet) som Task 2:s migration — se den uppgiftens Step 2 för tillvägagångssätt. Kör därefter manuellt, för varje känt Elevante-konto (loggade i Notion "Nycklar"):

```sql
update public.profiles set is_staff = true where email = 'din-elevante-epost@exempel.se';
```

- [ ] **Step 2: Utöka typerna i `database.ts`**

I `Profile`, lägg till `is_staff: boolean;` (efter `updated_at`). I `ProfileInsert`, lägg till `is_staff?: boolean;`.

- [ ] **Step 3: `getCurrentProfile` läser `is_staff`**

I `apps/web/lib/supabase/server.ts`, ändra select-raden i `getCurrentProfile`:

```ts
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, school_id, full_name, email, is_staff')
      .eq('id', user.id)
      .maybeSingle();
```

- [ ] **Step 4: Gata Server Actions**

I `apps/web/app/actions/admin.ts`, i `createSchool`, ändra guarden:

```ts
  if (!profile || profile.role !== 'admin' || !profile.is_staff) {
    return { status: 'error', code: 'unauthorized' };
  }
```

I `apps/web/app/actions/crm.ts`, ändra `requireAdmin`:

```ts
async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.is_staff) throw new Error('Ej behörig');
}
```

- [ ] **Step 5: Gata sidorna**

I `skolor/page.tsx`, `crm/page.tsx`, `intresse/page.tsx`, ändra respektive guard-rad (`if (!profile || profile.role !== 'admin') redirect(...)`) till att även kräva `!profile.is_staff`:

```ts
  if (!profile || profile.role !== 'admin' || !profile.is_staff) redirect(`/${locale}/app`);
```

- [ ] **Step 6: Dölj nav-länkarna för icke-staff**

I `apps/web/lib/app/nav.ts`, lägg till en fjärde parameter till `navItemsFor`:

```ts
export function navItemsFor(role: Role, base: string, dict: Dictionary, isStaff: boolean): NavItem[] {
```

I admin-grenen, filtrera bort `schools`, `crm` och `prospects` när `!isStaff`:

```ts
  const a = dict.app.sidebar.admin;
  const m = dict.app.mobileNav.admin;
  const d = dict.app.navDescriptions.admin;
  const items: NavItem[] = [
    { id: 'overview', href: `${base}/admin`, label: a.overview, mobileLabel: m.overview, description: d.overview },
    { id: 'schools', href: `${base}/admin/skolor`, label: a.schools, mobileLabel: m.schools, description: d.schools },
    { id: 'users', href: `${base}/admin/anvandare`, label: a.users, mobileLabel: m.users, description: d.users },
    { id: 'schedule', href: `${base}/admin/schema`, label: a.schedule, mobileLabel: m.schedule, description: d.schedule },
    { id: 'stats', href: `${base}/admin/statistik`, label: a.stats, mobileLabel: m.stats, description: d.stats },
    { id: 'prospects', href: `${base}/admin/intresse`, label: a.prospects, mobileLabel: m.prospects, description: d.prospects },
    { id: 'crm', href: `${base}/admin/crm`, label: a.crm, mobileLabel: m.crm, description: d.crm },
  ];
  const staffOnly: NavId[] = ['schools', 'prospects', 'crm'];
  return isStaff ? items : items.filter((item) => !staffOnly.includes(item.id));
```

- [ ] **Step 7: Trä igenom `isStaff` från layout till nav**

I `apps/web/app/[locale]/app/[role]/layout.tsx`, skicka med `isStaff={profile.is_staff}` till `<AppShell>`.

I `apps/web/components/app/AppShell.tsx`, lägg till `isStaff: boolean;` i `Props`, och skicka vidare till `<Sidebar>` och `<Topbar>` (Topbar kan strunta i den om den inte renderar nav-items — kolla filen; om den bara visar användarmeny kan parametern hoppas över där).

I `apps/web/components/app/Sidebar.tsx` och `apps/web/components/app/MobileNav.tsx`, lägg till `isStaff: boolean;` i `Props` och skicka med som fjärde argument till `navItemsFor(role, base, dict, isStaff)`.

- [ ] **Step 8: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 9: Manuell verifiering**

Logga in som ett vanligt (icke-staff) admin-konto. Bekräfta att "Skolor", "CRM" och "Intresse" är borta ur både sidomeny och mobilnav, och att direktnavigering till `/admin/skolor`, `/admin/crm`, `/admin/intresse` redirectar bort. Sätt sedan `is_staff = true` på ditt eget testkonto, ladda om, bekräfta att länkarna är tillbaka och sidorna fungerar som innan.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260811130000_admin_staff_flag.sql apps/web/lib/supabase/database.ts apps/web/lib/supabase/server.ts apps/web/app/actions/admin.ts apps/web/app/actions/crm.ts apps/web/app/[locale]/app/[role]/skolor/page.tsx apps/web/app/[locale]/app/[role]/crm/page.tsx apps/web/app/[locale]/app/[role]/intresse/page.tsx apps/web/lib/app/nav.ts apps/web/components/app/Sidebar.tsx apps/web/components/app/MobileNav.tsx apps/web/components/app/AppShell.tsx apps/web/app/[locale]/app/[role]/layout.tsx
git commit -m "fix(admin): inför is_staff och stäng cross-tenant-läckan i /admin/skolor, /admin/crm, /admin/intresse

Task 1s service-role-fix tog bort ett RLS-skydd som av misstag höll
cross-tenant-läsning nere. Det fanns aldrig ett verkligt gate — bara
role='admin', som en framtida kunds egen admin också har. Utan detta
skulle Task 7:s admin-inbjudan ge kundens admin insyn i alla andra
skolor plus Elevantes sälj-CRM."
```

---

**Not till Task 4 nedan:** bootstrap-grenen i `inviteUser` (`allowed = (count ?? 0) === 0 && role === 'admin'` när `!isOwnSchool`) måste även kräva `profile.is_staff` — annars kan en kunds egen admin bootstrap:a admin åt VILKEN skola som helst utan admin sedan tidigare. Task 4:s implementerare ska lägga till det villkoret; se uppdaterad kod i Task 4 nedan.

---

### Task 2: Trigger-migration — läs roll + skola från inbjudningsmetadata

**Files:**
- Create: `supabase/migrations/20260811120000_school_provisioning.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Utökar handle_new_auth_user() så att inbjudna användare (via
-- auth.admin.inviteUserByEmail med data: {role, school_id, full_name})
-- får rätt roll och skola direkt, istället för att alltid landa som
-- role='student', school_id=null. Självregistrering (signUp utan
-- metadata) fortsätter fungera precis som idag via fallbacken.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_school_id uuid;
begin
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := null;
  end;
  if v_role is null then
    v_role := 'student';
  end if;

  begin
    v_school_id := (new.raw_user_meta_data ->> 'school_id')::uuid;
  exception when others then
    v_school_id := null;
  end;
  if v_school_id is not null and not exists (
    select 1 from public.schools where id = v_school_id
  ) then
    v_school_id := null;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role,
    v_school_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
```

- [ ] **Step 2: Applicera migrationen mot prod-projektet**

Detta projekt kör dedikerat Supabase (`msqfuywpbrteyrzjggsw`, eu-central-2). Applicera via Supabase MCP (`apply_migration`) eller `supabase db push` beroende på vilket verktyg som är auktoriserat i din session. Verifiera efteråt:

```sql
select prosrc from pg_proc where proname = 'handle_new_auth_user';
```

Förväntat: funktionskroppen innehåller `v_role` och `v_school_id`.

- [ ] **Step 3: Manuell verifiering av gamla flödet (självregistrering)**

Gå till `/sv/signup` i dev, skapa ett testkonto utan att gå via en admin-inbjudan. Kontrollera i Supabase Table Editor att `profiles`-raden fick `role='student'`, `school_id=null` — precis som innan migrationen. Detta bekräftar att fallbacken fungerar och att befintliga flöden inte gått sönder.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260811120000_school_provisioning.sql
git commit -m "feat(db): läs roll och skola från inbjudningsmetadata i auth-triggern

Förbereder inviteUserByEmail-flödet i nästa steg — utan detta landar
alla inbjudna användare som role=student, school_id=null oavsett vad
inbjudan avsåg."
```

---

### Task 3: Delad inbjudningskärna

**Files:**
- Create: `apps/web/lib/admin/invite-user.ts`

- [ ] **Step 1: Skriv filen**

```ts
import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import type { UserRole } from '@/lib/supabase/database';
import type { Locale } from '@/lib/i18n/config';

export type InviteUserInput = {
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  locale: Locale;
};

export type InviteUserResult =
  | { ok: true; userId: string }
  | { ok: false; code: 'already-exists' | 'generic'; detail?: string };

// Delad av inviteUser (app/actions/admin.ts, en-och-en) och
// importStudents (bulk via CSV) — båda ska skapa kontot på samma sätt.
export async function inviteUserCore(
  input: InviteUserInput,
): Promise<InviteUserResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    data: {
      full_name: input.fullName,
      role: input.role,
      school_id: input.schoolId,
    },
    redirectTo: `${siteUrl}/api/auth/callback?next=/${input.locale}/app/${input.role}/konto`,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return { ok: false, code: 'already-exists' };
    }
    return { ok: false, code: 'generic', detail: error.message };
  }
  if (!data.user) {
    return { ok: false, code: 'generic', detail: 'Inget user-objekt returnerades' };
  }
  return { ok: true, userId: data.user.id };
}
```

- [ ] **Step 2: Verifiera typer**

```bash
pnpm --filter @elevante/web typecheck
```

Förväntat: inga fel (filen används inte av något ännu, men ska stå på egna ben typmässigt).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/invite-user.ts
git commit -m "feat(admin): delad inbjudningskärna via Supabase Auth Admin API"
```

---

### Task 4: `inviteUser` Server Action

**Files:**
- Modify: `apps/web/app/actions/admin.ts`

- [ ] **Step 1: Lägg till imports i filens befintliga import-block**

Lägg till högst upp bland de befintliga `import`-raderna i `apps/web/app/actions/admin.ts` (inte längst ner i filen — bara funktionen i nästa steg går dit):

```ts
import { z } from 'zod';
import { inviteUserCore } from '@/lib/admin/invite-user';
import type { Locale } from '@/lib/i18n/config';
```

- [ ] **Step 2: Lägg till `inviteUser`-action längst ner i filen**

```ts
const inviteUserSchema = z.object({
  email: z.string().trim().email().max(200),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(['student', 'teacher', 'admin']),
  schoolId: z.string().uuid(),
});

export type InviteUserState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | {
      status: 'error';
      code: 'unauthorized' | 'invalid' | 'already-exists' | 'generic';
      detail?: string;
    };

export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('full_name'),
    role: formData.get('role'),
    schoolId: formData.get('school_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { email, fullName, role, schoolId } = parsed.data;
  const locale = (formData.get('locale') ?? 'sv').toString() as Locale;

  const isOwnSchool = profile.school_id === schoolId;
  let allowed = isOwnSchool;

  if (!isOwnSchool) {
    // Bootstrap: en skola utan admin ännu får sin första admin av
    // valfri befintlig Elevante-STAFF-admin (samma grind som
    // createSchool efter Task 1b — inte "vilken admin som helst",
    // annars kan en kunds egen admin bootstrap:a admin åt andra skolor).
    if (!profile.is_staff) {
      return { status: 'error', code: 'unauthorized' };
    }
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'admin');
    allowed = (count ?? 0) === 0 && role === 'admin';
  }

  if (!allowed) {
    return { status: 'error', code: 'unauthorized' };
  }

  const result = await inviteUserCore({ email, fullName, role, schoolId, locale });
  if (!result.ok) {
    return { status: 'error', code: result.code, detail: result.detail };
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/skolor');
  revalidatePath('/en/app/admin/skolor');
  return { status: 'success', email };
}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/admin.ts
git commit -m "feat(admin): inviteUser Server Action

Täcker både self-service (admin bjuder in i egen skola) och bootstrap
(valfri admin bjuder in en ny skolas första admin, bara om skolan
saknar admin sedan tidigare)."
```

---

### Task 5: i18n-etiketter för inbjudan

**Files:**
- Modify: `apps/web/lib/i18n/types.ts`
- Modify: `apps/web/lib/i18n/locales/sv.ts`
- Modify: `apps/web/lib/i18n/locales/en.ts`

- [ ] **Step 1: Utöka `Dictionary`-typen**

I `apps/web/lib/i18n/types.ts`, inuti `pages.admin.users` (efter `updateError: string;`), lägg till:

```ts
          invite: {
            heading: string;
            nameLabel: string;
            emailLabel: string;
            roleLabel: string;
            roleStudent: string;
            roleTeacher: string;
            roleAdmin: string;
            submit: string;
            sending: string;
            success: string;
            errorExists: string;
            errorGeneric: string;
          };
          import: {
            heading: string;
            fileLabel: string;
            fileHint: string;
            submit: string;
            importing: string;
            successCount: string;
            errorGeneric: string;
          };
```

Inuti `pages.admin.schools` (efter `createdLabel: string;`), lägg till:

```ts
          bootstrapAdmin: {
            heading: string;
            nameLabel: string;
            emailLabel: string;
            submit: string;
            sending: string;
            success: string;
            errorExists: string;
            errorGeneric: string;
          };
```

- [ ] **Step 2: Fyll i svenska**

I `apps/web/lib/i18n/locales/sv.ts`, inuti `admin.users` (efter `updateError: 'Kunde inte uppdatera rollen.',`):

```ts
          invite: {
            heading: 'Bjud in användare',
            nameLabel: 'Namn',
            emailLabel: 'E-post',
            roleLabel: 'Roll',
            roleStudent: 'Elev',
            roleTeacher: 'Lärare',
            roleAdmin: 'Administratör',
            submit: 'Skicka inbjudan',
            sending: 'Skickar…',
            success: 'Inbjudan skickad till {email}.',
            errorExists: 'Det finns redan ett konto med den e-postadressen.',
            errorGeneric: 'Kunde inte skicka inbjudan.',
          },
          import: {
            heading: 'Importera elever',
            fileLabel: 'CSV-fil',
            fileHint: 'Rubriker: full_name, email, class_name. Max 200 rader.',
            submit: 'Importera',
            importing: 'Importerar…',
            successCount: '{count} elever inbjudna.',
            errorGeneric: 'Något gick fel vid importen.',
          },
```

Inuti `admin.schools` (efter `createdLabel: 'Skapad',`):

```ts
          bootstrapAdmin: {
            heading: 'Bjud in första admin',
            nameLabel: 'Namn',
            emailLabel: 'E-post',
            submit: 'Bjud in',
            sending: 'Skickar…',
            success: 'Inbjudan skickad till {email}.',
            errorExists: 'Det finns redan ett konto med den e-postadressen.',
            errorGeneric: 'Kunde inte skicka inbjudan.',
          },
```

- [ ] **Step 3: Fyll i engelska**

I `apps/web/lib/i18n/locales/en.ts`, hitta motsvarande `admin.users`- och `admin.schools`-block (samma struktur som sv.ts) och lägg till analogt:

```ts
          invite: {
            heading: 'Invite user',
            nameLabel: 'Name',
            emailLabel: 'Email',
            roleLabel: 'Role',
            roleStudent: 'Student',
            roleTeacher: 'Teacher',
            roleAdmin: 'Admin',
            submit: 'Send invite',
            sending: 'Sending…',
            success: 'Invite sent to {email}.',
            errorExists: 'An account with that email already exists.',
            errorGeneric: 'Could not send the invite.',
          },
          import: {
            heading: 'Import students',
            fileLabel: 'CSV file',
            fileHint: 'Headers: full_name, email, class_name. Max 200 rows.',
            submit: 'Import',
            importing: 'Importing…',
            successCount: '{count} students invited.',
            errorGeneric: 'Something went wrong during import.',
          },
```

```ts
          bootstrapAdmin: {
            heading: 'Invite first admin',
            nameLabel: 'Name',
            emailLabel: 'Email',
            submit: 'Invite',
            sending: 'Sending…',
            success: 'Invite sent to {email}.',
            errorExists: 'An account with that email already exists.',
            errorGeneric: 'Could not send the invite.',
          },
```

- [ ] **Step 4: Verifiera typer**

```bash
pnpm --filter @elevante/web typecheck
```

Förväntat: inga fel. Om `en.ts` saknar något fält kastar TypeScript ett strukturellt fel mot `Dictionary`-typen — det är avsiktligt, det är så den här kodbasen garanterar att inga strängar hårdkodas eller glöms i en locale.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/i18n/types.ts apps/web/lib/i18n/locales/sv.ts apps/web/lib/i18n/locales/en.ts
git commit -m "feat(i18n): etiketter för inbjudan, elevimport och bootstrap-admin"
```

---

### Task 6: Montera `InviteUserForm` på `/admin/anvandare`

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/anvandare/InviteUserForm.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/anvandare/page.tsx`

- [ ] **Step 1: Skriv `InviteUserForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { inviteUser, type InviteUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  schoolId: string;
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['users']['invite'];
};

const initialState: InviteUserState = { status: 'idle' };

export function InviteUserForm({ schoolId, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="locale" value={locale} />
      <Field id="invite-name" label={labels.nameLabel}>
        <Input id="invite-name" name="full_name" type="text" required />
      </Field>
      <Field id="invite-email" label={labels.emailLabel}>
        <Input id="invite-email" name="email" type="email" required />
      </Field>
      <Field id="invite-role" label={labels.roleLabel}>
        <Select id="invite-role" name="role" defaultValue="student">
          <option value="student">{labels.roleStudent}</option>
          <option value="teacher">{labels.roleTeacher}</option>
          <option value="admin">{labels.roleAdmin}</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? labels.sending : labels.submit}
      </Button>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)] sm:col-span-4">
          {labels.success.replace('{email}', state.email)}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)] sm:col-span-4">
          {state.code === 'already-exists' ? labels.errorExists : labels.errorGeneric}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 2: Montera i `page.tsx`**

I `apps/web/app/[locale]/app/[role]/anvandare/page.tsx`:

Lägg till importen:

```ts
import { InviteUserForm } from './InviteUserForm';
```

Lägg till skol-guarden direkt efter den befintliga `if (!profile || profile.role !== 'admin')`-raden:

```ts
  if (!profile.school_id) redirect(`/${locale}/app`);
```

Lägg till formuläret i JSX, direkt under `</header>` och före sök-formuläret:

```tsx
      <section className="mt-8 rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6">
        <h2 className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
          {labels.invite.heading}
        </h2>
        <div className="mt-4">
          <InviteUserForm
            schoolId={profile.school_id}
            locale={locale}
            labels={labels.invite}
          />
        </div>
      </section>
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Manuell verifiering**

Starta dev-servern, logga in som en admin-demo, gå till `/sv/app/admin/anvandare`. Bjud in en testadress (t.ex. en egen `+test`-alias-adress) som lärare. Kontrollera:
- Formuläret visar success-meddelandet med rätt e-post.
- I Supabase Table Editor: en ny rad i `profiles` med rätt `role='teacher'` och `school_id` satt till din testskola.
- Testa att bjuda in samma e-post igen → ska ge `errorExists`.
- Logga in som admin i en *annan* skola (om du har en sådan demo-inloggning) och försök POST:a `inviteUser` med den första skolans `school_id` (t.ex. via formuläret om du manipulerar `school_id`-fältet i devtools) → ska ge `unauthorized` eftersom skolan redan har en admin.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/anvandare/InviteUserForm.tsx apps/web/app/[locale]/app/[role]/anvandare/page.tsx
git commit -m "feat(admin): bjud in användare direkt från /admin/anvandare"
```

---

### Task 7: Montera `BootstrapAdminForm` på `/admin/skolor`

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/skolor/BootstrapAdminForm.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/skolor/page.tsx`

- [ ] **Step 1: Skriv `BootstrapAdminForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { inviteUser, type InviteUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  schoolId: string;
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['schools']['bootstrapAdmin'];
};

const initialState: InviteUserState = { status: 'idle' };

export function BootstrapAdminForm({ schoolId, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  if (state.status === 'success') {
    return (
      <p role="status" className="text-sm text-[var(--color-success)]">
        {labels.success.replace('{email}', state.email)}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="role" value="admin" />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm font-medium text-[var(--color-primary)]">{labels.heading}</p>
      <Field id={`bootstrap-name-${schoolId}`} label={labels.nameLabel}>
        <Input id={`bootstrap-name-${schoolId}`} name="full_name" type="text" required />
      </Field>
      <Field id={`bootstrap-email-${schoolId}`} label={labels.emailLabel}>
        <Input id={`bootstrap-email-${schoolId}`} name="email" type="email" required />
      </Field>
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'already-exists' ? labels.errorExists : labels.errorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Montera i `skolor/page.tsx`**

Lägg till importen:

```ts
import { BootstrapAdminForm } from './BootstrapAdminForm';
```

I `.map((school) => ...)`-blocket, lägg till formuläret sist i `<CardBody>`, efter den befintliga `<div className="flex items-start justify-between gap-4">...</div>`:

```tsx
                  {school.adminCount === 0 ? (
                    <BootstrapAdminForm
                      schoolId={school.id}
                      locale={locale}
                      labels={dict.app.pages.admin.schools.bootstrapAdmin}
                    />
                  ) : null}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Manuell verifiering**

Skapa en ny testskola via det befintliga `CreateSchoolForm` (bekräfta samtidigt att Task 1:s fix fungerar — skolan ska faktiskt dyka upp i listan nu). Skolans kort ska visa "Bjud in första admin"-formuläret eftersom `adminCount === 0`. Bjud in dig själv med en test-alias-adress, klicka länken i mejlet, sätt lösenord på `/app/admin/konto`, logga in och verifiera att du hamnar i den nya skolans admin-vy (inte den gamla pilotskolan). Ladda om `/admin/skolor` som Elevante-superadmin igen — bootstrap-formuläret ska nu vara borta för den skolan (adminCount === 1).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/skolor/BootstrapAdminForm.tsx apps/web/app/[locale]/app/[role]/skolor/page.tsx
git commit -m "feat(admin): bjud in en ny skolas första admin från /admin/skolor"
```

---

## Fas 2 — Klasser och kurser (self-service för skol-admin)

RLS tillåter redan admin att skriva till `classes`/`courses` skol-scopat (`classes_admin_write`, `courses_admin_write` i `20260514183000_initial_schema.sql`) — inga nya migrationer krävs i den här fasen, bara Server Actions + UI mot den vanliga (cookie-bundna) klienten.

### Task 8: Data-lager för klasser och kurser

**Files:**
- Modify: `apps/web/lib/data/admin.ts`

- [ ] **Step 1: Lägg till `getAdminClasses`, `getAdminCourses`, `getSchoolTeachers`**

```ts
export type AdminClassRow = {
  id: string;
  name: string;
  year: number | null;
  studentsCount: number;
  lessonsCount: number;
};

export async function getAdminClasses(schoolId: string): Promise<AdminClassRow[]> {
  const supabase = await createSupabaseServerClient();
  const [classesRes, membersRes, lessonsRes] = await Promise.all([
    supabase.from('classes').select('id, name, year').eq('school_id', schoolId).order('name'),
    supabase.from('class_members').select('class_id'),
    supabase.from('lessons').select('class_id').eq('school_id', schoolId),
  ]);

  const studentCounts = new Map<string, number>();
  for (const row of membersRes.data ?? []) {
    studentCounts.set(row.class_id, (studentCounts.get(row.class_id) ?? 0) + 1);
  }
  const lessonCounts = new Map<string, number>();
  for (const row of lessonsRes.data ?? []) {
    lessonCounts.set(row.class_id, (lessonCounts.get(row.class_id) ?? 0) + 1);
  }

  return (classesRes.data ?? []).map((c) => ({
    ...c,
    studentsCount: studentCounts.get(c.id) ?? 0,
    lessonsCount: lessonCounts.get(c.id) ?? 0,
  }));
}

export type AdminCourseTeacher = { id: string; fullName: string | null };

export type AdminCourseRow = {
  id: string;
  code: string;
  name: string;
  teachers: AdminCourseTeacher[];
};

export async function getAdminCourses(schoolId: string): Promise<AdminCourseRow[]> {
  const supabase = await createSupabaseServerClient();
  const [coursesRes, teachersRes] = await Promise.all([
    supabase.from('courses').select('id, code, name').eq('school_id', schoolId).order('code'),
    supabase.from('course_teachers').select('course_id, profiles ( id, full_name )'),
  ]);

  type TeacherJoin = {
    course_id: string;
    profiles: { id: string; full_name: string | null } | null;
  };
  const byCourse = new Map<string, AdminCourseTeacher[]>();
  for (const row of (teachersRes.data ?? []) as unknown as TeacherJoin[]) {
    if (!row.profiles) continue;
    const list = byCourse.get(row.course_id) ?? [];
    list.push({ id: row.profiles.id, fullName: row.profiles.full_name });
    byCourse.set(row.course_id, list);
  }

  return (coursesRes.data ?? []).map((c) => ({
    ...c,
    teachers: byCourse.get(c.id) ?? [],
  }));
}

export type AdminTeacherOption = { id: string; fullName: string | null; email: string | null };

export async function getSchoolTeachers(schoolId: string): Promise<AdminTeacherOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .order('full_name');
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, email: p.email }));
}
```

- [ ] **Step 2: Verifiera typer**

```bash
pnpm --filter @elevante/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/admin.ts
git commit -m "feat(admin): data-lager för klass-, kurs- och lärarlistor"
```

---

### Task 9: Server Actions för klasser

**Files:**
- Modify: `apps/web/app/actions/admin.ts`

- [ ] **Step 1: Lägg till `createClass` och `deleteClass`**

```ts
const createClassSchema = z.object({
  name: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1).max(12).optional(),
});

export type CreateClassState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function createClass(
  _prev: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const yearRaw = formData.get('year');
  const parsed = createClassSchema.safeParse({
    name: formData.get('name'),
    year: yearRaw && yearRaw.toString().length > 0 ? yearRaw : undefined,
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('classes').insert({
    school_id: profile.school_id,
    name: parsed.data.name,
    year: parsed.data.year ?? null,
  });
  if (error) {
    if (error.code === '23505') return { status: 'error', code: 'duplicate' };
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success' };
}

export type DeleteClassState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'has-lessons' | 'generic'; detail?: string };

export async function deleteClass(
  _prev: DeleteClassState,
  formData: FormData,
): Promise<DeleteClassState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const classId = (formData.get('class_id') ?? '').toString();
  if (!classId) return { status: 'error', code: 'unauthorized' };

  const supabase = await createSupabaseServerClient();

  // lessons.class_id är ON DELETE CASCADE — blockera radering om
  // klassen har inspelade lektioner, annars försvinner transkript och
  // chatthistorik tyst med den.
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);
  if ((count ?? 0) > 0) {
    return { status: 'error', code: 'has-lessons' };
  }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('school_id', profile.school_id);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success' };
}
```

- [ ] **Step 2: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/actions/admin.ts
git commit -m "feat(admin): createClass/deleteClass med skydd mot att radera klasser med lektioner"
```

---

### Task 10: Server Actions för kurser + lärartilldelning

**Files:**
- Modify: `apps/web/app/actions/admin.ts`

- [ ] **Step 1: Lägg till `createCourse` och `deleteCourse`**

```ts
const createCourseSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
});

export type CreateCourseState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function createCourse(
  _prev: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = createCourseSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('courses').insert({
    school_id: profile.school_id,
    code: parsed.data.code,
    name: parsed.data.name,
  });
  if (error) {
    if (error.code === '23505') return { status: 'error', code: 'duplicate' };
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

export type DeleteCourseState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'has-lessons' | 'generic'; detail?: string };

export async function deleteCourse(
  _prev: DeleteCourseState,
  formData: FormData,
): Promise<DeleteCourseState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const courseId = (formData.get('course_id') ?? '').toString();
  if (!courseId) return { status: 'error', code: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if ((count ?? 0) > 0) {
    return { status: 'error', code: 'has-lessons' };
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
    .eq('school_id', profile.school_id);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}
```

- [ ] **Step 2: Lägg till `assignTeacherToCourse` och `removeTeacherFromCourse`**

```ts
const assignTeacherSchema = z.object({
  courseId: z.string().uuid(),
  teacherId: z.string().uuid(),
});

export type AssignTeacherState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

export async function assignTeacherToCourse(
  _prev: AssignTeacherState,
  formData: FormData,
): Promise<AssignTeacherState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = assignTeacherSchema.safeParse({
    courseId: formData.get('course_id'),
    teacherId: formData.get('teacher_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();

  // RLS på course_teachers kollar bara att kursen tillhör adminens
  // skola — inte att den valda profilen gör det. Måste kollas i kod.
  const { data: teacher } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', parsed.data.teacherId)
    .eq('school_id', profile.school_id)
    .eq('role', 'teacher')
    .maybeSingle();
  if (!teacher) {
    return { status: 'error', code: 'invalid', detail: 'Läraren tillhör inte din skola' };
  }

  const { error } = await supabase.from('course_teachers').insert({
    course_id: parsed.data.courseId,
    profile_id: parsed.data.teacherId,
  });
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

export async function removeTeacherFromCourse(
  _prev: AssignTeacherState,
  formData: FormData,
): Promise<AssignTeacherState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = assignTeacherSchema.safeParse({
    courseId: formData.get('course_id'),
    teacherId: formData.get('teacher_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('course_teachers')
    .delete()
    .eq('course_id', parsed.data.courseId)
    .eq('profile_id', parsed.data.teacherId);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/admin.ts
git commit -m "feat(admin): createCourse/deleteCourse + tilldela/ta bort lärare på kurs"
```

---

### Task 11: i18n-etiketter för klasser och kurser

**Files:**
- Modify: `apps/web/lib/i18n/types.ts`
- Modify: `apps/web/lib/i18n/locales/sv.ts`
- Modify: `apps/web/lib/i18n/locales/en.ts`

- [ ] **Step 1: Utöka `Dictionary`-typen**

I `apps/web/lib/i18n/types.ts`, inuti `pages.admin` (som syskon till `schools`, efter `schools: {...}`-blocket), lägg till:

```ts
        classes: {
          title: string;
          subtitle: string;
          empty: string;
          studentsLabel: string;
          lessonsLabel: string;
          delete: string;
          deleting: string;
          deleteErrorHasLessons: string;
          deleteErrorGeneric: string;
          createTitle: string;
          nameLabel: string;
          yearLabel: string;
          yearHint: string;
          createSubmit: string;
          creating: string;
          createSuccess: string;
          createErrorDuplicate: string;
          createErrorGeneric: string;
        };
        courses: {
          title: string;
          subtitle: string;
          empty: string;
          delete: string;
          deleting: string;
          deleteErrorHasLessons: string;
          deleteErrorGeneric: string;
          teachersHeading: string;
          noTeachers: string;
          removeTeacher: string;
          pickTeacher: string;
          assign: string;
          assigning: string;
          assignError: string;
          createTitle: string;
          codeLabel: string;
          nameLabel: string;
          createSubmit: string;
          creating: string;
          createSuccess: string;
          createErrorDuplicate: string;
          createErrorGeneric: string;
        };
```

Inuti `sidebar.admin`, `mobileNav.admin` och `navDescriptions.admin` (tre separata block), lägg till `classes: string;` och `courses: string;` i var och en.

- [ ] **Step 2: Fyll i svenska (`sv.ts`)**

I `admin`-objektet (samma nivå som `schools:`):

```ts
        classes: {
          title: 'Klasser',
          subtitle: 'Skapa och hantera klasser i din skola.',
          empty: 'Inga klasser ännu. Skapa den första till höger.',
          studentsLabel: 'elever',
          lessonsLabel: 'lektioner',
          delete: 'Ta bort',
          deleting: 'Tar bort…',
          deleteErrorHasLessons: 'Klassen har inspelade lektioner och kan inte tas bort.',
          deleteErrorGeneric: 'Kunde inte ta bort klassen.',
          createTitle: 'Ny klass',
          nameLabel: 'Namn',
          yearLabel: 'Årskurs',
          yearHint: 'Valfritt, 1–12.',
          createSubmit: 'Skapa',
          creating: 'Skapar…',
          createSuccess: 'Klassen är skapad.',
          createErrorDuplicate: 'En klass med det namnet finns redan.',
          createErrorGeneric: 'Kunde inte skapa klassen.',
        },
        courses: {
          title: 'Kurser',
          subtitle: 'Skapa kurser och tilldela lärare i din skola.',
          empty: 'Inga kurser ännu. Skapa den första till höger.',
          delete: 'Ta bort',
          deleting: 'Tar bort…',
          deleteErrorHasLessons: 'Kursen har inspelade lektioner och kan inte tas bort.',
          deleteErrorGeneric: 'Kunde inte ta bort kursen.',
          teachersHeading: 'Lärare på kursen',
          noTeachers: 'Ingen lärare tilldelad ännu.',
          removeTeacher: 'Ta bort lärare',
          pickTeacher: 'Välj lärare…',
          assign: 'Lägg till',
          assigning: 'Lägger till…',
          assignError: 'Kunde inte lägga till läraren.',
          createTitle: 'Ny kurs',
          codeLabel: 'Kurskod',
          nameLabel: 'Namn',
          createSubmit: 'Skapa',
          creating: 'Skapar…',
          createSuccess: 'Kursen är skapad.',
          createErrorDuplicate: 'En kurs med den koden finns redan.',
          createErrorGeneric: 'Kunde inte skapa kursen.',
        },
```

I `sidebar.admin`, `mobileNav.admin`, `navDescriptions.admin`, lägg till:

```ts
      classes: 'Klasser',
      courses: 'Kurser',
```

(navDescriptions-varianten får längre text, t.ex. `classes: 'Skapa och hantera klasser'`, `courses: 'Kurser och lärartilldelning'`.)

- [ ] **Step 3: Fyll i engelska (`en.ts`)**

Samma struktur, engelska strängar (t.ex. `title: 'Classes'`, `subtitle: 'Create and manage classes in your school.'`, osv — spegla sv.ts rakt av).

- [ ] **Step 4: Verifiera typer**

```bash
pnpm --filter @elevante/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/i18n/types.ts apps/web/lib/i18n/locales/sv.ts apps/web/lib/i18n/locales/en.ts
git commit -m "feat(i18n): etiketter för klass- och kurshantering"
```

---

### Task 12: Admin-vy på `/admin/klasser`

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/klasser/AdminClassesView.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/klasser/page.tsx`

- [ ] **Step 1: Skriv `AdminClassesView.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import {
  createClass,
  deleteClass,
  type CreateClassState,
  type DeleteClassState,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input } from '@/components/ui/Input';
import type { AdminClassRow } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['classes'];

type Props = {
  classes: AdminClassRow[];
  labels: Labels;
};

export function AdminClassesView({ classes, labels }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {classes.length === 0 ? (
          <EmptyState title={labels.empty} />
        ) : (
          classes.map((cls) => <ClassRow key={cls.id} cls={cls} labels={labels} />)
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.createTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateClassForm labels={labels} />
        </CardBody>
      </Card>
    </div>
  );
}

function ClassRow({ cls, labels }: { cls: AdminClassRow; labels: Labels }) {
  const [state, formAction, pending] = useActionState<DeleteClassState, FormData>(deleteClass, {
    status: 'idle',
  });

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-2xl text-[var(--color-primary)]">{cls.name}</div>
            <div className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {cls.studentsCount} {labels.studentsLabel} · {cls.lessonsCount} {labels.lessonsLabel}
            </div>
          </div>
          <form action={formAction}>
            <input type="hidden" name="class_id" value={cls.id} />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? labels.deleting : labels.delete}
            </Button>
          </form>
        </div>
        {state.status === 'error' ? (
          <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
            {state.code === 'has-lessons' ? labels.deleteErrorHasLessons : labels.deleteErrorGeneric}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function CreateClassForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<CreateClassState, FormData>(createClass, {
    status: 'idle',
  });

  return (
    <form action={formAction} className="space-y-4">
      <Field id="class-name" label={labels.nameLabel}>
        <Input id="class-name" name="name" type="text" required placeholder="NA23a" />
      </Field>
      <Field id="class-year" label={labels.yearLabel} hint={labels.yearHint}>
        <Input id="class-year" name="year" type="number" min={1} max={12} />
      </Field>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.createSuccess}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'duplicate' ? labels.createErrorDuplicate : labels.createErrorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.creating : labels.createSubmit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Gren `klasser/page.tsx` på roll**

Ersätt hela filens innehåll:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTeacherClasses } from '@/lib/data/teacher';
import { getAdminClasses } from '@/lib/data/admin';
import { AdminClassesView } from './AdminClassesView';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title =
    role === 'admin' ? dict.app.pages.admin.classes.title : dict.app.pages.teacher.classes.title;
  return { title, robots: { index: false, follow: false } };
}

export default async function ClassesPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'teacher' && role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);

  if (role === 'admin') {
    if (profile.role !== 'admin' || !profile.school_id) redirect(`/${locale}/app`);
    const labels = dict.app.pages.admin.classes;
    const classes = await getAdminClasses(profile.school_id);
    return (
      <PageWrapper title={labels.title} subtitle={labels.subtitle}>
        <AdminClassesView classes={classes} labels={labels} />
      </PageWrapper>
    );
  }

  const labels = dict.app.pages.teacher.classes;
  const classes = await getTeacherClasses(profile.id);
  const base = `/${locale}/app/teacher`;

  if (classes.length === 0) {
    return (
      <PageWrapper title={labels.title} subtitle={labels.subtitle}>
        <EmptyState title={labels.empty} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`${base}/klasser/${cls.id}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-colors hover:border-[var(--color-accent)]"
          >
            <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
              {cls.year ? `${labels.year} ${cls.year}` : ''}
            </div>
            <div className="mt-2 font-serif text-2xl text-[var(--color-primary)]">
              {cls.name}
            </div>
            <div className="mt-4 text-sm text-[var(--color-ink-muted)]">
              {cls.studentsCount} {labels.studentsLabel}
            </div>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Manuell verifiering**

Logga in som admin, gå till `/sv/app/admin/klasser`. Skapa en klass ("NA23a", årskurs 2). Bekräfta att den syns i listan med 0 elever/0 lektioner. Försök radera en klass som redan har lektioner (t.ex. en av de seedade demo-klasserna) → ska ge `deleteErrorHasLessons`. Radera en tom testklass → ska försvinna. Logga sedan in som lärare och kontrollera att `/app/teacher/klasser` ser exakt ut som innan (ingen regression).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/klasser/AdminClassesView.tsx apps/web/app/[locale]/app/[role]/klasser/page.tsx
git commit -m "feat(admin): klasshantering på /admin/klasser, samexisterar med lärarvyn"
```

---

### Task 13: Ny sida `/admin/kurser`

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/kurser/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/kurser/AdminCoursesView.tsx`
- Modify: `apps/web/lib/app/nav.ts`

- [ ] **Step 1: Skriv `AdminCoursesView.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import {
  createCourse,
  deleteCourse,
  assignTeacherToCourse,
  removeTeacherFromCourse,
  type CreateCourseState,
  type DeleteCourseState,
  type AssignTeacherState,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Input';
import type { AdminCourseRow, AdminTeacherOption } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['courses'];

type Props = {
  courses: AdminCourseRow[];
  teachers: AdminTeacherOption[];
  labels: Labels;
};

export function AdminCoursesView({ courses, teachers, labels }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {courses.length === 0 ? (
          <EmptyState title={labels.empty} />
        ) : (
          courses.map((course) => (
            <CourseRow key={course.id} course={course} teachers={teachers} labels={labels} />
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.createTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateCourseForm labels={labels} />
        </CardBody>
      </Card>
    </div>
  );
}

function CourseRow({
  course,
  teachers,
  labels,
}: {
  course: AdminCourseRow;
  teachers: AdminTeacherOption[];
  labels: Labels;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState<DeleteCourseState, FormData>(
    deleteCourse,
    { status: 'idle' },
  );
  const [assignState, assignAction, assignPending] = useActionState<AssignTeacherState, FormData>(
    assignTeacherToCourse,
    { status: 'idle' },
  );
  const [, removeAction] = useActionState<AssignTeacherState, FormData>(removeTeacherFromCourse, {
    status: 'idle',
  });

  const assignedIds = new Set(course.teachers.map((t) => t.id));
  const available = teachers.filter((t) => !assignedIds.has(t.id));

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
                {course.code}
              </div>
              <div className="mt-1 font-serif text-2xl text-[var(--color-primary)]">
                {course.name}
              </div>
            </div>
            <form action={deleteAction}>
              <input type="hidden" name="course_id" value={course.id} />
              <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                {deletePending ? labels.deleting : labels.delete}
              </Button>
            </form>
          </div>
          {deleteState.status === 'error' ? (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {deleteState.code === 'has-lessons'
                ? labels.deleteErrorHasLessons
                : labels.deleteErrorGeneric}
            </p>
          ) : null}

          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              {labels.teachersHeading}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {course.teachers.length === 0 ? (
                <li className="text-sm text-[var(--color-ink-muted)]">{labels.noTeachers}</li>
              ) : (
                course.teachers.map((teacher) => (
                  <li key={teacher.id}>
                    <form
                      action={removeAction}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                    >
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="teacher_id" value={teacher.id} />
                      <span>{teacher.fullName ?? '—'}</span>
                      <button
                        type="submit"
                        aria-label={labels.removeTeacher}
                        className="text-[var(--color-ink-subtle)]"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>

            {available.length > 0 ? (
              <form action={assignAction} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="course_id" value={course.id} />
                <div className="flex-1">
                  <Select name="teacher_id" required defaultValue="">
                    <option value="" disabled>
                      {labels.pickTeacher}
                    </option>
                    {available.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName ?? teacher.email}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" size="sm" disabled={assignPending}>
                  {assignPending ? labels.assigning : labels.assign}
                </Button>
              </form>
            ) : null}
            {assignState.status === 'error' ? (
              <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
                {labels.assignError}
              </p>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CreateCourseForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<CreateCourseState, FormData>(createCourse, {
    status: 'idle',
  });

  return (
    <form action={formAction} className="space-y-4">
      <Field id="course-code" label={labels.codeLabel}>
        <Input id="course-code" name="code" type="text" required placeholder="MA3" />
      </Field>
      <Field id="course-name" label={labels.nameLabel}>
        <Input id="course-name" name="name" type="text" required placeholder="Matematik 3c" />
      </Field>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.createSuccess}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'duplicate' ? labels.createErrorDuplicate : labels.createErrorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.creating : labels.createSubmit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Skriv `kurser/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminCourses, getSchoolTeachers } from '@/lib/data/admin';
import { AdminCoursesView } from './AdminCoursesView';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.courses.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminCoursesPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.courses;
  const [courses, teachers] = await Promise.all([
    getAdminCourses(profile.school_id),
    getSchoolTeachers(profile.school_id),
  ]);

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <AdminCoursesView courses={courses} teachers={teachers} labels={labels} />
    </PageWrapper>
  );
}
```

- [ ] **Step 3: Lägg till nav-post**

I `apps/web/lib/app/nav.ts`, i admin-listan (efter `schools`-posten, före `users`):

```ts
    { id: 'classes', href: `${base}/admin/klasser`, label: a.classes, mobileLabel: m.classes, description: d.classes },
    { id: 'courses', href: `${base}/admin/kurser`, label: a.courses, mobileLabel: m.courses, description: d.courses },
```

(Sätt in dem där det känns naturligt i menyordningen — direkt efter `schools` fungerar bra: skolor → klasser → kurser → användare.)

- [ ] **Step 4: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 5: Manuell verifiering**

Gå till `/sv/app/admin/kurser`. Skapa en kurs ("MA3", "Matematik 3c"). Tilldela en av skolans lärare via dropdown-formuläret — chippen ska dyka upp direkt. Klicka × på chippen → läraren ska försvinna och komma tillbaka i dropdownen. Kontrollera att sidofältet/mobilnavet visar de två nya länkarna med rätt etiketter på både `/sv` och `/en`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/kurser apps/web/lib/app/nav.ts
git commit -m "feat(admin): ny sida /admin/kurser med lärartilldelning"
```

---

## Fas 3 — Lärare: inbjudan + kursanknytning

Inbjudan är redan klar (fas 1:s `InviteUserForm` med `role=teacher`). Det som återstår är rent förklarande/verifierande, ingen ny kod krävs utöver fas 2:s kursanknytning.

### Task 14: End-to-end-verifiering av lärarflödet

**Files:** inga kodändringar — det här är en ren verifieringsuppgift som binder ihop fas 1 och fas 2.

- [ ] **Step 1: Bjud in en lärare**

Som skol-admin, gå till `/sv/app/admin/anvandare`, bjud in en testadress med roll "Lärare".

- [ ] **Step 2: Sätt lösenord och logga in**

Klicka länken i inbjudningsmejlet, sätt lösenord på `/app/teacher/konto`, logga in. Kontrollera att `/app/teacher` visar en tom översikt (inga kurser/klasser ännu) — det är förväntat, ingen `course_teachers`-rad finns än.

- [ ] **Step 3: Koppla läraren till en kurs**

Som admin, gå till `/sv/app/admin/kurser`, tilldela den nya läraren till en befintlig kurs som redan har `timeslots` kopplade till en klass (t.ex. en av de seedade demo-kurserna, inte den tomma testkursen från Task 13 — den har inga timeslots än).

- [ ] **Step 4: Bekräfta att klassen dyker upp för läraren**

Logga in som den nya läraren igen (eller ladda om), gå till `/app/teacher/klasser`. Klassen som är kopplad via kursens `timeslots` ska nu synas — det bekräftar att `getTeacherClasses`-kedjan (`course_teachers → courses → timeslots → classes`) fungerar med en admin-tilldelad lärare, inte bara seedade.

- [ ] **Step 5: Dokumentera resultatet**

Ingen commit (inga filändringar) — men om steg 4 inte fungerar som väntat, det är ett tecken på att `assignTeacherToCourse` (Task 10) eller RLS-policyn `course_teachers_admin_write` behöver felsökas innan fas 4 påbörjas, eftersom fas 4 bygger vidare på samma mönster.

---

## Fas 4 — Elever: bulk-import via CSV

### Task 15: `importStudents` Server Action

**Files:**
- Modify: `apps/web/app/actions/admin.ts`

- [ ] **Step 1: Lägg till importen av `parseCsv`**

Överst i `apps/web/app/actions/admin.ts`:

```ts
import { parseCsv } from '@/lib/csv';
```

- [ ] **Step 2: Lägg till `importStudents`**

```ts
export type ImportStudentsState =
  | { status: 'idle' }
  | { status: 'success'; invited: number; skipped: { email: string; reason: string }[] }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

export async function importStudents(
  _prev: ImportStudentsState,
  formData: FormData,
): Promise<ImportStudentsState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen fil vald' };
  }
  const locale = (formData.get('locale') ?? 'sv').toString() as Locale;

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: 'error', code: 'invalid', detail: 'Kunde inte läsa filen' };
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Filen är tom' };
  }

  const required = ['full_name', 'email', 'class_name'];
  const missing = required.filter((k) => !(k in rows[0]!));
  if (missing.length > 0) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Rubriker saknas: ${missing.join(', ')}`,
    };
  }
  // Skydd mot att en enda stor fil blockerar Server Action-requesten
  // (varje rad gör ett separat Auth Admin API-anrop) eller triggar
  // Supabase Auths rate limit för inviteUserByEmail.
  if (rows.length > 200) {
    return { status: 'error', code: 'invalid', detail: 'Max 200 rader per import' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('school_id', profile.school_id);
  const classMap = new Map((classes ?? []).map((c) => [c.name, c.id]));

  let invited = 0;
  const skipped: { email: string; reason: string }[] = [];

  for (const row of rows) {
    const email = (row['email'] ?? '').trim();
    const fullName = (row['full_name'] ?? '').trim();
    const className = (row['class_name'] ?? '').trim();
    const classId = classMap.get(className);

    if (!email || !fullName || !classId) {
      skipped.push({ email: email || '(saknas)', reason: 'invalid-row' });
      continue;
    }

    const result = await inviteUserCore({
      email,
      fullName,
      role: 'student',
      schoolId: profile.school_id,
      locale,
    });
    if (!result.ok) {
      skipped.push({ email, reason: result.code });
      continue;
    }

    const { error: memberError } = await supabase
      .from('class_members')
      .insert({ class_id: classId, profile_id: result.userId });
    if (memberError) {
      skipped.push({ email, reason: 'class-link-failed' });
      continue;
    }
    invited += 1;
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  return { status: 'success', invited, skipped };
}
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/admin.ts
git commit -m "feat(admin): importStudents — bulk-CSV-inbjudan med klasstilldelning

Återanvänder inviteUserCore per rad (samma väg som enstaka inbjudan)
och lib/csv.ts-parsern som redan används för schema-uppladdning."
```

---

### Task 16: `ImportStudentsForm` på `/admin/anvandare`

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/anvandare/ImportStudentsForm.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/anvandare/page.tsx`

- [ ] **Step 1: Skriv `ImportStudentsForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { importStudents, type ImportStudentsState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['users']['import'];
};

const initialState: ImportStudentsState = { status: 'idle' };

export function ImportStudentsForm({ locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(importStudents, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="import-file" label={labels.fileLabel} hint={labels.fileHint}>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-[var(--color-primary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-white"
        />
      </Field>

      {state.status === 'success' ? (
        <div role="status" className="space-y-2 text-sm">
          <p className="text-[var(--color-success)]">
            {labels.successCount.replace('{count}', String(state.invited))}
          </p>
          {state.skipped.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-error)]">
              {state.skipped.map((row) => (
                <li key={row.email}>
                  {row.email} — {row.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {labels.errorGeneric}
          {state.detail ? ` — ${state.detail}` : ''}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? labels.importing : labels.submit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Montera i `anvandare/page.tsx`**

Lägg till importen:

```ts
import { ImportStudentsForm } from './ImportStudentsForm';
```

Lägg till en andra sektion direkt efter invite-sektionen från Task 6:

```tsx
      <section className="mt-6 rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6">
        <h2 className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
          {labels.import.heading}
        </h2>
        <div className="mt-4 max-w-md">
          <ImportStudentsForm locale={locale} labels={labels.import} />
        </div>
      </section>
```

- [ ] **Step 3: Verifiera typer och lint**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
```

- [ ] **Step 4: Manuell verifiering**

Skapa en testfil `test-students.csv`:

```csv
full_name,email,class_name
Testa Elevsson,testa.elevsson+t1@exempel.se,NA23a
Prova Studentsson,prova.studentsson+t2@exempel.se,NA23a
```

(Byt `NA23a` till en klass som faktiskt finns i din testskola — skapad i Task 12.) Ladda upp filen på `/sv/app/admin/anvandare`. Kontrollera:
- Resultatet visar "2 elever inbjudna."
- Båda mejladresserna finns i `profiles` med `role='student'`, rätt `school_id`.
- Båda finns i `class_members` kopplade till rätt `class_id`.
- Ladda upp samma fil igen → båda raderna hamnar i `skipped` med `already-exists`.
- Ladda upp en fil med en obefintlig `class_name` → den raden hamnar i `skipped` med `invalid-row`, men giltiga rader i samma fil går ändå igenom.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/anvandare/ImportStudentsForm.tsx apps/web/app/[locale]/app/[role]/anvandare/page.tsx
git commit -m "feat(admin): CSV-import av elever med klasstilldelning på /admin/anvandare"
```

---

### Task 17: Slutgiltig regressionskontroll

**Files:** inga kodändringar.

- [ ] **Step 1: Full typecheck + lint på hela webbappen**

```bash
pnpm --filter @elevante/web typecheck
pnpm --filter @elevante/web lint
pnpm --filter @elevante/web build
```

Förväntat: alla tre går igenom rent. `build` fångar upp saker typecheck/lint missar, t.ex. felaktiga Server Component/Client Component-gränser.

- [ ] **Step 2: Full click-through som skol-admin**

I ordning, som en enda skol-admin-session:
1. `/admin/skolor` — skapa skola, bootstrap-invite dig själv som admin (om inte redan gjort under fas 1).
2. `/admin/klasser` — skapa en klass.
3. `/admin/kurser` — skapa en kurs, tilldela en lärare.
4. `/admin/anvandare` — bjud in en lärare (om inte redan gjort under fas 3), importera 2 elever via CSV till klassen från steg 2.
5. Logga in som den nya läraren, koppla in på kursen från steg 3, bekräfta att klassen syns i `/teacher/klasser`.
6. Logga in som en av de importerade eleverna, bekräfta att de hamnar i rätt klass och skola i `/student`.

- [ ] **Step 3: Bekräfta att befintliga demo-konton är opåverkade**

Logga in med de befintliga seedade demo-kontona (Anna läraren m.fl., loggade i Notion "Nycklar") och bekräfta att inget i deras vyer förändrats — särskilt `/teacher/klasser` (Task 12 rörde samma fil) och `/admin/anvandare` / `/admin/skolor` (Task 6/7 lade bara till sektioner, ändrade inget befintligt).

- [ ] **Step 4: Uppdatera CLAUDE.md Fasminne**

Lägg till en ny Fasminne-post i `CLAUDE.md` som sammanfattar vad som byggdes (mönster från tidigare poster: en rad, vad som är klart, vilka filer/beslut som är värda att minnas). Exempel-format finns i befintliga poster ovanför "## Ekonomi" i filen.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: uppdatera Fasminne med skol-provisioneringsflödet"
```

---

## Explicit ej med i denna plan (medvetet avgränsat)

- **Inaktivera/radera användare** — diskuterades tidigt i researchen men hör inte till "hur skapas skolor/admins/klasser/lärare/elever"-frågan denna plan svarar på. Egen plan senare.
- **Förhandsgranskning före CSV-import** (visa parsade rader innan commit) — schema-CSV-uppladdningen som redan finns i kodbasen gör inte heller det (direkt upload-och-applicera), så `importStudents` följer samma etablerade mönster för konsekvens. Kan läggas till senare om admin-användare i praktiken behöver rätta fel innan de committar.
- **Direkt lärare↔klass-koppling** — schemat har medvetet ingen sådan tabell; en lärares klasser härleds via `course_teachers → courses → timeslots → classes`. Att lägga till en genväg vore att duplicera data som redan uttrycks via schemat.
