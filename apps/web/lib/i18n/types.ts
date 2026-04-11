type ProblemItem = { title: string; body: string };
type SolutionStep = { number: string; title: string; body: string };
type StatItem = { value: string; label: string };

export type Dictionary = {
  meta: {
    siteName: string;
    tagline: string;
    description: string;
  };
  nav: {
    home: string;
    forSchools: string;
    forStudents: string;
    pricing: string;
    about: string;
    contact: string;
    bookDemo: string;
    openMenu: string;
    closeMenu: string;
    switchLanguage: string;
  };
  footer: {
    rights: string;
    madeIn: string;
    navHeader: string;
    companyHeader: string;
  };
  home: {
    hero: {
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
    };
    problem: {
      eyebrow: string;
      title: string;
      items: ProblemItem[];
    };
    solution: {
      eyebrow: string;
      title: string;
      subtitle: string;
      steps: SolutionStep[];
    };
    audiences: {
      eyebrow: string;
      title: string;
      student: { title: string; body: string; cta: string };
      teacher: { title: string; body: string; cta: string };
    };
    stats: {
      eyebrow: string;
      title: string;
      items: StatItem[];
    };
    finalCta: {
      title: string;
      subtitle: string;
      cta: string;
    };
  };
  forSchools: {
    hero: { eyebrow: string; title: string; subtitle: string; cta: string };
    benefits: { title: string; items: { title: string; body: string }[] };
    pricing: { title: string; body: string; cta: string };
  };
  forStudents: {
    hero: { eyebrow: string; title: string; subtitle: string; cta: string };
    benefits: { title: string; items: { title: string; body: string }[] };
  };
  about: {
    hero: { eyebrow: string; title: string; subtitle: string };
    mission: { title: string; body: string };
    values: { title: string; items: { title: string; body: string }[] };
  };
  pricing: {
    hero: { eyebrow: string; title: string; subtitle: string };
    plan: {
      name: string;
      price: string;
      period: string;
      features: string[];
      cta: string;
    };
    faq: { title: string; items: { q: string; a: string }[] };
  };
  contact: {
    hero: { eyebrow: string; title: string; subtitle: string };
    form: {
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      schoolLabel: string;
      schoolPlaceholder: string;
      topicLabel: string;
      topicOptions: {
        demo: string;
        pricing: string;
        press: string;
        other: string;
      };
      messageLabel: string;
      messagePlaceholder: string;
      submit: string;
      submitting: string;
      success: string;
      errorGeneric: string;
      errorRateLimit: string;
      errorMissing: string;
    };
    alternatives: {
      title: string;
      email: string;
    };
  };
  auth: {
    login: {
      title: string;
      subtitle: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      submitting: string;
      noAccount: string;
      signupLink: string;
      errorInvalid: string;
      errorGeneric: string;
    };
    signup: {
      title: string;
      subtitle: string;
      nameLabel: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      submitting: string;
      hasAccount: string;
      loginLink: string;
      confirmSent: string;
      errorGeneric: string;
      errorWeakPassword: string;
      errorEmailTaken: string;
    };
    signOut: string;
  };
  app: {
    landing: {
      title: string;
      subtitle: string;
      open: string;
    };
    roleTitles: {
      student: string;
      teacher: string;
      admin: string;
    };
    topbar: {
      search: string;
      notifications: string;
      userMenu: string;
      signOut: string;
    };
    sidebar: {
      student: {
        overview: string;
        lessons: string;
        chat: string;
        library: string;
      };
      teacher: {
        overview: string;
        classes: string;
        lessons: string;
        materials: string;
      };
      admin: {
        overview: string;
        schools: string;
        users: string;
        schedule: string;
        stats: string;
      };
    };
    pages: {
      student: {
        overview: {
          title: string;
          subtitle: string;
          emptyTitle: string;
          emptyBody: string;
        };
      };
      teacher: {
        overview: {
          title: string;
          subtitle: string;
          emptyTitle: string;
          emptyBody: string;
          classesHeading: string;
          coursesHeading: string;
          recentLessonsHeading: string;
          studentsCount: string;
          lessonsCount: string;
        };
        classes: {
          title: string;
          subtitle: string;
          empty: string;
          year: string;
          studentsLabel: string;
        };
        classDetail: {
          back: string;
          membersHeading: string;
          membersEmpty: string;
          coursesHeading: string;
          lessonsHeading: string;
        };
        lessons: {
          title: string;
          subtitle: string;
          empty: string;
          dateLabel: string;
          courseLabel: string;
          classLabel: string;
          statusLabel: string;
        };
        lessonDetail: {
          back: string;
          metaCourse: string;
          metaClass: string;
          metaTeacher: string;
          metaRecorded: string;
          notRecorded: string;
          materialsHeading: string;
          materialsEmpty: string;
          uploadLabel: string;
          uploadHint: string;
          uploadSubmit: string;
          uploading: string;
          uploadSuccess: string;
          uploadError: string;
          uploadTooLarge: string;
          uploadBadType: string;
          transcriptHeading: string;
          transcriptPending: string;
          transcriptProcessing: string;
          transcriptReady: string;
          transcriptFailed: string;
          transcriptComingSoon: string;
        };
        statuses: {
          pending: string;
          processing: string;
          ready: string;
          failed: string;
        };
      };
      admin: {
        overview: {
          title: string;
          subtitle: string;
          emptyTitle: string;
          emptyBody: string;
        };
        schedule: {
          title: string;
          subtitle: string;
          uploadLabel: string;
          uploadHint: string;
          uploadSubmit: string;
          uploading: string;
          success: string;
          errorInvalid: string;
          errorGeneric: string;
          tableEmpty: string;
        };
      };
    };
    common: {
      comingSoon: string;
      loading: string;
    };
  };
};
