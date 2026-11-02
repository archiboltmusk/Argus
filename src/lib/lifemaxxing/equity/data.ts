import type {
  EquityChildProfile,
  LowCostDiscoveryMission,
  PublicResourceMatch,
  OpportunityPathwayStep,
  EquityPilotSpecs,
} from "./types";

export const STUDENT_AARAV_PROFILE: EquityChildProfile = {
  id: "student-aarav-kolkata",
  name: "Aarav (Student A)",
  age: 12,
  grade: "Class 6",
  region: "Kolkata, West Bengal (Rural Periphery)",
  primaryLanguage: "Bengali",
  deviceAccess: "shared_family_phone",
  connectivity: "unreliable_2g_3g",
  tutorSupport: false,
  interestsObserved: [
    "Dismantles and rebuilds broken mechanical toys and household switches",
    "Intensely curious about plant growth cycles and rainwater drainage",
    "Excels at visual spatial puzzles and physical construction",
  ],
  learningGapsIdentified: [
    "Fractions and division (struggles with abstract algebraic notation)",
    "Written English sentence syntax (understands oral instructions better)",
  ],
  novelExperiencesLacking: [
    "Has never seen or written a line of computer code",
    "Has never touched scientific laboratory glassware or robotics kit",
    "Has never interacted with an engineer, scientist, or university mentor",
  ],
  learningVelocityScore: 89, // Learns remarkably fast after 1 physical visual demonstration
};

export const LOW_COST_DISCOVERY_MISSIONS: LowCostDiscoveryMission[] = [
  {
    id: "mission-botany-growth",
    title: "Investigate Why Two Plants Grow Differently",
    category: "scientific_curiosity",
    materialsRequired: "2 recycled plastic cups or mud pots, bean seeds, household soil, water, sunlight vs shade",
    whatItReveals: "First-principles empirical observation, systematic variable isolation (light vs dark), and causal note-taking.",
    bengaliPrompt: "দুটি পাত্রে একই বীজ বপন করুন—একটি রোদে রাখুন এবং অন্যটি ছায়ায় রাখুন। ৫ দিন ধরে পাতার রঙের পার্থক্য এবং বৃদ্ধির হার একটি কাগজে আঁকুন।",
    englishPrompt: "Plant identical seeds in 2 cups—keep one in sunlight and one in shade. Record growth and color variance daily for 5 days.",
    timeMinutes: 15,
    offlineReady: true,
  },
  {
    id: "mission-paper-bridge",
    title: "The Zero-Cost Cardboard Truss Bridge",
    category: "practical_engineering",
    materialsRequired: "1 sheet of used notebook paper, 2 books, small coins or stones as weights",
    whatItReveals: "Mechanical structural efficiency, tension vs compression concepts, and iterative prototyping velocity.",
    bengaliPrompt: "একটি কাগজের পাতাকে ভাঁজ করে দুটি বইয়ের মাঝে সেতু তৈরি করুন। দেখুন কোন ভাঁজের সেতু সবচেয়ে বেশি কয়েনের ওজন ধরে রাখতে পারে।",
    englishPrompt: "Fold a single paper sheet into corrugated or triangle beams across 2 books. Test how many coins it supports before collapsing.",
    timeMinutes: 25,
    offlineReady: true,
  },
  {
    id: "mission-market-fractions",
    title: "The Village Market Fraction Map",
    category: "logical_reasoning",
    materialsRequired: "Pencil, paper, dried chickpeas or pebbles",
    whatItReveals: "Converts abstract fraction formulas into physical division and trade ratios without textbook intimidation.",
    bengaliPrompt: "১২টি ছোলা বা পাথরের টুকরো দিয়ে ৪ বন্ধুর মাঝে সমানভাবে ভাগ করে ৩/৪ এবং ১/২ অংশের বাস্তব হিসাব বের করুন।",
    englishPrompt: "Use 12 pebbles to represent market vegetables; demonstrate 1/2, 1/4, and 3/4 shares through concrete physical grouping.",
    timeMinutes: 20,
    offlineReady: true,
  },
  {
    id: "mission-oral-storyteller",
    title: "Local Legend & Interview Archive",
    category: "communication",
    materialsRequired: "Notebook, pencil, 1 elderly family member or village artisan",
    whatItReveals: "Oral history interviewing, empathetic listening, and structured narrative synthesis.",
    bengaliPrompt: "আপনার ঠাকুরমা বা স্থানীয় কারিগরের কাছ থেকে শৈশবের একটি কাজ বা গল্প শুনুন এবং প্রধান ৩টি শিক্ষা লিখে বা মুখে রেকর্ড করুন।",
    englishPrompt: "Interview a grandparent or local artisan about their craft; document the 3 most important lessons they learned.",
    timeMinutes: 30,
    offlineReady: true,
  },
];

