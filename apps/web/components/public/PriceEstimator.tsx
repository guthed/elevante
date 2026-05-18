'use client';

import { useActionState, useId, useRef, useState, useEffect } from 'react';
import { getSchoolEstimate, submitCampaignLead, type LeadState } from '@/app/actions/campaign';
import { estimateAnnualPrice, formatSEK } from '@/lib/pricing';
import schoolsRaw from '@/lib/data/schools.json';

type School = { code: string; name: string };
const schools: School[] = schoolsRaw as School[];

const INITIAL_LEAD: LeadState = { status: 'idle' };

export function PriceEstimator({ locale }: { locale: string }) {
  const sv = locale === 'sv';
  const inputId = useId();
  const listboxId = useId();
  const manualSchoolNameId = useId();
  const studentCountId = useId();
  const comboboxRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Selected school + student count
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [students, setStudents] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Lead form
  const [leadState, leadAction, isPending] = useActionState(submitCampaignLead, INITIAL_LEAD);
  const [showLead, setShowLead] = useState(false);

  const trimmedQuery = query.trim();
  const suggestions: School[] =
    trimmedQuery.length >= 2
      ? schools
          .filter((s) => s.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
          .slice(0, 8)
      : [];

  const studentCount = students === '' ? null : Math.round(Number(students));
  const validStudents = studentCount !== null && Number.isFinite(studentCount) && studentCount > 0;
  const estimatedPrice = validStudents ? estimateAnnualPrice(studentCount!) : null;
  const bigSchool = validStudents && studentCount! >= 5000;

  const schoolName = manualMode ? manualSchoolName : (selectedSchool?.name ?? '');
  const schoolCode = manualMode ? 'MANUAL' : (selectedSchool?.code ?? '');

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        comboboxRef.current && !comboboxRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSelectSchool(school: School) {
    setSelectedSchool(school);
    setQuery(school.name);
    setOpen(false);
    setActiveIndex(-1);
    setStudents('');
    setLoading(true);
    try {
      const result = await getSchoolEstimate(school.code, school.name, locale);
      if (result.students !== null) {
        setStudents(String(result.students));
      } else {
        setStudents('');
      }
    } catch {
      setStudents('');
    } finally {
      setLoading(false);
    }
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
    setSelectedSchool(null);
    setStudents('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectSchool(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function enterManualMode() {
    setManualMode(true);
    setSelectedSchool(null);
    setQuery('');
    setStudents('');
    setOpen(false);
  }

  function exitManualMode() {
    setManualMode(false);
    setManualSchoolName('');
    setStudents('');
  }

  return (
    <div className="space-y-8">
      {/* --- School search --- */}
      {!manualMode ? (
        <div className="space-y-3">
          <label
            htmlFor={inputId}
            className="block text-[0.9375rem] font-medium text-[var(--color-ink)]"
          >
            {sv ? 'Sök din skola' : 'Search for your school'}
          </label>
          <div className="relative">
            <input
              id={inputId}
              ref={comboboxRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
              }
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (trimmedQuery.length >= 2) setOpen(true);
              }}
              placeholder={sv ? 'T.ex. Nacka Gymnasium' : 'E.g. Nacka Gymnasium'}
              autoComplete="off"
              className="w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[1rem] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-[240ms] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
            {/* Dropdown */}
            {open && suggestions.length > 0 && (
              <ul
                id={listboxId}
                ref={dropdownRef}
                role="listbox"
                aria-label={sv ? 'Skolförslag' : 'School suggestions'}
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] shadow-[0_8px_32px_-8px_rgba(26,26,46,0.12)]"
              >
                {suggestions.map((school, index) => (
                  <li
                    key={school.code}
                    id={`${listboxId}-opt-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`cursor-pointer px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] transition-colors duration-[160ms] ${
                      index === activeIndex
                        ? 'bg-[var(--color-surface)]'
                        : 'hover:bg-[var(--color-surface-soft)]'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur before click
                      handleSelectSchool(school);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {school.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={enterManualMode}
            className="inline-block py-1.5 text-[0.875rem] text-[var(--color-ink-secondary)] underline underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
          >
            {sv ? 'Hittar du inte din skola?' : "Can't find your school?"}
          </button>
        </div>
      ) : (
        /* --- Manual mode --- */
        <div className="space-y-4">
          <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] px-4 py-3 text-[0.875rem] text-[var(--color-ink-secondary)]">
            {sv
              ? 'Fyll i skolans namn och antal elever manuellt.'
              : 'Enter your school name and student count manually.'}
          </div>
          <div className="space-y-2">
            <label
              htmlFor={manualSchoolNameId}
              className="block text-[0.9375rem] font-medium text-[var(--color-ink)]"
            >
              {sv ? 'Skolans namn' : 'School name'}
            </label>
            <input
              id={manualSchoolNameId}
              type="text"
              value={manualSchoolName}
              onChange={(e) => setManualSchoolName(e.target.value)}
              placeholder={sv ? 'Skriv skolans namn' : 'Enter school name'}
              className="w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[1rem] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-[240ms] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
          </div>
          <button
            type="button"
            onClick={exitManualMode}
            className="inline-block py-1.5 text-[0.875rem] text-[var(--color-ink-secondary)] underline underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
          >
            {sv ? '← Sök bland gymnasieskolor' : '← Search among upper secondary schools'}
          </button>
        </div>
      )}

      {/* --- Student count + estimate --- */}
      {(selectedSchool !== null || manualMode) && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor={studentCountId}
              className="block text-[0.9375rem] font-medium text-[var(--color-ink)]"
            >
              {sv ? 'Antal elever' : 'Number of students'}
            </label>
            {loading ? (
              <p className="mt-2 text-[0.9375rem] text-[var(--color-ink-muted)] animate-pulse">
                {sv ? 'Hämtar elevantal…' : 'Fetching student count…'}
              </p>
            ) : (
              <>
                {selectedSchool !== null && students === '' && !loading && (
                  <p className="mt-1 mb-2 text-[0.875rem] text-[var(--color-ink-muted)]">
                    {sv
                      ? 'Vi hittade inget elevantal för den här skolan — fyll i det nedan.'
                      : "We couldn't find a student count for this school — please enter it below."}
                  </p>
                )}
                <input
                  id={studentCountId}
                  type="number"
                  min={1}
                  step={1}
                  value={students}
                  onChange={(e) => setStudents(e.target.value)}
                  placeholder={sv ? 'T.ex. 800' : 'E.g. 800'}
                  className="mt-2 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[1rem] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-[240ms] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
                />
              </>
            )}
          </div>

          {/* Live price estimate */}
          <div aria-live="polite" aria-atomic="true">
            {validStudents && estimatedPrice !== null && (
              <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6">
                <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                  {sv ? 'Ungefärlig årskostnad' : 'Estimated annual cost'}
                </p>
                <p className="mt-2 font-serif text-[clamp(2rem,4vw+1rem,3rem)] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
                  {formatSEK(estimatedPrice, locale)}
                </p>
                <p className="mt-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
                  {sv
                    ? `${studentCount} elever × 500 kr / år`
                    : `${studentCount} students × SEK 500 / year`}
                </p>
                {bigSchool && (
                  <div className="mt-4 rounded-[10px] border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/8 px-4 py-3 text-[0.9375rem] text-[var(--color-ink)]">
                    {sv
                      ? 'Stor skola eller huvudman? Kontakta oss för en anpassad offert.'
                      : 'Large school or operator? Contact us for a custom quote.'}{' '}
                    <a
                      href={`/${locale}/kontakt?topic=offert`}
                      className="font-medium underline underline-offset-4"
                    >
                      {sv ? 'Kontakta oss →' : 'Contact us →'}
                    </a>
                  </div>
                )}
                <p className="mt-4 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  {sv
                    ? 'Ungefärligt pris — exakt kostnad beror på avtal och volym.'
                    : 'Approximate price — exact cost depends on contract and volume.'}
                </p>
                {!showLead && leadState.status !== 'success' && (
                  <button
                    type="button"
                    onClick={() => setShowLead(true)}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-all duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#0f1020] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2"
                  >
                    {sv ? 'Få en sammanställning' : 'Get a summary'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Lead form --- */}
      {showLead && validStudents && leadState.status !== 'success' && (
        <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-6 md:p-8">
          <h3 className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
            {sv ? 'Få sammanställningen på mejl' : 'Get the summary by email'}
          </h3>
          <p className="mt-2 text-[0.9375rem] text-[var(--color-ink-secondary)]">
            {sv
              ? 'Vi mailar dig en sammanställning och kan höra av oss om Elevante. Ingen spam, inget säljpressande.'
              : "We'll email you a summary and may follow up about Elevante. No spam, no pressure."}
          </p>
          <form action={leadAction} className="mt-6 space-y-4" noValidate>
            {/* Honeypot */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="hp-company">Company</label>
              <input id="hp-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {/* Hidden fields */}
            <input type="hidden" name="schoolUnitCode" value={schoolCode} />
            <input type="hidden" name="schoolName" value={schoolName} />
            <input type="hidden" name="students" value={validStudents && studentCount !== null ? String(studentCount) : ''} />
            <input type="hidden" name="locale" value={locale} />

            <div>
              <label
                htmlFor="lead-email"
                className="block text-[0.9375rem] font-medium text-[var(--color-ink)]"
              >
                {sv ? 'Din mejladress' : 'Your email address'}
              </label>
              <input
                id="lead-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={sv ? 'du@skola.se' : 'you@school.se'}
                className="mt-2 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[1rem] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-[240ms] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
              />
            </div>

            <div>
              <label
                htmlFor="lead-message"
                className="block text-[0.9375rem] font-medium text-[var(--color-ink)]"
              >
                {sv ? 'Meddelande (valfritt)' : 'Message (optional)'}
              </label>
              <textarea
                id="lead-message"
                name="message"
                rows={3}
                placeholder={sv ? 'T.ex. när ni planerar att börja, antal klasser…' : 'E.g. when you plan to start, number of classes…'}
                className="mt-2 w-full resize-none rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[1rem] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-[240ms] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
              />
            </div>

            <div aria-live="polite" aria-atomic="true">
              {leadState.status === 'error' && leadState.code === 'validation' && (
                <p className="text-[0.875rem] text-[var(--color-coral)]" role="alert">
                  {sv
                    ? 'Kontrollera att e-postadressen är rätt och att skola och elevantal är ifyllda.'
                    : 'Please check that the email address is correct and that school and student count are filled in.'}
                </p>
              )}
              {leadState.status === 'error' && leadState.code === 'generic' && (
                <p className="text-[0.875rem] text-[var(--color-coral)]" role="alert">
                  {sv
                    ? 'Något gick fel. Försök igen om en stund.'
                    : 'Something went wrong. Please try again shortly.'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              aria-disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-all duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#0f1020] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (sv ? 'Skickar…' : 'Sending…') : (sv ? 'Skicka' : 'Send')}
            </button>
          </form>
        </div>
      )}

      {/* --- Success state --- */}
      <div aria-live="polite" aria-atomic="true">
        {leadState.status === 'success' && (
          <div className="rounded-[16px] border border-[var(--color-sage)]/40 bg-[var(--color-sage)]/10 px-6 py-5">
            <p className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {sv ? 'Tack!' : 'Thank you!'}
            </p>
            <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi hör av oss inom kort. Du kan också boka en demo direkt nedan.'
                : 'We will be in touch shortly. You can also book a demo directly below.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
