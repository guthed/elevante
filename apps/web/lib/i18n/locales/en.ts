import type { Dictionary } from '../types';

const en: Dictionary = {
  meta: {
    siteName: 'Elevante',
    tagline: 'Elevante remembers everything you learn at school',
    description:
      'Elevante records, transcribes and remembers every classroom lesson — so students can review whenever they need.',
  },
  nav: {
    home: 'Home',
    forSchools: 'For schools',
    forTeachers: 'For teachers',
    forStudents: 'For students',
    pricing: 'Pricing',
    about: 'About',
    contact: 'Contact',
    bookDemo: 'Book a demo',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    switchLanguage: 'Change language',
  },
  footer: {
    rights: 'All rights reserved.',
    madeIn: 'Built in Stockholm',
    navHeader: 'Navigate',
    companyHeader: 'Company',
  },
  home: {
    hero: {
      title: 'School in your pocket',
      subtitle:
        'Elevante records, transcribes and remembers every classroom lesson — so students can review whenever they need.',
      ctaPrimary: 'Book a demo',
      ctaSecondary: 'Learn more',
    },
    problem: {
      eyebrow: 'The problem',
      title: "The classroom hasn't changed in fifty years.",
      items: [
        {
          title: 'Students miss lessons',
          body: 'Illness, stress, distractions. Once something is forgotten, there is no way back.',
        },
        {
          title: "Teachers can't reach everyone",
          body: 'One teacher, thirty students. The brave ones get answers — the rest guess.',
        },
        {
          title: 'School is still analogue',
          body: 'The world has gone digital. The classroom is still notebooks and memory.',
        },
      ],
    },
    solution: {
      eyebrow: 'The solution',
      title: 'Elevante remembers everything you learn at school',
      subtitle:
        'Three simple steps. The teacher taps a button. Every student gets a private AI tutor that was in the room for every lesson.',
      steps: [
        {
          number: '01',
          title: 'The teacher records',
          body: 'One tap in the app. No cables, no installations, no IT meetings.',
        },
        {
          number: '02',
          title: 'AI transcribes',
          body: 'Swedish speech recognition, all in the EU. The raw audio is deleted when the transcript is ready.',
        },
        {
          number: '03',
          title: 'The student asks',
          body: 'Chat with the lesson. Get answers grounded only in what the teacher actually said.',
        },
      ],
    },
    audiences: {
      eyebrow: 'Who it is for',
      title: 'Built for everyone in the classroom',
      student: {
        title: 'For students',
        body: 'Review when it suits you, ask when you dare, prepare for exams without guessing.',
        cta: 'More for students',
      },
      teacher: {
        title: 'For teachers',
        body: 'Stop repeating yourself. Focus on teaching — Elevante stores the rest.',
        cta: 'More for teachers',
      },
    },
    stats: {
      eyebrow: 'The numbers',
      title: 'A simple business case for schools',
      items: [
        { value: '€45', label: 'per student per year' },
        { value: '71.7%', label: 'operating margin' },
        { value: '2026', label: 'pilot starts' },
      ],
    },
    finalCta: {
      title: 'Ready to modernise your school?',
      subtitle:
        "We show Elevante in 30 minutes. No installation, no procurement paperwork.",
      cta: 'Book a demo',
    },
  },
  forSchools: {
    hero: {
      eyebrow: 'For schools',
      title: 'AI in the classroom — without extra work for teachers',
      subtitle:
        'Elevante is built to be rolled out across a school in a single afternoon. No new hardware, no long procurement cycles.',
      cta: 'Contact us for a quote',
    },
    benefits: {
      title: 'Why schools choose Elevante',
      items: [
        {
          title: 'GDPR-safe from the ground up',
          body: 'All data stays in the EU. Raw audio is deleted after transcription. Full consent flow for minors.',
        },
        {
          title: 'Simple to get going',
          body: 'No equipment, no installations. The teacher downloads the app and taps REC.',
        },
        {
          title: 'Insights for leadership',
          body: 'See which courses are used most, where students get stuck, and how Elevante supports your school.',
        },
      ],
    },
    pricing: {
      title: 'A simple pricing model',
      body: '€45 per student per year. Volume discounts for municipalities. No installation, no licence administration.',
      cta: 'Contact us',
    },
  },
  forStudents: {
    hero: {
      eyebrow: 'For students',
      title: 'Never miss what the teacher said',
      subtitle:
        'You are more than good notes. Elevante is your private tutor that remembers every lesson and answers what you actually want to ask.',
      cta: 'Ask your school about Elevante',
    },
    benefits: {
      title: 'What you can do',
      items: [
        {
          title: 'Review whenever it suits you',
          body: "Go through yesterday's maths lesson before the exam — without reading a whole textbook.",
        },
        {
          title: 'Ask without raising your hand',
          body: "Type in your own words. Elevante answers based on what your teacher said in class.",
        },
        {
          title: 'Prepare with confidence',
          body: 'Ask Elevante to summarise a chapter, explain a concept, or make a practice question for you.',
        },
      ],
    },
  },
  about: {
    hero: {
      eyebrow: 'About us',
      title: 'We are building the school we wished we had.',
      subtitle:
        'Elevante is a Swedish team with backgrounds in education, technology and product design. We built Elevante because we wished we had it when we went to school ourselves.',
    },
    mission: {
      title: 'Our mission',
      body: 'We believe a good education should not depend on how brave you are, what mood you are in, or how many private tutors your parents can afford. Elevante is the tool that lets every student ask their questions — without feeling stupid, without disturbing anyone, and without waiting for the next lesson.',
    },
    values: {
      title: 'What we care about',
      items: [
        {
          title: 'GDPR is not a checkbox',
          body: 'All data stays in the EU. Raw audio is deleted. Consent flows for minors are built in from day one.',
        },
        {
          title: 'Strict source grounding',
          body: 'Elevante only answers from what was actually said in class. We do not make things up.',
        },
        {
          title: "Teachers' time is sacred",
          body: "We don't add tasks to a teacher's already full day. One tap, nothing more.",
        },
      ],
    },
  },
  pricing: {
    hero: {
      eyebrow: 'Pricing',
      title: 'Straight-forward pricing. No surprises.',
      subtitle:
        '€45 per student per year. Everything included. No installations, no licence administration, no procurement circus.',
    },
    plan: {
      name: 'School subscription',
      price: '€45',
      period: 'per student per year',
      features: [
        'Unlimited lessons and questions',
        'Swedish speech recognition (KB-Whisper, EU)',
        'GDPR-safe storage inside the EU',
        'Student, teacher and admin views',
        'Insights for leadership',
        'Support and onboarding included',
      ],
      cta: 'Contact us',
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          q: "What's included in the price?",
          a: 'Everything. Unlimited lessons, unlimited questions, all three views (student, teacher, admin), support and onboarding. No add-ons.',
        },
        {
          q: 'Is there a lock-in?',
          a: 'One year at a time, cancellable with 3 months notice. We want you to stay because we deliver — not because we trapped you.',
        },
        {
          q: 'How do you handle GDPR?',
          a: 'All data stays in the EU. Raw audio is deleted after transcription. We have consent flows for minors and a ready-to-sign data processing agreement.',
        },
        {
          q: 'How does it work for small schools?',
          a: 'Same price, same product. No minimum. Start with one class before rolling it out to the whole school — that works too.',
        },
      ],
    },
  },
  contact: {
    hero: {
      eyebrow: 'Contact',
      title: 'Get in touch.',
      subtitle:
        "Write a few lines and we'll book a half-hour. We'll show Elevante live and answer anything you are wondering.",
    },
    form: {
      nameLabel: 'Name',
      namePlaceholder: 'Anna Andersson',
      emailLabel: 'Email',
      emailPlaceholder: 'anna@school.com',
      schoolLabel: 'School or organisation',
      schoolPlaceholder: 'School name',
      topicLabel: 'Topic',
      topicOptions: {
        demo: 'I want to book a demo',
        pricing: 'I have pricing questions',
        press: 'Press or investors',
        other: 'Something else',
      },
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us briefly what you are wondering…',
      submit: 'Send',
      submitting: 'Sending…',
      success: "Thanks! We'll get back to you shortly.",
      errorGeneric: 'Something went wrong. Please try again, or email john@guthed.se directly.',
      errorRateLimit: 'Too many attempts. Wait a minute and try again.',
      errorMissing: 'Please fill in every field before sending.',
    },
    alternatives: {
      title: 'Or email us directly',
      email: 'john@guthed.se',
    },
  },
  auth: {
    login: {
      title: 'Sign in',
      subtitle: 'Pick up where you left off.',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: "Don't have an account?",
      signupLink: 'Create one',
      errorInvalid: 'Invalid email or password.',
      errorGeneric: 'Something went wrong. Please try again.',
    },
    signup: {
      title: 'Create account',
      subtitle: 'For schools with an Elevante agreement.',
      nameLabel: 'Your name',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      submit: 'Create account',
      submitting: 'Creating…',
      hasAccount: 'Already have an account?',
      loginLink: 'Sign in',
      confirmSent: 'Check your inbox — we sent you a confirmation link.',
      errorGeneric: 'Something went wrong. Please try again.',
      errorWeakPassword: 'Password is too weak. Minimum 8 characters.',
      errorEmailTaken: 'That email is already registered.',
    },
    signOut: 'Sign out',
  },
  app: {
    landing: {
      title: 'Pick a view',
      subtitle:
        'Development role switcher. Once authentication is in place in Phase 2, the role will be picked automatically based on your account.',
      open: 'Open',
    },
    roleTitles: {
      student: 'Student',
      teacher: 'Teacher',
      admin: 'Administrator',
    },
    topbar: {
      search: 'Search lessons…',
      notifications: 'Notifications',
      userMenu: 'Your profile',
      signOut: 'Sign out',
    },
    sidebar: {
      student: {
        overview: 'Overview',
        lessons: 'My lessons',
        chat: 'Ask Elevante',
        library: 'Library',
        examPrep: 'Exam prep',
        learnerProfile: 'Your learner profile',
      },
      teacher: {
        overview: 'Overview',
        classes: 'My classes',
        lessons: 'Lessons',
        materials: 'Materials',
        sharedTests: 'Shared tests',
      },
      admin: {
        overview: 'Overview',
        schools: 'Schools',
        users: 'Users',
        schedule: 'Schedule',
        stats: 'Statistics',
      },
    },
    pages: {
      student: {
        overview: {
          title: 'Welcome back',
          subtitle:
            'All the lessons you have attended show up here as soon as your teacher uploads them.',
          emptyTitle: 'No lessons yet',
          emptyBody:
            'The moment your teacher taps REC, Elevante starts saving for you. Come back tomorrow.',
          recentLessonsHeading: 'Recent lessons',
          coursesHeading: 'Your courses',
          chatCta: 'Ask Elevante',
          openLibrary: 'Open library',
        },
        library: {
          title: 'Library',
          subtitle: 'Every lesson you have access to.',
          empty: 'Your library is empty. Lessons will show up here as they happen.',
          allCourses: 'All courses',
          recordedLabel: 'Recorded',
          notRecorded: 'Not recorded yet',
        },
        lessonDetail: {
          back: '← Library',
          metaCourse: 'Course',
          metaTeacher: 'Teacher',
          metaRecorded: 'Recorded',
          notRecorded: 'Not recorded yet',
          transcriptHeading: 'Transcript',
          transcriptPending:
            "Transcript isn't ready yet. You can still ask questions about the lesson.",
          materialsHeading: 'Materials',
          materialsEmpty: 'No materials uploaded.',
        },
        chat: {
          title: 'Ask Elevante',
          subtitle:
            "Ask questions about your lessons. Elevante only answers from what your teacher actually said — and shows you where the answer comes from.",
          openLessonChat: 'Chat about this lesson',
          startCourseChat: 'Chat about the course',
          pickCourse: 'Pick a course',
          pickLesson: 'Pick a lesson',
          empty: 'No chat yet — type a question below.',
          inputPlaceholder: 'What do you want to know?',
          send: 'Send',
          sending: 'Sending…',
          assistantTyping: 'Elevante is typing…',
          guardrailNotice: "That wasn't covered in this lesson.",
          sourcesHeading: 'Sources',
          sourceFromLesson: 'From the lesson',
          sourcesShowMore: 'Show more sources',
          sourcesShowLess: 'Show fewer',
          mockNotice:
            'Mocked answer — real RAG turns on in Phase 6 once the KB-Whisper pipeline is live.',
          newChat: 'New chat',
          historyHeading: 'Previous chats',
          noHistory: 'No previous chats yet.',
        },
      },
      teacher: {
        overview: {
          title: 'Your classes',
          subtitle: 'An overview of your courses, lessons and materials.',
          emptyTitle: 'No classes linked yet',
          emptyBody:
            'The admin team is linking your schedule. Your classes will appear here as soon as it is ready.',
          classesHeading: 'Classes',
          coursesHeading: 'Courses',
          recentLessonsHeading: 'Recent lessons',
          studentsCount: 'students',
          lessonsCount: 'lessons',
        },
        classes: {
          title: 'Classes',
          subtitle: 'The classes you teach.',
          empty: 'No classes linked to you yet.',
          year: 'Year',
          studentsLabel: 'students',
        },
        classDetail: {
          back: '← All classes',
          membersHeading: 'Students',
          membersEmpty: 'No students linked to this class yet.',
          coursesHeading: 'Courses',
          lessonsHeading: 'Recent lessons',
        },
        lessons: {
          title: 'Lessons',
          subtitle: 'All your recorded and planned lessons.',
          empty:
            'No lessons yet. Tap REC in the mobile app and they will show up here.',
          dateLabel: 'Date',
          courseLabel: 'Course',
          classLabel: 'Class',
          statusLabel: 'Status',
        },
        lessonDetail: {
          back: '← All lessons',
          metaCourse: 'Course',
          metaClass: 'Class',
          metaTeacher: 'Teacher',
          metaRecorded: 'Recorded',
          notRecorded: 'Not recorded yet',
          materialsHeading: 'Materials',
          materialsEmpty: 'No materials uploaded yet.',
          uploadLabel: 'Add material (PDF, image, document)',
          uploadHint: 'Max 500 MB. PDF, PNG, JPG, DOCX, PPTX, XLSX, TXT.',
          uploadSubmit: 'Upload',
          uploading: 'Uploading…',
          uploadSuccess: 'Material saved.',
          uploadError: 'Something went wrong during upload.',
          uploadTooLarge: 'File is too large (max 500 MB).',
          uploadBadType: 'File type not supported.',
          transcriptHeading: 'Transcript',
          transcriptPending: 'Waiting for recording',
          transcriptProcessing: 'Transcribing now',
          transcriptReady: 'Ready',
          transcriptFailed: 'Failed',
          transcriptComingSoon:
            'Transcription is enabled in Phase 6 once the KB-Whisper pipeline is in place.',
        },
        statuses: {
          pending: 'Pending',
          processing: 'Processing',
          ready: 'Ready',
          failed: 'Failed',
        },
      },
      admin: {
        overview: {
          title: 'Administration',
          subtitle: 'Manage schools, users, schedules and statistics.',
          emptyTitle: 'No schools added',
          emptyBody: 'Start by adding a school and uploading its schedule.',
          schoolsLabel: 'schools',
          studentsLabel: 'students',
          teachersLabel: 'teachers',
          lessonsLabel: 'lessons',
          transcribedLabel: 'transcribed',
          recentLessonsHeading: 'Recent lessons',
          quickActionsHeading: 'Quick actions',
          uploadSchedule: 'Upload schedule',
          manageUsers: 'Manage users',
          manageSchools: 'Manage schools',
        },
        schedule: {
          title: 'Schedule',
          subtitle:
            'Upload a CSV of lessons (course, class, day, start time, end time, room).',
          uploadLabel: 'Choose CSV file',
          uploadHint:
            'Headers: course_code, class_name, day, start_time, end_time, room',
          uploadSubmit: 'Upload',
          uploading: 'Uploading…',
          success: 'Schedule updated.',
          errorInvalid: 'The CSV is malformed. Check the header row.',
          errorGeneric: 'Something went wrong during upload.',
          tableEmpty: 'No timeslots for this school yet.',
        },
        users: {
          title: 'Users',
          subtitle: 'Manage students, teachers and admins in your school.',
          empty: 'No users in your school yet.',
          nameColumn: 'Name',
          emailColumn: 'Email',
          roleColumn: 'Role',
          updateRole: 'Update',
          updating: 'Updating…',
          updateSuccess: 'Role updated.',
          updateError: 'Could not update role.',
        },
        schools: {
          title: 'Schools',
          subtitle: 'Overview of schools in Elevante. Add a new one if needed.',
          empty: 'No schools yet. Create the first below.',
          createTitle: 'Add school',
          nameLabel: 'Name',
          slugLabel: 'URL slug',
          countryLabel: 'Country (ISO)',
          createSubmit: 'Create',
          creating: 'Creating…',
          createSuccess: 'School created.',
          createError: 'Could not create the school.',
          createdLabel: 'Created',
        },
        stats: {
          title: 'Statistics',
          subtitle: 'Activity in your school.',
          weeklyHeading: 'Lessons in the last 7 days',
          statusHeading: 'Transcript status',
          activityHeading: 'Active users',
          noData: 'No data yet. Statistics fill up over time.',
        },
      },
    },
    common: {
      comingSoon: 'Coming in the next phase',
      loading: 'Loading…',
    },
  },
};

export default en;
