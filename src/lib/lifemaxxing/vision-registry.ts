/**
 * ARGUS Vision Blueprint Registry v1.0
 * The Human Flourishing Operating System
 *
 * "Unlock the extraordinary in everyone.
 *  Make knowledge, wisdom, health, opportunity, human connection,
 *  and personalized guidance accessible to every person—regardless
 *  of wealth, age, profession, location, or background."
 */

export type GoalCategory = "Core" | "Growth" | "Frontier";
export type ImplementationStatus = "implemented" | "designed" | "gap" | "partial";

export interface VisionGoal {
  id: number;
  title: string;
  category: GoalCategory;
  tagline: string;
  problemSolved: string;
  argusCapability: string;
  status: ImplementationStatus;
  moduleTarget: string;
}

export interface IntelligenceEngine {
  id: string;
  number: number;
  name: string;
  role: string;
  primaryCapability: string;
  architectureTier: string;
  humanSafeguard: string;
}

export interface LifeDomain {
  id: string;
  name: string;
  icon: string;
  status: "Designed" | "Partial" | "Gap";
  coreChallenge: string;
  argusIntervention: string;
  coverageDetail: string;
}

export interface RoadmapPhase {
  phase: string;
  name: string;
  timeframe: string;
  theme: string;
  deliverables: string[];
}

export interface NorthStarMetric {
  name: string;
  target: string;
  description: string;
  unit: string;
}

