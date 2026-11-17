/**
 * Core BTR Official YouTube Broadcasts & "Core Drops" Hub
 * Integrated with Dr. Zainab Vora's official channel: @corebtrbyzainabvora
 */

export interface BTRBroadcastVideo {
  id: string;
  youtubeId: string;
  title: string;
  category: "core_drop" | "inicet_recall" | "neetpg_strategy" | "topper_blueprint" | "mega_revision";
  categoryLabel: string;
  durationLabel: string;
  description: string;
  keyPearls: string[];
  publishedDate: string;
  isDailyCoreDrop?: boolean;
}

export const CORE_BTR_OFFICIAL_CHANNEL = {
  handle: "@corebtrbyzainabvora",
  name: "CoreBTR by Dr. Zainab Vora",
  url: "https://www.youtube.com/@corebtrbyzainabvora",
  tagline: "Believe, Trust, and Revise • Official Broadcasts & Daily 3 PM Core Drops",
};

export const CORE_BTR_BROADCASTS: BTRBroadcastVideo[] = [
  {
    id: "drop-volatiles-recap",
    youtubeId: "uBGl2BujkPQ",
    title: "Daily Core Drop #01: Super-Volatiles 10-Minute Rapid Sieve",
    category: "core_drop",
    categoryLabel: "Core Drop (3:00 PM)",
    durationLabel: "12 mins",
    description: "Dr. Zainab Vora covers the top 10 volatile numbers that students frequently confuse in Grand Tests.",
    keyPearls: [
      "BMW Blue category: Glassware and metallic implants only; no sharps.",
      "Kangaroo Mother Care minimum duration: 1 hour continuous skin-to-skin.",
      "Sensitivity = TP / (TP + FN); Specificity = TN / (TN + FP).",
    ],
    publishedDate: "Daily Broadcast",
    isDailyCoreDrop: true,
  },
  {
    id: "inicet-may-recall-trends",
    youtubeId: "qPix_X-9t7E",
    title: "INI-CET Recall Master Analysis: Integrated Systems & Clinical Vignettes",
    category: "inicet_recall",
    categoryLabel: "INI-CET Recall",
    durationLabel: "1 hr 45 mins",
    description: "Systematic breakdown of multi-system clinical questions, repeat PYQs, and controversial question keys.",
    keyPearls: [
      "INI-CET heavily tests two-step mechanisms rather than standalone facts.",
      "Look for the single discriminating lab parameter in endocrine questions.",
      "Radiology spotters are integrated with surgical management steps.",
    ],
    publishedDate: "Post-Exam Special",
  },
  {
    id: "btr-phase-roadmap",
    youtubeId: "OZG8M_ldA1M",
    title: "How to Complete 4 Cycles of BTR Before NEET-PG 2027",
    category: "neetpg_strategy",
    categoryLabel: "Master Strategy",
    durationLabel: "38 mins",
    description: "Dr. Zainab explains the pacing framework: Phase 1 Unannotated base, Phase 2 Annotation + GT, Phase 3 Super-Volatiles, Phase 4 Mega BTR Blitz.",
    keyPearls: [
      "Do not watch videos passively: write active annotations in the unannotated booklet.",
      "Review GT mistakes within 48 hours while stems are fresh in working memory.",
      "Aim for 80+ daily questions alongside BTR reading.",
    ],
    publishedDate: "Orientation Masterclass",
  },
  {
    id: "drop-biostats-formulas",
    youtubeId: "lUe_RI_m-Vg",
    title: "Daily Core Drop #02: Biostatistics 2x2 Table & Odds Ratio vs Relative Risk",
    category: "core_drop",
    categoryLabel: "Core Drop (3:00 PM)",
    durationLabel: "15 mins",
    description: "Mastering Case-Control vs Cohort calculations, NNT formula, and positive predictive value shifts with prevalence.",
    keyPearls: [
      "Odds Ratio = (a*d) / (b*c); Relative Risk = [a/(a+b)] / [c/(c+d)].",
      "NNT = 1 / ARR (Absolute Risk Reduction).",
      "As prevalence increases, PPV increases and NPV decreases.",
    ],
    publishedDate: "Daily Broadcast",
    isDailyCoreDrop: true,
  },
  {
    id: "topper-blueprint-air12",
    youtubeId: "D-SzmURNBH0",
    title: "Topper Blueprint: From 120 Correct in First GT to Rank 24 in INI-CET",
    category: "topper_blueprint",
    categoryLabel: "Topper Blueprint",
    durationLabel: "42 mins",
    description: "Step-by-step interview analyzing the daily routine, GT error log system, and 7-day pre-exam BTR schedule.",
    keyPearls: [
      "Consistent 3-hour BTR active recall daily outranked marathon 14-hour passive cramming.",
      "Volatile notebook should be reviewed every night for 30 minutes before bed.",
      "T&D questions are identical to the actual exam difficulty curve.",
    ],
    publishedDate: "Achievers Series",
  },
  {
    id: "mega-btr-revision-marathon",
    youtubeId: "Jvtb0a2RXaY",
    title: "Mega BTR Marathon Orientation: 19 Subjects in 72 Hours Protocol",
    category: "mega_revision",
    categoryLabel: "Mega BTR Blitz",
    durationLabel: "28 mins",
    description: "How to pace the 6 Mega BTR marathon lectures at 1.75x in the final 3 days before exam day.",
    keyPearls: [
      "Day 1: Short Clinicals + Pre-Clinicals (Anatomy, Physio, Biochem, FMT, ENT, Ophtha).",
      "Day 2: Para-Clinicals + Pathology + Pharmacology + Micro.",
      "Day 3: Long Clinicals & Integrated Medicine, Surgery, OBGYN, Peds.",
    ],
    publishedDate: "Exam Countdown Special",
  },
];
