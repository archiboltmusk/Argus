import type {
  UserReportedEmotion,
  ArgusNowMode,
  ArgusNowIntervention,
  WisdomTraditionId,
  WisdomPassage,
  CivicServiceGuide,
} from "./types";

export const WISDOM_DATABASE: Record<WisdomTraditionId, WisdomPassage> = {
  bhagavad_gita: {
    traditionId: "bhagavad_gita",
    traditionLabel: "Bhagavad Gita (Nishkama Karma)",
    sourceText: "Chapter 2, Verse 47",
    originalQuote: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    secularTranslation: "You have a right to your deliberate action, but never to the fruits thereof. Let not the fruit of action be your motive, nor let your attachment be to inaction.",
    contemporaryAction: "Relinquish the anxiety of exam rank or final outcome; direct 100% of your energy solely to the next question in front of you.",
  },
  stoicism: {
    traditionId: "stoicism",
    traditionLabel: "Stoic Philosophy (Epictetus)",
    sourceText: "Enchiridion, Section 1",
    originalQuote: "Some things are within our control, and other things are not. Within our power are opinion, motivation, desire, and aversion.",
    secularTranslation: "Separate reality into the dichotomy of control: external economic tides or exam algorithms cannot be willed away, but your response is yours.",
    contemporaryAction: "Write down the 1 variable in your control right now, and consciously abandon preoccupation with the 99 variables outside your control.",
  },
  buddhism: {
    traditionId: "buddhism",
    traditionLabel: "Buddhist Psychology (Vipassana)",
    sourceText: "Dhammapada, Verse 1-2",
    originalQuote: "Mind precedes all mental states. Mind is their chief; they are all mind-wrought.",
    secularTranslation: "Suffering multiplies when we react to pain with second-arrow self-judgment. Observe physical tension without attaching a catastrophizing narrative.",
    contemporaryAction: "Take 3 physiological sighs (double inhale, long exhale) and observe physical sensations without labeling them as 'failure'.",
  },
  biblical: {
    traditionId: "biblical",
    traditionLabel: "Biblical Wisdom",
    sourceText: "Ecclesiastes 3:1 / Matthew 6:34",
    originalQuote: "For everything there is a season, and a time for every purpose under heaven... Therefore do not worry about tomorrow, for tomorrow will worry about itself.",
    secularTranslation: "Human lives move through distinct seasons of sowing, waiting, and reaping. Worrying about next month's burdens exhausts today's limited grace.",
    contemporaryAction: "Confine your responsibility strictly to today's daylight hours. Rest when dusk falls.",
  },
  quranic: {
    traditionId: "quranic",
    traditionLabel: "Quranic Ethics",
    sourceText: "Surah Al-Inshirah (94:5-6)",
    originalQuote: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا · إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    secularTranslation: "Indeed, with every hardship comes ease. The capacity to endure is built inside the trial itself, not after it passes.",
    contemporaryAction: "Acknowledge the weight you are carrying; take 1 small deliberate step knowing endurance compounds quietly.",
  },
  secular_rationalism: {
    traditionId: "secular_rationalism",
    traditionLabel: "Secular Behavioral Science",
    sourceText: "Daniel Kahneman & Herbert Simon (Bounded Rationality)",
    originalQuote: "A reliable way to make people believe in falsehoods is frequent repetition. Under acute stress, humans satisfice rather than optimize.",
    secularTranslation: "When exhausted, your cognitive prefrontal cortex is chemically degraded. Decisions made in acute panic exhibit severe cognitive myopia.",
    contemporaryAction: "Implement a mandatory 12-hour decision moratorium. Do not resign, invest, or make irreversible choices while sleep-deprived.",
  },
};

export const CIVIC_SERVICE_REGISTRY: CivicServiceGuide[] = [
  {
    id: "civic-nrega-welfare",
    title: "Public Welfare & Direct Benefit Verification",
    category: "welfare_access",
    officialPortal: "https://myscheme.gov.in",
    neutralExplanation: "Objective centralized portal to discover eligible federal & state welfare subsidies without political middlemen.",
    checklist: [
      "Check income certificate thresholds for targeted state welfare.",
      "Verify Aadhaar linking for Direct Benefit Transfer (DBT) to prevent bank transaction stalls.",
      "Review official state eligibility criteria without partisan third-party agent fees.",
    ],
  },
  {
    id: "civic-legal-aid",
    title: "National Legal Services Authority (NALSA) - Free Legal Aid",
    category: "debt_relief_tribunals",
    officialPortal: "https://nalsa.gov.in",
    neutralExplanation: "Constitutional right to free, competent legal defense for low-income citizens facing debt harassment or unfair eviction.",
    checklist: [
      "Confirm state legal services committee jurisdictional eligibility (income < ₹3 Lakhs).",
      "File online grievance against coercive third-party recovery agent harassment.",
      "Request a court-appointed legal aid counsel with zero consultation charges.",
    ],
  },
  {
    id: "civic-ayushman-bharat",
    title: "Ayushman Bharat PM-JAY (Tertiary Healthcare Cover)",
    category: "healthcare_eligibility",
    officialPortal: "https://pmjay.gov.in",
    neutralExplanation: "Provides ₹5 Lakhs per family annual cashless hospitalization cover for eligible vulnerable households.",
    checklist: [
      "Search family name in official SECC database using mobile number.",
      "Locate nearest empanelled public or private district hospital.",
      "Obtain Ayushman Golden Card without paying any unauthorized kiosk charges.",
    ],
  },
];