export const ARGUS_20_GOALS: VisionGoal[] = [
  {
    id: 1,
    title: "Eliminate Avoidable Life Bottlenecks",
    category: "Core",
    tagline: "Diagnose and systematically resolve root causes of stagnation.",
    problemSolved: "People spend years treating symptoms (burnout, procrastination, financial anxiety) instead of root bottlenecks.",
    argusCapability: "Bottleneck Diagnostic Engine + Minimum Effective Intervention matrix.",
    status: "implemented",
    moduleTarget: "flourishing"
  },
  {
    id: 2,
    title: "Democratize Intelligence",
    category: "Core",
    tagline: "Make high-tier cognitive assistance affordable to every household.",
    problemSolved: "Frontier AI costs exclude low-income users and developing economies.",
    argusCapability: "5-Tier Compute Pyramid (Deterministic -> Cached -> Edge -> Small -> Frontier) dropping costs by 88.3%.",
    status: "implemented",
    moduleTarget: "economics"
  },
  {
    id: 3,
    title: "Connect Humanity's Knowledge",
    category: "Core",
    tagline: "Unify fragmented human knowledge into prerequisite learning graphs.",
    problemSolved: "Information is scattered, paywalled, or isolated in silos without verified prerequisite paths.",
    argusCapability: "Federated Knowledge Mesh mapping concepts from Class 6 foundations to frontier AI & medicine.",
    status: "implemented",
    moduleTarget: "mesh"
  },
  {
    id: 4,
    title: "Give Everyone Direction",
    category: "Core",
    tagline: "Instant contextual clarity whenever life feels overwhelmed or aimless.",
    problemSolved: "Daily decision fatigue and existential overwhelm paralyze deliberate action.",
    argusCapability: "ARGUS NOW: 'How are you, really?' single-question dispatcher with Care, Clarity, and Advance modes.",
    status: "implemented",
    moduleTarget: "now"
  },
  {
    id: 5,
    title: "Discover Hidden Human Capabilities",
    category: "Core",
    tagline: "Uncover latent talents through real-world micro-challenges.",
    problemSolved: "Millions never discover what they're capable of due to lack of exposure and rigid test scores.",
    argusCapability: "Capability Genome & Opportunity Equalizer testing spatial, verbal, and systemic aptitudes.",
    status: "implemented",
    moduleTarget: "capability"
  },
  {
    id: 6,
    title: "Personalize Education to the Individual",
    category: "Core",
    tagline: "Tailor pace, dialect, and prerequisite remediation to every student.",
    problemSolved: "One-size-fits-all classrooms leave struggling students behind and bore advanced learners.",
    argusCapability: "Diagnostic concept mapping with zero-cost public syllabus integration (NCERT, DIKSHA).",
    status: "implemented",
    moduleTarget: "equity"
  },
  {
    id: 7,
    title: "Make Health Guidance Accessible & Contextual",
    category: "Core",
    tagline: "Bridge symptoms, habits, and clinical care with personal context.",
    problemSolved: "Generic medical search generates panic while clinical consultations remain rushed or inaccessible.",
    argusCapability: "Triaged Personal Health Graph, ABHA compliance, and Doctor-Ready consultation summaries.",
    status: "implemented",
    moduleTarget: "health"
  },
  {
    id: 8,
    title: "Expand Economic Independence",
    category: "Growth",
    tagline: "Map tangible pathways from existing skills to income security.",
    problemSolved: "Economic mobility is choked by hidden market knowledge, credentialism, and lack of capital.",
    argusCapability: "Skill monetization trees, freelance roadmap generation, and public entitlement indexing.",
    status: "designed",
    moduleTarget: "solver"
  },
  {
    id: 9,
    title: "Protect Finite Human Time",
    category: "Core",
    tagline: "Transform mindless screen addiction into intentional, worthwhile living.",
    problemSolved: "Algorithmic dopamine loops harvest attention, leaving people exhausted and unfulfilled.",
    argusCapability: "Life Evolution Engine distinguishing deliberate leisure from unconscious scrolling.",
    status: "implemented",
    moduleTarget: "evolution"
  },
  {
    id: 10,
    title: "Preserve Human Sovereignty & Agency",
    category: "Core",
    tagline: "Build AI that empowers human independence instead of creating reliance.",
    problemSolved: "Black-box AI systems manipulate beliefs, generate emotional dependency, and lock in users.",
    argusCapability: "ARGUS Constitution: Truth over comfort, Wisdom over stimulation, Capability over dependency.",
    status: "implemented",
    moduleTarget: "doctrine"
  },
  {
    id: 11,
    title: "Bridge Rural & Regional Language Divides",
    category: "Growth",
    tagline: "Zero-cost offline-first intelligence in vernacular dialects.",
    problemSolved: "Knowledge tools default to English and high-speed broadband, abandoning rural populations.",
    argusCapability: "Bilingual (Bengali/Hindi/English) offline local models and community peer sync.",
    status: "implemented",
    moduleTarget: "equity"
  },
  {
    id: 12,
    title: "Universal Problem Solver Framework",
    category: "Growth",
    tagline: "Standardize any human struggle into a structured, verifiable solution record.",
    problemSolved: "Complex life challenges are tackled haphazardly without systematic verification.",
    argusCapability: "4-Level Solution Protocol: Understand -> Guide -> Execute -> Verify.",
    status: "implemented",
    moduleTarget: "solver"
  },
  {
    id: 13,
    title: "Foster Deep Human Relationships & Community",
    category: "Growth",
    tagline: "Use intelligence to bring people together offline, not replace them with bots.",
    problemSolved: "Epidemic of loneliness fueled by parasocial AI companions and algorithmic feeds.",
    argusCapability: "Intentional Connect mode and Volunteer Contribution Intelligence for local mutual aid.",
    status: "implemented",
    moduleTarget: "evolution"
  },
  {
    id: 14,
    title: "Navigate Civic Rights & Public Entitlements",
    category: "Growth",
    tagline: "Automate discovery and claim filing for government welfare schemes.",
    problemSolved: "Billions in allocated public welfare go unclaimed due to bureaucratic opacity.",
    argusCapability: "Civic Service Registry linking citizens directly to MyScheme, NALSA, and PM-JAY.",
    status: "implemented",
    moduleTarget: "now"
  },
  {
    id: 15,
    title: "Accelerate Scientific & Creative Discovery",
    category: "Frontier",
    tagline: "Assist researchers and creators in cross-disciplinary hypothesis generation.",
    problemSolved: "Hyper-specialization prevents breakthroughs across interdisciplinary boundaries.",
    argusCapability: "Cross-domain Knowledge Mesh traversing literature across biology, physics, and humanities.",
    status: "designed",
    moduleTarget: "mesh"
  },
  {
    id: 16,
    title: "Democratize Legal Knowledge & Self-Advocacy",
    category: "Growth",
    tagline: "Plain-language statutory analysis and tenant/labor self-defense guides.",
    problemSolved: "Legal protection is inaccessible to those unable to afford high attorney retainers.",
    argusCapability: "Standardized Legal Problem Records with statutory cross-referencing.",
    status: "designed",
    moduleTarget: "solver"
  },
  {
    id: 17,
    title: "Sustainable Agriculture & Smallholder Support",
    category: "Frontier",
    tagline: "Hyper-local micro-climate guidance, soil restoration, and fair pricing.",
    problemSolved: "Smallholder farmers suffer catastrophic crop losses due to unpredicted weather and predatory middlemen.",
    argusCapability: "Edge-based agricultural advisory and mandi price transparency.",
    status: "designed",
    moduleTarget: "solver"
  },
  {
    id: 18,
    title: "Universal Accessibility for Diverse Abilities",
    category: "Core",
    tagline: "Multi-modal perceptual translation for neurodiverse, visually, or hearing-impaired humans.",
    problemSolved: "Digital software is fundamentally exclusionary to people with sensory or cognitive differences.",
    argusCapability: "Adaptive cognitive load adjuster, voice-native UI, and high-contrast haptic feedbacks.",
    status: "designed",
    moduleTarget: "capability"
  },
  {
    id: 19,
    title: "Ecological Stewardship & Climate Action",
    category: "Frontier",
    tagline: "Individual and community carbon transparency and local regenerative action.",
    problemSolved: "Climate anxiety paralyzes action when people lack actionable, local leverage points.",
    argusCapability: "Household footprint audits and local community rewilding challenges.",
    status: "designed",
    moduleTarget: "evolution"
  },
  {
    id: 20,
    title: "Continuous Intergenerational Wisdom Mesh",
    category: "Frontier",
    tagline: "Preserve living oral histories, family traditions, and philosophical legacies.",
    problemSolved: "Elders pass away with life wisdom unrecorded and generational insight lost.",
    argusCapability: "Socratic oral history capture and generational knowledge preservation vault.",
    status: "designed",
    moduleTarget: "doctrine"
  }
];

