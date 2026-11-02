import type {
  SectorAuditItem,
  UniversalProblemRecord,
} from "./types";

export const TWENTY_SECTOR_AUDIT: SectorAuditItem[] = [
  { id: "s-edu", name: "Education & Learning", status: "designed", statusLabel: "Designed", currentCapabilities: "Diagnostic bottlenecks, spaced retrieval, verified solutions", roadmapGap: "None" },
  { id: "s-phys-health", name: "Physical Health & Medicine", status: "designed", statusLabel: "Designed", currentCapabilities: "ABHA health graph, red-flag triage, Doctor-ready Qs", roadmapGap: "None" },
  { id: "s-mental", name: "Mental Well-being", status: "designed", statusLabel: "Designed", currentCapabilities: "ARGUS Care mode, NSDR, sensory grounding, Tele-MANAS escalation", roadmapGap: "None" },
  { id: "s-career", name: "Career & Employment", status: "designed", statusLabel: "Designed", currentCapabilities: "Opportunity graph, biomedical data parallel tracks, proof-of-work", roadmapGap: "None" },
  { id: "s-wealth", name: "Personal Finance & Wealth", status: "designed", statusLabel: "Designed", currentCapabilities: "Survival vs instability vs stability triage, debt waterfalls", roadmapGap: "None" },
  { id: "s-time", name: "Productivity & Time", status: "designed", statusLabel: "Designed", currentCapabilities: "Circadian energy scheduling, distraction defense, macro templates", roadmapGap: "None" },
  { id: "s-rel", name: "Relationships & Family", status: "designed", statusLabel: "Designed", currentCapabilities: "Human-to-human primacy safeguard, anti-AI dependency checks", roadmapGap: "None" },
  { id: "s-char", name: "Character & Philosophy", status: "designed", statusLabel: "Designed", currentCapabilities: "Wisdom library (Gita, Stoicism, secular rationalism), Dharma engine", roadmapGap: "None" },
  { id: "s-talent", name: "Talent Discovery", status: "designed", statusLabel: "Designed", currentCapabilities: "Capability genome, 6-domain low friction experiments", roadmapGap: "None" },
  { id: "s-ent", name: "Entrepreneurship", status: "designed", statusLabel: "Designed", currentCapabilities: "5-year ₹10 Cr wealth engine, bottleneck monetization", roadmapGap: "None" },
  { id: "s-comm", name: "Community & Social Impact", status: "designed", statusLabel: "Designed", currentCapabilities: "Kolkata district equity pilot, UNICEF child safeguards", roadmapGap: "None" },
  { id: "s-civic", name: "Government & Civic Services", status: "partial", statusLabel: "Partial", currentCapabilities: "MyScheme & NALSA index", roadmapGap: "Direct state grievance filing & RTI tracking" },
  { id: "s-safety", name: "Safety & Emergency Response", status: "partial", statusLabel: "Partial", currentCapabilities: "Clinical triage routing & Tele-MANAS", roadmapGap: "Offline SOS broadcast mesh & disaster coordination" },
  { id: "s-sci", name: "Research & Scientific Discovery", status: "partial", statusLabel: "Partial", currentCapabilities: "ICU sepsis dataset sandbox", roadmapGap: "Automated preprint citation audit & lab protocol verification" },
  { id: "s-law", name: "Law & Legal Assistance", status: "gap", statusLabel: "Gap", currentCapabilities: "NALSA legal aid directory", roadmapGap: "Tenancy lease defense & contract clause de-risking" },
  { id: "s-housing", name: "Housing & Infrastructure", status: "gap", statusLabel: "Gap", currentCapabilities: "None", roadmapGap: "Affordable housing subsidies & electricity reliability mapping" },
  { id: "s-agri", name: "Agriculture & Rural Development", status: "gap", statusLabel: "Gap", currentCapabilities: "None", roadmapGap: "Crop disease diagnosis & MSP mandi market price transparency" },
  { id: "s-env", name: "Environment & Sustainability", status: "gap", statusLabel: "Gap", currentCapabilities: "None", roadmapGap: "Local air quality monitoring & climate risk adaptation" },
  { id: "s-disability", name: "Disability & Accessibility", status: "gap", statusLabel: "Gap", currentCapabilities: "Offline low-bandwidth mode", roadmapGap: "Screen reader / audio tactile interfaces & UDID card support" },
  { id: "s-transport", name: "Transport & Mobility", status: "gap", statusLabel: "Gap", currentCapabilities: "None", roadmapGap: "Low-cost rural commute optimization & EV subsidy navigation" },
];