export function resolveArgusNow(
  emotion: UserReportedEmotion,
  energyLevel: number, // 1 to 10
  selectedTradition: WisdomTraditionId = "stoicism",
): ArgusNowIntervention {
  const wisdom = WISDOM_DATABASE[selectedTradition] ?? WISDOM_DATABASE.stoicism;

  // Mode routing logic:
  let mode: ArgusNowMode = "clarity";
  if (emotion === "exhausted" || emotion === "anxious" || emotion === "lonely" || energyLevel <= 3) {
    mode = "care";
  } else if (emotion === "motivated" && energyLevel >= 7) {
    mode = "advance";
  }

  // Minimum Effective Intervention formulation:
  if (mode === "care") {
    if (emotion === "exhausted" || energyLevel <= 2) {
      return {
        mode: "care",
        safetyTriaged: true,
        headline: "Biological Battery Depleted (Active Restoration Protocol)",
        initialGuidance: "Do not attempt to fix your life, make strategic decisions, or study complex theories right now. Your brain requires physical rest.",
        singleUsefulStep: {
          actionTitle: "Drink a glass of water and take a 25-minute horizontal rest (zero phone screen)",
          details: "Lie down in a dark room. Close your eyes. Set an alarm for 25 minutes. Even without deep sleep, non-sleep deep rest (NSDR) restores baseline neurotransmitters.",
          estimatedMinutes: 25,
          targetOutcome: "useful_action",
        },
        wisdomPerspective: wisdom,
        clinicalBoundaryWarning: "WHO AI Guideline: Chronic daily exhaustion lasting >3 weeks warrants a basic clinical blood panel (Thyroid, Ferritin, Vitamin D) from a licensed medical professional.",
        civicOrFinancialSupport: {
          tier: "survival_insecurity",
          resourceName: "Emergency Mental Health Support",
          actionableGuidance: "If feeling overwhelming crisis or distress, call national Tele-MANAS (14416) for free 24/7 confidential counselor guidance.",
        },
      };
    }

    if (emotion === "lonely") {
      return {
        mode: "care",
        safetyTriaged: true,
        headline: "Social Isolation Alert (Human-to-Human Primacy)",
        initialGuidance: "AI conversation cannot substitute for genuine human intimacy or shared physical presence. Let us bridge back to real life.",
        singleUsefulStep: {
          actionTitle: "Send a 1-line text to 1 real-world friend or family member",
          details: "Text something low-pressure: 'Hey, just thinking of you! Hope your week is going smoothly.' Zero expectations of immediate reply.",
          estimatedMinutes: 3,
          targetOutcome: "appropriate_human_connection",
        },
        wisdomPerspective: wisdom,
      };
    }

    return {
      mode: "care",
      safetyTriaged: true,
      headline: "Acute Anxiety De-escalation (The Grounding Protocol)",
      initialGuidance: "Catastrophizing thoughts are a physiological reaction to adrenaline. Don't fight the thought; ground the nervous system.",
      singleUsefulStep: {
        actionTitle: "Perform the 5-4-3-2-1 Sensory Grounding Drill",
        details: "Name 5 things you can see, 4 you can touch, 3 you hear, 2 you smell, and 1 slow breath.",
        estimatedMinutes: 5,
        targetOutcome: "clearer_understanding",
      },
      wisdomPerspective: wisdom,
    };
  }

  if (mode === "advance") {
    return {
      mode: "advance",
      safetyTriaged: true,
      headline: "High Readiness State (Strategic Execution Window)",
      initialGuidance: "Your energy and focus are at a peak. Channel this into your single highest-leverage priority before administrative trivia drains it.",
      singleUsefulStep: {
        actionTitle: "Tackle 1 uninterrupted 45-minute deep work block on your #1 priority",
        details: "Silence all notifications. Set a timer. Work solely on the core bottleneck project.",
        estimatedMinutes: 45,
        targetOutcome: "useful_action",
      },
      wisdomPerspective: wisdom,
      civicOrFinancialSupport: {
        tier: "financial_stability",
        resourceName: "Sovereign Proof-of-Work Project",
        actionableGuidance: "Convert momentum into demonstrable capability: push code, publish an analysis, or complete an untimed active-recall mock.",
      },
    };
  }

  // Mode: CLARITY
  return {
    mode: "clarity",
    safetyTriaged: true,
    headline: "Cognitive Disentanglement (Order from Chaos)",
    initialGuidance: "Don't redesign your entire life today. Identify one problem that matters and one action within your control.",
    singleUsefulStep: {
      actionTitle: "Perform a 5-minute Braindump and isolate the single binding constraint",
      details: "Write down everything currently weighing on your mind. Group them into 'Controllable' vs 'Uncontrollable'. Cross out the uncontrollable.",
      estimatedMinutes: 7,
      targetOutcome: "clearer_understanding",
    },
    wisdomPerspective: wisdom,
    civicOrFinancialSupport: {
      tier: "financial_instability",
      resourceName: "ARGUS Civic & Opportunity Directory",
      actionableGuidance: "If confusion stems from financial or public eligibility, explore verified NALSA or MyScheme pathways.",
    },
  };
}