export const ARGUS_12_ENGINES: IntelligenceEngine[] = [
  {
    id: "engine-1",
    number: 1,
    name: "Identity & Context Engine",
    role: "Understands who the user is without pigeonholing them.",
    primaryCapability: "Synthesizes values, energy state, constraints, and learning pace into a dynamic profile.",
    architectureTier: "Tier 2 (On-device Edge / Private Storage)",
    humanSafeguard: "100% user-owned; no advertising monetization; zero profiling sale."
  },
  {
    id: "engine-2",
    number: 2,
    name: "Goal & Purpose Engine",
    role: "Distinguishes intrinsic desires from externally imposed vanity goals.",
    primaryCapability: "Clarifies core motivations through Socratic inquiry and aligns daily actions with authentic values.",
    architectureTier: "Tier 1 (Cached) + Tier 3 (9B Fast)",
    humanSafeguard: "Refuses to prescribe life purposes; acts as a mirror, not a judge."
  },
  {
    id: "engine-3",
    number: 3,
    name: "Universal Bottleneck Resolver",
    role: "Identifies the single highest-leverage constraint holding a person back.",
    primaryCapability: "12 obstacle categories with 4-level diagnostic tree isolating knowledge, habit, or structural deficits.",
    architectureTier: "Tier 0 (Deterministic) + Tier 3 (Reasoning)",
    humanSafeguard: "Recommends the Minimum Effective Intervention to prevent over-optimization."
  },
  {
    id: "engine-4",
    number: 4,
    name: "Knowledge Mesh Engine",
    role: "Builds personalized learning paths over humanity's open knowledge.",
    primaryCapability: "Traverses concept prerequisite trees from Class 6 foundations to postgraduate expertise.",
    architectureTier: "Tier 1 (Cached graph) + W3C Open RDF",
    humanSafeguard: "Relies on open, peer-reviewed educational registries; no proprietary lock-in."
  },
  {
    id: "engine-5",
    number: 5,
    name: "Adaptive Mastery Engine",
    role: "Guides active practice with spaced retrieval and dialect adaptation.",
    primaryCapability: "Dynamically calibrates difficulty to maintain optimal flow state and long-term retention.",
    architectureTier: "Tier 2 (Local Edge) + Tier 0 (SRS algorithms)",
    humanSafeguard: "Prioritizes deep retention and application over gamified streak manipulation."
  },
  {
    id: "engine-6",
    number: 6,
    name: "Capability Discovery Engine",
    role: "Reveals latent human potential through real-world micro-challenges.",
    primaryCapability: "Tracks multidimensional aptitude across spatial, verbal, logical, and social domains.",
    architectureTier: "Tier 2 (On-Device Sandbox)",
    humanSafeguard: "Never pigeonholes children into fixed career destiny; expands options instead."
  },
  {
    id: "engine-7",
    number: 7,
    name: "Health & State Intelligence",
    role: "Continuous, contextual physical and mental health guidance.",
    primaryCapability: "Multi-context fatigue triage, ABHA digital records integration, and Doctor-Ready briefs.",
    architectureTier: "Tier 2 (Encrypted On-Device) + Tier 3 (Clinical rules)",
    humanSafeguard: "Adheres strictly to WHO/clinical boundaries; never replaces professional healthcare."
  },
  {
    id: "engine-8",
    number: 8,
    name: "Decision & Wisdom Engine",
    role: "Provides multi-perspective moral and strategic counsel during crises.",
    primaryCapability: "Synthesizes Stoic, Vedantic, Buddhist, Abrahamic, and Rationalist decision models.",
    architectureTier: "Tier 3 (Structured Wisdom Bank)",
    humanSafeguard: "Presents pluralistic frameworks so the human always retains ultimate decision choice."
  },
  {
    id: "engine-9",
    number: 9,
    name: "Time & Execution Engine",
    role: "Protects attention and orchestrates deliberate daily living.",
    primaryCapability: "Classifies 6 types of worthwhile time (Learn, Build, Connect, Recover, Explore, Contribute).",
    architectureTier: "Tier 0 (Deterministic Scheduler)",
    humanSafeguard: "Refuses to turn life into an anxious productivity contest; honors deliberate rest."
  },
  {
    id: "engine-10",
    number: 10,
    name: "Resource & Opportunity Engine",
    role: "Connects individuals to grants, civic schemes, and career pathways.",
    primaryCapability: "Indexes government schemes, scholarships, and open-source gigs without commission.",
    architectureTier: "Tier 1 (Federated Public Index)",
    humanSafeguard: "Strict non-commercial matching; zero sponsored placement bias."
  },
  {
    id: "engine-11",
    number: 11,
    name: "Foresight & Adaptation Engine",
    role: "Helps users anticipate macroeconomic and technological shifts.",
    primaryCapability: "Simulates career and economic scenarios under AI transition and market disruptions.",
    architectureTier: "Tier 4 (Frontier Synthesis when requested)",
    humanSafeguard: "Framed as probabilistic scenarios, never deterministic fearmongering."
  },
  {
    id: "engine-12",
    number: 12,
    name: "Guardian & Sovereignty Engine",
    role: "Guarantees privacy, data autonomy, and psychological non-manipulation.",
    primaryCapability: "Enforces the ARGUS Constitution, monitors AI dependency, and verifies on-device encryption.",
    architectureTier: "Core Runtime Cryptographic Layer",
    humanSafeguard: "Holds unilateral veto over any recommendation violating human agency."
  }
];

