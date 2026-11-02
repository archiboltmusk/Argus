import type {
  WorthwhileTimeMode,
  TimeAvailableSlot,
  LifeEvolutionProgress,
  IntentionalChoiceOption,
  VolunteerContributionMatch,
} from "./types";

export const WORTHWHILE_MODES_DEFINITION: Record<
  WorthwhileTimeMode,
  { label: string; whatImproves: string; iconKey: string }
> = {
  learn: { label: "Learn", whatImproves: "Knowledge, understanding, judgment", iconKey: "BookOpen" },
  build: { label: "Build", whatImproves: "Skills, work, financial security, useful creations", iconKey: "Wrench" },
  connect: { label: "Connect", whatImproves: "Love, friendship, family, community", iconKey: "Heart" },
  recover: { label: "Recover", whatImproves: "Physical health, mental capacity, resilience", iconKey: "Moon" },
  explore: { label: "Explore", whatImproves: "Curiosity, creativity, new opportunities", iconKey: "Compass" },
  contribute: { label: "Contribute", whatImproves: "Helping other people and leaving the world better", iconKey: "HeartHandshake" },
};

export const SAMPLE_EVOLUTION_REVIEW: LifeEvolutionProgress[] = [
  { dimension: "Learning", targetGoal: "Active recall on core physiology & ML prerequisites", percentAccomplished: 75, subtextEvidence: "Concepts demonstrated without notes" },
  { dimension: "Health", targetGoal: "Circadian baseline: 7.5h sleep floor & outdoor walk", percentAccomplished: 60, subtextEvidence: "Self-chosen restorative rhythm" },
  { dimension: "Relationships", targetGoal: "Weekly dinner with parents + phone call to mentor", percentAccomplished: 85, subtextEvidence: "Meaningful in-person presence" },
  { dimension: "Creation", targetGoal: "ICU Clinical Prediction dataset code repository", percentAccomplished: 45, subtextEvidence: "Projects advanced independently" },
  { dimension: "Contribution", targetGoal: "Supervised weekend math mentoring for rural Class 6", percentAccomplished: 65, subtextEvidence: "Voluntary community commitment" },
];

export const SAMPLE_CONTRIBUTION_MATCHES: VolunteerContributionMatch[] = [
  {
    id: "contrib-peer-tutor",
    needHeadline: "Class 6 Math Mentorship at Kolkata Community Learning Hub",
    organizationOrPeer: "Vetted District Education Volunteer Network",
    skillsUtilized: ["Fractions & Visual Geometry", "Bengali / English Bilingual Guidance"],
    hoursPerMonth: 4,
    impactCreated: "Helps 3 first-generation rural students clear algebra anxiety without private coaching fees.",
  },
  {
    id: "contrib-open-health",
    needHeadline: "Translate WHO Essential Medicine Bulletins into Colloquial Bengali",
    organizationOrPeer: "Community Health Literacy Collective",
    skillsUtilized: ["Medical Domain Accuracy", "Empathetic Patient Communication"],
    hoursPerMonth: 3,
    impactCreated: "Empowers 1,200 rural families to verify generic medicine alternatives at Jan Aushadhi stores.",
  },
  {
    id: "contrib-accessibility-code",
    needHeadline: "Screen Reader High-Contrast Theme for Low-Cost Android Devices",
    organizationOrPeer: "Open Accessibility Collective",
    skillsUtilized: ["CSS / React UI hygiene", "Accessibility WCAG Standards"],
    hoursPerMonth: 5,
    impactCreated: "Enables visually impaired students to navigate government scholarship portals with zero lag.",
  },
];

export function resolveWhatNow(
  feeling: "focused" | "tired" | "lost" | "lonely" | "curious" | "stressed",
  timeAvailable: TimeAvailableSlot,
): IntentionalChoiceOption {
  if (feeling === "tired") {
    if (timeAvailable === "5min") {
      return {
        title: "Perform 3 Physiological Sighs & Rest Your Eyes",
        mode: "recover",
        deliberateChoice: true,
        actionDetails: "Double inhale through the nose, long extended exhale through the mouth. Close your eyes away from the screen.",
        rationale: "Zero guilt. Biological restoration restores prefrontal executive function faster than forcing groggy work.",
      };
    }
    if (timeAvailable === "30min") {
      return {
        title: "20-Minute Non-Sleep Deep Rest (NSDR) / Power Rest",
        mode: "recover",
        deliberateChoice: true,
        actionDetails: "Lie down in a quiet room, dim the lights, and allow your nervous system to downregulate.",
        rationale: "Rest is not lost time; it is active physiological consolidation for judgment and memory.",
      };
    }
    return {
      title: "Take a Leisurely Walk Outside or Enjoy an Inspiring Film",
      mode: "recover",
      deliberateChoice: true,
      actionDetails: "Put away textbooks and work trackers. Walk in nature or immerse yourself in a thoughtful movie with a loved one.",
      rationale: "Leisure chosen deliberately feeds imagination and character. The enemy is mindless scrolling, not rest.",
    };
  }

  if (feeling === "lonely") {
    return {
      title: "Call a Friend or Spend Unhurried Time with Family",
      mode: "connect",
      deliberateChoice: true,
      actionDetails: "Put your phone down and connect with someone whose voice grounds you. No agenda, just authentic human warmth.",
      rationale: "Human connection is a primary pillar of flourishing. Never sacrifice kinship on the altar of artificial productivity.",
    };
  }

  if (feeling === "curious") {
    return {
      title: "ARGUS Discovery Sandbox: Explore a Novel Domain",
      mode: "explore",
      deliberateChoice: true,
      actionDetails: "Investigate one creative or scientific frontier outside your standard syllabus (e.g., Python biostatistics or robotics).",
      rationale: "Lifelong curiosity expands the opportunity graph without jeopardizing core duty.",
    };
  }

  if (feeling === "stressed" || feeling === "lost") {
    return {
      title: "The 10-Minute Sensory Grounding & Priority De-clutter",
      mode: "learn",
      deliberateChoice: true,
      actionDetails: "Write down everything currently overwhelming you. Isolate the 1 single thing within your control right now.",
      rationale: "Order from chaos. When overwhelmed, do not redesign your whole life—take 1 small deliberate step.",
    };
  }

  // Feeling: focused
  if (timeAvailable === "5min") {
    return {
      title: "Review 5 Flashcards or Plan Your Next 90-Minute Block",
      mode: "learn",
      deliberateChoice: true,
      actionDetails: "Quick active recall retrieval or clean workspace setup.",
      rationale: "High focus, low time: prime your environment for immediate execution.",
    };
  }

  return {
    title: "Uninterrupted Deep Work Sprint on Your #1 Binding Constraint",
    mode: "build",
    deliberateChoice: true,
    actionDetails: "Silence all notifications. Work on your primary goal without switching context.",
    rationale: "Focused attention is your scarcest sovereign asset. Channel it into lasting capability.",
  };
}
