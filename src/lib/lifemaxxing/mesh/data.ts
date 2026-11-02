import type {
  KnowledgeConceptNode,
  MeshPersonalizedPathway,
} from "./types";

export const SAMPLE_MESH_CONCEPTS: KnowledgeConceptNode[] = [
  {
    id: "math-arithmetic-whole",
    name: "Whole Number Operations",
    domain: "Mathematics",
    prerequisiteConceptIds: [],
    difficultyLevel: 1,
    firstPrincipleExplanation: "Counting, grouping, and positional place value in base 10.",
    provenance: {
      sourceStandard: "NCERT Class 5 / Common Core",
      evidenceRating: "official_curriculum_standard",
      license: "public_domain",
    },
    connectedResources: [
      { title: "DIKSHA Base 10 Grouping Drills", format: "offline_downloadable_pdf", language: "English", url: "https://diksha.gov.in", isFree: true },
      { title: "বাংলা স্থানীয় মান ও সংখ্যা ধারণা", format: "interactive_widget", language: "Bengali", url: "https://diksha.gov.in", isFree: true },
    ],
    falsifiableMasteryCheck: "100% accuracy on multi-digit carrying addition and borrowing subtraction within 90 seconds.",
  },
  {
    id: "math-fractions-division",
    name: "Fractions as Equal Parts & Division Ratios",
    domain: "Mathematics",
    prerequisiteConceptIds: ["math-arithmetic-whole"],
    difficultyLevel: 2,
    firstPrincipleExplanation: "A fraction represents splitting a unified whole into equal denominator shares and taking numerator portions.",
    provenance: {
      sourceStandard: "NCERT Class 6 Math Chapter 7",
      evidenceRating: "official_curriculum_standard",
      license: "open_access_cc",
    },
    connectedResources: [
      { title: "Visual Fraction Area Models (Khan Academy OER)", format: "interactive_widget", language: "English", url: "https://khanacademy.org", isFree: true },
      { title: "মাটির ইট ও কাগজের ভাঁজে ভগ্নাংশের সহজ রূপ", format: "offline_downloadable_pdf", language: "Bengali", url: "https://diksha.gov.in", isFree: true },
    ],
    falsifiableMasteryCheck: "Identifies and compares 3/4 vs 5/8 using physical visual bar drawing without calculating common denominators.",
  },
  {
    id: "math-variables-algebra",
    name: "Algebraic Variables & Unknowns",
    domain: "Mathematics",
    prerequisiteConceptIds: ["math-fractions-division"],
    difficultyLevel: 2,
    firstPrincipleExplanation: "A variable 'x' is simply a placeholder box waiting for a value that preserves the balance of an equation.",
    provenance: {
      sourceStandard: "NCERT Class 6 Math Chapter 11",
      evidenceRating: "official_curriculum_standard",
      license: "open_access_cc",
    },
    connectedResources: [
      { title: "Balance Scale Metaphor for Linear Equations", format: "practice_drill", language: "English", url: "https://phet.colorado.edu", isFree: true },
    ],
    falsifiableMasteryCheck: "Solves 2x + 4 = 12 using physical balance scale balance concepts rather than rote rules.",
  },
  {
    id: "ai-python-foundations",
    name: "Python Programming: Control Flow & Variables",
    domain: "Artificial Intelligence",
    prerequisiteConceptIds: ["math-variables-algebra"],
    difficultyLevel: 2,
    firstPrincipleExplanation: "Translating human logic into sequential conditional instructions and state memory.",
    provenance: {
      sourceStandard: "MIT 6.0001 / UNESCO OER Open Courseware",
      evidenceRating: "A_grade_meta_analysis",
      license: "open_access_cc",
    },
    connectedResources: [
      { title: "Python for Absolute Beginners (Colab Interactive)", format: "interactive_widget", language: "English", url: "https://colab.research.google.com", isFree: true },
    ],
    falsifiableMasteryCheck: "Writes a Python loop calculating prime numbers under 50 without consulting external syntax guides.",
  },
  {
    id: "ai-data-statistics",
    name: "Statistical Variance, Mean & Distributions",
    domain: "Artificial Intelligence",
    prerequisiteConceptIds: ["ai-python-foundations"],
    difficultyLevel: 3,
    firstPrincipleExplanation: "Quantifying spread, uncertainty, and central tendency in real-world messy observation datasets.",
    provenance: {
      sourceStandard: "Stanford CS229 Prerequisite Review",
      evidenceRating: "peer_reviewed",
      license: "open_access_cc",
    },
    connectedResources: [
      { title: "Interactive Probability Distribution Playground", format: "interactive_widget", language: "English", url: "https://seeing-theory.brown.edu", isFree: true },
    ],
    falsifiableMasteryCheck: "Calculates standard deviation on a 10-patient blood pressure array and interprets standard error.",
  },
  {
    id: "ai-linear-regression-gradient",
    name: "Gradient Descent & Loss Optimization",
    domain: "Artificial Intelligence",
    prerequisiteConceptIds: ["ai-data-statistics"],
    difficultyLevel: 4,
    firstPrincipleExplanation: "Finding the lowest point in a loss surface by stepping in the opposite direction of the slope.",
    provenance: {
      sourceStandard: "Fast.ai Practical Deep Learning for Coders",
      evidenceRating: "A_grade_meta_analysis",
      license: "open_access_cc",
    },
    connectedResources: [
      { title: "2D Gradient Descent Surface Simulator", format: "interactive_widget", language: "English", url: "https://distill.pub", isFree: true },
    ],
    falsifiableMasteryCheck: "Implements single-variable linear regression from scratch in pure Python without calling scikit-learn.",
  },
];