export const ARGUS_20_SECTORS: LifeDomain[] = [
  { id: "edu", name: "Education & Learning", icon: "GraduationCap", status: "Designed", coreChallenge: "Rote memorization and inaccessible personalized tutoring.", argusIntervention: "Prerequisite Concept Mesh + Adaptive Mastery in vernacular dialects.", coverageDetail: "Fully modeled in Knowledge Mesh and Equity modules." },
  { id: "med", name: "Physical Health & Medicine", icon: "Activity", status: "Designed", coreChallenge: "Uncontextualized symptom searches and fragmented medical records.", argusIntervention: "Personal Health Graph + Contextual Triage + ABHA Integration.", coverageDetail: "Implemented in Health Intelligence module." },
  { id: "mental", name: "Mental Well-being", icon: "Brain", status: "Designed", coreChallenge: "Anxiety epidemics and stigmatized, costly psychological care.", argusIntervention: "Care Mode + Stoic/Mindfulness frameworks + Crisis helplines.", coverageDetail: "Implemented in ARGUS NOW & Flourishing modules." },
  { id: "career", name: "Career & Employment", icon: "Briefcase", status: "Designed", coreChallenge: "Rapid AI obsolescence and opaque hiring gatekeepers.", argusIntervention: "Aptitude discovery + Parallel career tracks + Skill gap mapping.", coverageDetail: "Implemented in Capability Discovery and Solver modules." },
  { id: "finance", name: "Personal Finance & Wealth", icon: "DollarSign", status: "Designed", coreChallenge: "Predatory debt, financial illiteracy, and systemic inflation.", argusIntervention: "Cost-aware cashflow optimization + Public subsidy matching.", coverageDetail: "Integrated in Economics & Civic Registry." },
  { id: "time", name: "Productivity & Time", icon: "Clock", status: "Designed", coreChallenge: "Compulsive engagement feeds and attention fragmentation.", argusIntervention: "Intentional Living Engine + Worthwhile Leisure validation.", coverageDetail: "Implemented in Life Evolution module." },
  { id: "family", name: "Relationships & Family", icon: "Heart", status: "Designed", coreChallenge: "Loneliness, relational conflict, and digital isolation.", argusIntervention: "Connect Mode + Nonviolent Communication templates.", coverageDetail: "Implemented in Evolution & NOW Care modules." },
  { id: "character", name: "Character & Philosophy", icon: "BookOpen", status: "Designed", coreChallenge: "Nihilism and loss of ethical frameworks.", argusIntervention: "ARGUS Constitution + Multi-tradition wisdom libraries.", coverageDetail: "Implemented in Doctrine & NOW Wisdom modules." },
  { id: "talent", name: "Talent Discovery", icon: "Sparkles", status: "Designed", coreChallenge: "Poverty and geography choking latent natural aptitudes.", argusIntervention: "Opportunity Equalizer + Real-world micro-challenges.", coverageDetail: "Implemented in Equity & Capability modules." },
  { id: "biz", name: "Entrepreneurship & Craft", icon: "Zap", status: "Designed", coreChallenge: "High capital risk and market navigation barriers.", argusIntervention: "First-dollar experiment blueprints + Zero-cost tool stacks.", coverageDetail: "Implemented in Solver & Capability modules." },
  { id: "civic", name: "Government & Civic Services", icon: "Landmark", status: "Designed", coreChallenge: "Bureaucratic labyrinths and missed public entitlements.", argusIntervention: "Civic Service Registry (MyScheme, NALSA, PM-JAY).", coverageDetail: "Implemented in ARGUS NOW Civic integrations." },
  { id: "law", name: "Law & Legal Assistance", icon: "Scale", status: "Partial", coreChallenge: "Expensive legal counsel leaving common citizens unprotected.", argusIntervention: "Standardized Legal Problem Records + Free Legal Aid triage.", coverageDetail: "Roadmapped in Universal Solver Framework." },
  { id: "housing", name: "Housing & Living Security", icon: "Home", status: "Partial", coreChallenge: "Unaffordable rent, deceptive leases, and unsafe infrastructure.", argusIntervention: "Tenancy rights analyzer + Affordable cooperative finder.", coverageDetail: "Roadmapped in Universal Solver Framework." },
  { id: "agri", name: "Agriculture & Rural Life", icon: "Sprout", status: "Partial", coreChallenge: "Middleman exploitation and volatile climate shocks.", argusIntervention: "Micro-climate soil advisories + Mandi price discovery.", coverageDetail: "Roadmapped in Universal Solver Framework." },
  { id: "env", name: "Environment & Sustainability", icon: "Leaf", status: "Gap", coreChallenge: "Individual paralysis before global ecological degradation.", argusIntervention: "Neighborhood circularity groups + Low-carbon living blueprints.", coverageDetail: "Phase 4 Ecosystem roadmap." },
  { id: "access", name: "Disability & Accessibility", icon: "Accessibility", status: "Partial", coreChallenge: "Inaccessible digital tools for diverse abilities.", argusIntervention: "Multi-modal perceptual translation + Cognitive load adaptation.", coverageDetail: "Phase 3 Foundation roadmap." },
  { id: "safety", name: "Safety & Emergency Response", icon: "ShieldAlert", status: "Partial", coreChallenge: "Delayed emergency response and disinformation in disasters.", argusIntervention: "Offline SOS peer networks + Verified emergency guides.", coverageDetail: "Phase 2 Foundation roadmap." },
  { id: "arts", name: "Art, Culture & Creative Expression", icon: "Palette", status: "Designed", coreChallenge: "Algorithmic homogenization and monetization fatigue.", argusIntervention: "Creative spark micro-challenges + Local folklore preservation.", coverageDetail: "Implemented in Life Evolution (Explore/Build) modules." },
  { id: "elder", name: "Aging, Dignity & Elder Care", icon: "Users", status: "Partial", coreChallenge: "Elder abandonment, cognitive decline, and generational divide.", argusIntervention: "Socratic oral history vault + Daily dignity check-ins.", coverageDetail: "Roadmapped in Intergenerational Wisdom Mesh." },
  { id: "community", name: "Civic Community & Volunteering", icon: "HandHeart", status: "Designed", coreChallenge: "Atomized modern living lacking collective purpose.", argusIntervention: "Volunteer Contribution Matching engine (non-monetary).", coverageDetail: "Implemented in Life Evolution module." }
];