export const BENCHMARK_PROBLEM_RECORDS: UniversalProblemRecord[] = [
  {
    id: "prob-firstgen-engineer",
    title: "First-Gen Aspirant Seeking Engineering with Zero Capital",
    personaContext: "15-year-old child in rural West Bengal. Father is an agricultural laborer. Child excels at spatial puzzles but fails abstract math tests. No one in family attended college.",
    desiredOutcome: "Qualify for top government engineering college (e.g. Jadavpur / NIT) with full merit scholarship without debt.",
    knownFacts: [
      "Access to shared 3G smartphone 1 hour/day",
      "Struggles with Class 10 quadratic algebra notations",
      "Household income is ₹75,000/year (Eligible for 100% tuition waivers)",
    ],
    bindingConstraints: [
      "Foundational algebra gap",
      "Information asymmetry on state merit scholarship quotas (WBJEE TFW)",
      "Cannot afford ₹1.5 Lakh private coaching institutes",
    ],
    urgency: "medium",
    riskLevel: "low",
    missingInformation: [
      "Current school performance marks in Class 9 Science",
      "Proximity to nearest government computer center or library",
    ],
    recommendedIntervention: {
      level: "guide",
      actionTitle: "Foundational Math Recovery + Tuition Fee Waiver (TFW) Pathway",
      actionDetails: "1) Download 10 offline DIKSHA visual algebra modules to phone. 2) Apply for WBJEE Tuition Fee Waiver (TFW) scheme reserving free seats for income < ₹2.5L. 3) Connect with supervised college student mentor.",
      mobilizedResources: [
        "DIKSHA Offline Mathematics Repository",
        "WBJEE Tuition Fee Waiver (TFW) Guidelines",
        "National Scholarship Portal (NSP)",
      ],
      limitsRecognized: "ARGUS cannot fund college directly or write exams. Admissions require official state exam rank and verified income certificate from Block Development Officer (BDO).",
    },
    successCriteria: {
      falsifiableProof: "Scores >80% on unassisted 25-question algebra diagnostic; obtains signed BDO income certificate within 30 days.",
      reviewIntervalDays: 14,
    },
  },
  {
    id: "prob-unemployed-graduate",
    title: "Unemployed Life Sciences Graduate with Zero Callbacks",
    personaContext: "24-year-old B.Sc Biotechnology graduate. Applied to 180 corporate jobs with zero interview invitations. Family pressuring for generic government exams.",
    desiredOutcome: "Secure entry-level ₹40,000/month role in clinical data analysis or medical informatics within 90 days.",
    knownFacts: [
      "Strong understanding of genetics and pathology",
      "Zero coding portfolio or demonstrable analytical proof-of-work",
      "Possesses laptop and 4 hours daily for focused upskilling",
    ],
    bindingConstraints: [
      "Lacks proof-of-work portfolio (employers ignore text resumes)",
      "Zero SQL/Python data extraction capability",
    ],
    urgency: "high",
    riskLevel: "low",
    missingInformation: [
      "Whether applicant has basic spreadsheet proficiency (Excel)",
    ],
    recommendedIntervention: {
      level: "execute",
      actionTitle: "The 30-Day Clinical Proof-of-Work Portfolio Sprint",
      actionDetails: "Fork public Kaggle/PhysioNet ICU Sepsis dataset. Build 1 interactive dashboard predicting patient readmission odds. Host analysis live on GitHub with 1-page PDF executive summary.",
      mobilizedResources: [
        "PhysioNet Public Clinical Database",
        "Google Colab & GitHub Pages",
        "Open-Access Biostatistics Tutorials",
      ],
      limitsRecognized: "ARGUS cannot guarantee job hire. Candidate must personally complete project exercises and pass live technical interviews.",
    },
    successCriteria: {
      falsifiableProof: "Live GitHub portfolio URL with working clinical dataset analysis shared with 15 verified medical device recruiters.",
      reviewIntervalDays: 7,
    },
  },
  {
    id: "prob-elderly-debt-harassment",
    title: "Elderly Citizen Facing Unregulated Loan App Harassment",
    personaContext: "58-year-old shopkeeper who took ₹25,000 loan from predatory mobile app during medical emergency. Recovery agents sending threatening messages and calling contacts.",
    desiredOutcome: "Stop unlawful recovery harassment immediately and establish legal structured debt settlement.",
    knownFacts: [
      "Lender is not an RBI-registered NBFC",
      "Coercive threats violate RBI Fair Practices Code",
      "User has paid back ₹18,000 principal already",
    ],
    bindingConstraints: [
      "Acute anxiety and shame preventing legal reporting",
      "Fear of social embarrassment from leaked contact lists",
    ],
    urgency: "critical",
    riskLevel: "high",
    missingInformation: [
      "Exact app name and payment receipt transaction IDs",
    ],
    recommendedIntervention: {
      level: "guide",
      actionTitle: "RBI Cybercrime Complaint & NALSA Legal Cease-and-Desist",
      actionDetails: "1) Revoke contacts permission in Android settings immediately. 2) File formal online cybercrime complaint at cybercrime.gov.in. 3) Send standard legal template citing RBI 2022 Digital Lending Guidelines forbidding third-party harassment.",
      mobilizedResources: [
        "National Cyber Crime Reporting Portal (1930)",
        "RBI Sachet Fraud Portal (sachet.rbi.org.in)",
        "NALSA Free Legal Aid Helpline",
      ],
      limitsRecognized: "ARGUS cannot legally arrest perpetrators or pay off debt balance. Official police complaint and bank chargeback dispute are required.",
    },
    successCriteria: {
      falsifiableProof: "Filed cybercrime acknowledgment number generated; predatory app permissions completely severed.",
      reviewIntervalDays: 2,
    },
  },
];
