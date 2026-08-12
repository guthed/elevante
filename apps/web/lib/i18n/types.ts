export type KlassprovStrings = {
  newTest: string;
  title: string;
  pickClass: string;
  pickLessons: string;
  questionCount: string;
  closed: string;
  open: string;
  reasoning: string;
  generate: string;
  publish: string;
  regenerate: string;
  takeTest: string;
  submit: string;
  awaitingReview: string;
  release: string;
  released: string;
  pendingReview: string;
  notStarted: string;
  overallFeedback: string;
  points: string;
  save: string;
  remove: string;
};

export type Dictionary = {
  meta: {
    siteName: string;
    tagline: string;
    description: string;
  };
  nav: {
    home: string;
    forSchools: string;
    forTeachers: string;
    forStudents: string;
    try: string;
    pricing: string;
    about: string;
    blog: string;
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
        examPrep: string;
        learnerProfile: string;
        classTests: string;
      };
      teacher: {
        overview: string;
        classes: string;
        lessons: string;
        materials: string;
        sharedTests: string;
        classTests: string;
      };
      admin: {
        overview: string;
        schools: string;
        classes: string;
        courses: string;
        users: string;
        schedule: string;
        stats: string;
      };
    };
    // Korta etiketter för mobil bottom-nav (sidebar-etiketterna är för långa).
    mobileNav: {
      student: {
        overview: string;
        library: string;
        chat: string;
        examPrep: string;
        learnerProfile: string;
        classTests: string;
      };
      teacher: {
        overview: string;
        classes: string;
        lessons: string;
        sharedTests: string;
        classTests: string;
      };
      admin: {
        overview: string;
        schools: string;
        classes: string;
        courses: string;
        users: string;
        schedule: string;
        stats: string;
      };
    };
    navDescriptions: {
      student: {
        overview: string;
        library: string;
        chat: string;
        examPrep: string;
        learnerProfile: string;
        classTests: string;
      };
      teacher: {
        overview: string;
        classes: string;
        lessons: string;
        sharedTests: string;
        classTests: string;
      };
      admin: {
        overview: string;
        schools: string;
        classes: string;
        courses: string;
        users: string;
        schedule: string;
        stats: string;
      };
    };
    account: {
      navLabel: string;
      title: string;
      subtitle: string;
      profileHeading: string;
      nameLabel: string;
      emailLabel: string;
      emailHint: string;
      saveName: string;
      saving: string;
      nameSaved: string;
      securityHeading: string;
      newPasswordLabel: string;
      confirmPasswordLabel: string;
      savePassword: string;
      passwordSaved: string;
      languageHeading: string;
      errorInvalid: string;
      errorWeak: string;
      errorMismatch: string;
      errorGeneric: string;
    };
    pages: {
      student: {
        overview: {
          title: string;
          subtitle: string;
          emptyTitle: string;
          emptyBody: string;
          recentLessonsHeading: string;
          coursesHeading: string;
          chatCta: string;
          openLibrary: string;
          askEyebrow: string;
          askTitle: string;
          askPlaceholder: string;
          askCta: string;
          askExample1: string;
          askExample2: string;
          continueHeading: string;
          continueLabel: string;
          continueCta: string;
          examQuickHeading: string;
          examQuickCta: string;
        };
        library: {
          title: string;
          subtitle: string;
          empty: string;
          allCourses: string;
          recordedLabel: string;
          notRecorded: string;
        };
        lessonDetail: {
          back: string;
          metaCourse: string;
          metaTeacher: string;
          metaRecorded: string;
          notRecorded: string;
          transcriptHeading: string;
          transcriptPending: string;
          materialsHeading: string;
          materialsEmpty: string;
        };
        chat: {
          title: string;
          subtitle: string;
          openLessonChat: string;
          startCourseChat: string;
          pickCourse: string;
          pickLesson: string;
          empty: string;
          inputPlaceholder: string;
          send: string;
          sending: string;
          assistantTyping: string;
          streamError: string;
          guardrailNotice: string;
          sourcesHeading: string;
          sourceFromLesson: string;
          sourcesShowMore: string;
          sourcesShowLess: string;
          mockNotice: string;
          newChat: string;
          historyHeading: string;
          noHistory: string;
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
          heroEyebrow: string;
          heroCtaLabel: string;
          heroQuestionWord: string;
          heroConceptPrefix: string;
          quickHeading: string;
          quickLessons: string;
          quickTests: string;
          chipsCourses: string;
          chipsStudents: string;
          chipsClasses: string;
          chipsCourse: string;
          chipsStudent: string;
          chipsClass: string;
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
          delete: string;
          deleted: string;
          undo: string;
          deleteError: string;
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
          schoolsLabel: string;
          studentsLabel: string;
          teachersLabel: string;
          lessonsLabel: string;
          transcribedLabel: string;
          recentLessonsHeading: string;
          quickActionsHeading: string;
          uploadSchedule: string;
          manageUsers: string;
          manageSchools: string;
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
          dayColumn: string;
          startColumn: string;
          endColumn: string;
          roomColumn: string;
        };
        users: {
          title: string;
          subtitle: string;
          empty: string;
          nameColumn: string;
          emailColumn: string;
          roleColumn: string;
          updateRole: string;
          updating: string;
          updateSuccess: string;
          updateError: string;
          remove: {
            button: string;
            removing: string;
            confirm: string;
            errorLastAdmin: string;
            errorGeneric: string;
          };
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
            reasonInvalidRow: string;
            reasonAlreadyExists: string;
            reasonClassLinkFailed: string;
            reasonGeneric: string;
          };
          detail: {
            back: string;
            createdLabel: string;
            classesHeading: string;
            classesEmpty: string;
            coursesHeading: string;
            coursesEmpty: string;
          };
        };
        schools: {
          title: string;
          subtitle: string;
          empty: string;
          createTitle: string;
          nameLabel: string;
          slugLabel: string;
          slugHint: string;
          countryLabel: string;
          createSubmit: string;
          creating: string;
          createSuccess: string;
          createError: string;
          createdLabel: string;
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
          staff: {
            heading: string;
            hint: string;
            emailLabel: string;
            grantSubmit: string;
            granting: string;
            success: string;
            errorNotFound: string;
            errorSelf: string;
            errorGeneric: string;
            listEmpty: string;
            revoke: string;
            revoking: string;
          };
          detail: {
            back: string;
            studentsLabel: string;
            teachersLabel: string;
            adminsLabel: string;
            classesHeading: string;
            classesEmpty: string;
            coursesHeading: string;
            coursesEmpty: string;
            adminsHeading: string;
            adminsEmpty: string;
          };
        };
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
          codeHint: string;
          nameLabel: string;
          createSubmit: string;
          creating: string;
          createSuccess: string;
          createErrorDuplicate: string;
          createErrorGeneric: string;
        };
        stats: {
          title: string;
          subtitle: string;
          weeklyHeading: string;
          statusHeading: string;
          activityHeading: string;
          noData: string;
        };
      };
    };
    common: {
      comingSoon: string;
      loading: string;
    };
    klassprov: KlassprovStrings;
  };
};