export const ARGUS_ROADMAP: RoadmapPhase[] = [
  {
    phase: "Phase 1",
    name: "ARGUS NOW (The Foundation)",
    timeframe: "Q1 - Q2 2026",
    theme: "Immediate human relief, cost democratization, and foundational clarity.",
    deliverables: [
      "Launch 'How are you, really?' single-question dispatcher (Care, Clarity, Advance).",
      "Deploy 5-Tier Cost-Aware Intelligence Router dropping cost per query by 88%.",
      "Deploy ARGUS Constitution and Human Sovereignty runtime safeguards.",
      "Integrate Top 10 Indian and Global public civic welfare registries (MyScheme, NALSA)."
    ]
  },
  {
    phase: "Phase 2",
    name: "ARGUS LEARN & HEAL (Mastery & Well-being)",
    timeframe: "Q3 - Q4 2026",
    theme: "Deep cognitive capability and contextual healthcare empowerment.",
    deliverables: [
      "Federated Knowledge Mesh mapping Class 6 to frontier concepts with W3C RDF export.",
      "Kolkata District Class 6 Equalizer Pilot (Bengali/English bilingual offline learning).",
      "Personal Health Graph with ABHA FHIR records and Doctor-Ready consultation briefs.",
      "Standardized Universal Problem Solver with 4-level capability validation."
    ]
  },
  {
    phase: "Phase 3",
    name: "ARGUS LIFE (Intentional Evolution)",
    timeframe: "2027",
    theme: "Freeing humans from unconscious algorithmic addiction into deliberate living.",
    deliverables: [
      "Life Evolution Engine with 6 Worthwhile Modes and uncoerced leisure validation.",
      "Capability Genome and aptitude discovery sandbox across 16 human dimensions.",
      "Volunteer Contribution Matching connecting neighbors for local community problem solving.",
      "Full coverage of Legal, Tenancy, and Accessibility solver modules."
    ]
  },
  {
    phase: "Phase 4",
    name: "ARGUS NETWORK (Federated Global Utility)",
    timeframe: "2028+",
    theme: "Self-sustaining, intergenerational public knowledge and human flourishing mesh.",
    deliverables: [
      "P2P Edge Mesh sync enabling intelligence without continuous cloud dependence.",
      "Global Open Educational Resource federation with UNESCO and global universities.",
      "Intergenerational Wisdom Mesh preserving oral histories across cultures.",
      "Sustainable non-profit foundation governance protecting user data in perpetuity."
    ]
  }
];