export const DEMO_AI_PATHWAY: MeshPersonalizedPathway = {
  learnerContext: {
    name: "Aarav (Student A / Aspiring Builder)",
    goal: "Learn Machine Learning Foundations to Build Clinical Prediction Tools",
    deviceTier: "low_cost_phone",
    availableHoursDaily: 2,
    languagePreference: "Bengali (Bilingual English technical terms)",
    diagnosedKnowledgeState: {
      mastered: ["math-arithmetic-whole"],
      currentGaps: ["math-fractions-division", "math-variables-algebra"],
      unencountered: ["ai-python-foundations", "ai-data-statistics", "ai-linear-regression-gradient"],
    },
  },
  orderedMilestones: [
    {
      stepNumber: 1,
      conceptId: "math-fractions-division",
      conceptName: "Fractions as Equal Parts & Division Ratios",
      prerequisiteStatus: "needs_foundation_remediation",
      prescribedResource: "Offline Bengali Visual Fractions PDF (DIKSHA West Bengal)",
      estimatedMinutes: 45,
      deliverableProof: "Demonstrate 3/4 vs 5/8 using cardboard strips and market pebbles",
    },
    {
      stepNumber: 2,
      conceptId: "math-variables-algebra",
      conceptName: "Algebraic Variables & Unknowns",
      prerequisiteStatus: "prerequisites_cleared",
      prescribedResource: "PhET Interactive Balance Scale Simulations",
      estimatedMinutes: 40,
      deliverableProof: "Balance 5 equations physically before writing code",
    },
    {
      stepNumber: 3,
      conceptId: "ai-python-foundations",
      conceptName: "Python Programming: Control Flow & Variables",
      prerequisiteStatus: "prerequisites_cleared",
      prescribedResource: "Browser-based Google Colab Micro-Exercises",
      estimatedMinutes: 60,
      deliverableProof: "Build a BMI & health risk threshold calculator in 25 lines of Python",
    },
    {
      stepNumber: 4,
      conceptId: "ai-data-statistics",
      conceptName: "Statistical Variance, Mean & Distributions",
      prerequisiteStatus: "prerequisites_cleared",
      prescribedResource: "Seeing Theory Brown University Interactive Visualizer",
      estimatedMinutes: 50,
      deliverableProof: "Interpret clinical trial spread curve and isolate outlier data",
    },
    {
      stepNumber: 5,
      conceptId: "ai-linear-regression-gradient",
      conceptName: "Gradient Descent & Loss Optimization",
      prerequisiteStatus: "prerequisites_cleared",
      prescribedResource: "Distill.pub Visual Gradient Descent Simulator",
      estimatedMinutes: 75,
      deliverableProof: "Fit a regression line predicting ICU patient recovery hours from vitals",
    },
  ],
};