export const PUBLIC_RESOURCE_INDEX: PublicResourceMatch[] = [
  {
    portal: "DIKSHA",
    title: "Class 6 Mathematics (Bengali Medium) - Animated Visual Fractions",
    officialUrl: "https://diksha.gov.in",
    cost: "100% Free / Open Access",
    format: "Offline Downloadable PDF",
    eligibilityFilter: "Universal Open Access (NCERT/State Curriculum aligned)",
    description: "Official NCERT West Bengal State Board curriculum translated into colloquial Bengali with visual step-by-step diagrammatic proofs.",
  },
  {
    portal: "SWAYAM",
    title: "Young Engineers Tinkering Lab: Physical Experiments at Home",
    officialUrl: "https://swayam.gov.in",
    cost: "100% Free / Open Access",
    format: "Bilingual Interactive Video",
    eligibilityFilter: "Open for Middle School Students (Class 6-8)",
    description: "Govt-certified hands-on STEM exploration modules designed specifically for rural schools using household recycled objects.",
  },
  {
    portal: "National Scholarship Portal (NSP)",
    title: "National Means-cum-Merit Scholarship Scheme (NMMSS)",
    officialUrl: "https://www.nsp.gov.in",
    cost: "100% Free / Open Access",
    format: "Govt Merit Scholarship",
    eligibilityFilter: "Class 8 public school students whose parental annual income ≤ ₹3,50,000",
    description: "Provides ₹12,000 per annum to arrest dropouts and support secondary education across Class 9 to 12.",
  },
  {
    portal: "Community Learning Hub",
    title: "Kolkata District Supervised Tinkering & Computer Center",
    officialUrl: "https://diksha.gov.in",
    cost: "100% Free / Open Access",
    format: "Physical Lab Access",
    eligibilityFilter: "Weekly scheduled visits for rural students without personal laptops",
    description: "Vetted community center providing supervised access to Linux desktop workstations, microcontrollers, and peer mentors on Saturday mornings.",
  },
];

export const AARAV_OPPORTUNITY_PATHWAY: OpportunityPathwayStep[] = [
  {
    stage: "foundation_fix",
    actionTitle: "Hands-on Visual Fractions via Building Projects",
    localLanguageNote: "বইয়ের কঠিন সূত্রের বদলে মাটির ইট বা কাঠের টুকরো মেপে ভগ্নাংশ বোঝার সহজ পাঠ।",
    resourceNeeded: "Downloadable DIKSHA Bengali Class 6 Module 3 (Offline Cached)",
    successProof: "Aarav solves 5 physical division puzzles independently with 100% accuracy.",
  },
  {
    stage: "hands_on_experiment",
    actionTitle: "Build the Cardboard Truss Bridge Experiment",
    localLanguageNote: "কাগজের ভাঁজ ও ওজনের ভারসাম্য নিয়ে প্রথম প্রকৌশল পরীক্ষা।",
    resourceNeeded: "Household paper, 2 textbooks, 15 coins",
    successProof: "Bridge supports 250g weight; Aarav records why triangle trusses resist bending.",
  },
  {
    stage: "community_hub_access",
    actionTitle: "First Supervised Scratch Block-Coding Session",
    localLanguageNote: "নিকটবর্তী কমিউনিটি সেন্টারে প্রথম কম্পিউটার স্ক্র্যাচ প্রোগ্রামিং অভিজ্ঞতা।",
    resourceNeeded: "Shared community center desktop (Saturday 10:00–11:30 AM)",
    successProof: "Creates an animated Bengali solar system simulator with zero prior computer experience.",
  },
  {
    stage: "mentorship_bridge",
    actionTitle: "Connect with Supervised Engineering Student Mentor",
    localLanguageNote: "কলকাতার একজন প্রকৌশল শিক্ষার্থীর সাথে পাক্ষিক নির্দেশনামূলক আলোচনা।",
    resourceNeeded: "15-minute voice call supervised by school teacher or guardian",
    successProof: "Aarav understands what mechanical engineers do in real factories and water treatment plants.",
  },
];

export const KOLKATA_PILOT_SPEC: EquityPilotSpecs = {
  district: "Kolkata & South 24 Parganas, West Bengal",
  targetCohortSize: 30,
  durationWeeks: 12,
  safeguards: {
    unicefCompliance: true,
    zeroMonetizationGuarantee: true,
    guardianSupervisedMentorship: true,
    noPublicRankings: true,
  },
};