export const ARGUS_NORTH_STARS: NorthStarMetric[] = [
  { name: "Capability Expansion", target: "+40% mastery retention", description: "Measured by verified real-world problem resolution without AI assistance.", unit: "Score" },
  { name: "Agency & Autonomy", target: "> 85% deliberate decisions", description: "Percentage of actions chosen intentionally vs triggered by unconscious notifications.", unit: "%" },
  { name: "Cost Accessibility", target: "< $0.15/user/month", description: "Operational cost of delivering full guidance to any citizen worldwide.", unit: "USD" },
  { name: "Time Reclaimed", target: "90 mins/day", description: "Average daily screen time shifted from unconscious feed scrolling to worthwhile living.", unit: "Minutes" },
  { name: "Health Contextualization", target: "100% Doctor-Ready", description: "Clinical consultations preceded by structured, relevant personal history.", unit: "%" },
  { name: "Civic Entitlement Realization", target: "> $50M unlocked", description: "Value of public welfare, scholarships, and legal aid delivered to underprivileged users.", unit: "USD" },
  { name: "Offline Vernacular Reach", target: "12 languages offline", description: "Dialects capable of running full knowledge triage on a $50 smartphone without internet.", unit: "Languages" },
  { name: "Intergenerational Connection", target: "1M oral histories", description: "Family wisdom sessions recorded and structured for posterity.", unit: "Stories" }
];
