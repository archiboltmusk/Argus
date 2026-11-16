/**
 * Core BTR Two-Step Clinical Case Vignette Drill Engine
 * Generates high-yield INI-CET & NEET-PG two-step clinical vignette scenarios
 * based on Dr. Zainab Vora's core comparison tables.
 */

export interface BTRClinicalVignette {
  id: string;
  subject: string;
  difficulty: "INI-CET High Ranker" | "NEET-PG Repeat Core" | "Must-Know Foundation";
  casePresentation: string;
  step1ImplicitDiagnosis: string;
  step2TargetQuestion: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  detailedRationale: string;
  examinerTrapBreakdown: string;
}

export const BTR_CLINICAL_VIGNETTES: BTRClinicalVignette[] = [
  {
    id: "case-1",
    subject: "Endocrine & Pharmacology",
    difficulty: "INI-CET High Ranker",
    casePresentation: "A 42-year-old female presents with episodic pounding headaches, profuse diaphoresis, and palpitations. On exam, BP is 210/115 mmHg and pulse is 112 bpm. 24-hour urinary fractionated metanephrines are elevated 5-fold. Abdominal MRI reveals a 4.5 cm heterogeneously enhancing right adrenal mass. She is scheduled for laparoscopic adrenalectomy.",
    step1ImplicitDiagnosis: "Pheochromocytoma",
    step2TargetQuestion: "Which pre-operative pharmacotherapy sequence must be instituted first before surgical resection to prevent intraoperative catastrophic hemodynamic collapse?",
    options: [
      "A) Oral Propranolol for 7 days followed by Phenoxybenzamine",
      "B) Oral Phenoxybenzamine for 10-14 days followed by Beta-blocker",
      "C) Intravenous Nitroprusside infusion followed by Verapamil",
      "D) Immediate resection without pharmacotherapy to prevent tumor rupture",
    ],
    correctOptionIndex: 1,
    detailedRationale: "In pheochromocytoma, non-competitive irreversible alpha-blockade (Phenoxybenzamine) MUST be started at least 10-14 days prior to surgery to expand contracted intravascular volume. Beta-blockers are added only AFTER full alpha-blockade to manage reflex tachycardia. If beta-blocker is started first, unopposed alpha-1 stimulation causes lethal hypertensive crisis.",
    examinerTrapBreakdown: "Option A is a lethal examiner trap. Never start beta-blockers before establishing complete alpha blockade.",
  },
  {
    id: "case-2",
    subject: "Cardiology & Emergency",
    difficulty: "INI-CET High Ranker",
    casePresentation: "A 24-year-old male with a history of intermittent palpitations presents to the ED with acute chest fluttering and lightheadedness. ECG reveals an irregular, wide-complex tachycardia with variable QRS morphology and ventricular rate fluctuating between 190 and 240 bpm. Baseline ECG from 6 months ago showed a short PR interval and delta waves.",
    step1ImplicitDiagnosis: "Atrial Fibrillation with Wolff-Parkinson-White (WPW) Syndrome",
    step2TargetQuestion: "Which of the following medications is strictly contraindicated in this acute presentation due to the risk of precipitating ventricular fibrillation?",
    options: [
      "A) Intravenous Procainamide",
      "B) Intravenous Ibutilide",
      "C) Intravenous Adenosine",
      "D) Synchronized DC Cardioversion",
    ],
    correctOptionIndex: 2,
    detailedRationale: "In pre-excited atrial fibrillation with WPW, AV nodal blocking agents (the 'ABCD' drugs: Adenosine, Beta-blockers, Calcium channel blockers, and Digoxin) block conduction through the normal AV node, forcing 100% of impulses down the fast accessory pathway (Bundle of Kent), rapidly triggering Ventricular Fibrillation and cardiac arrest.",
    examinerTrapBreakdown: "Adenosine is the drug of choice for regular narrow-complex PSVT, but is strictly contraindicated in AF with WPW.",
  },
  {
    id: "case-3",
    subject: "Pediatrics & Genetics",
    difficulty: "NEET-PG Repeat Core",
    casePresentation: "A 4-month-old male infant is brought with recurrent episodes of vomiting, irritability, and sweating during fasting. Physical exam shows massive hepatomegaly (liver edge 5 cm below costal margin), xanthomas over extensor surfaces, and a rounded doll-like facial appearance. Serum analysis shows fasting glucose 34 mg/dL, marked lactic acidosis, hyperuricemia, and severe hypertriglyceridemia.",
    step1ImplicitDiagnosis: "Von Gierke Disease (Glycogen Storage Disease Type I)",
    step2TargetQuestion: "What is the primary enzymatic defect responsible for this metabolic constellation?",
    options: [
      "A) Lysosomal alpha-1,4-glucosidase (Acid maltase)",
      "B) Glucose-6-phosphatase",
      "C) Glycogen debranching enzyme",
      "D) Muscle glycogen phosphorylase",
    ],
    correctOptionIndex: 1,
    detailedRationale: "Von Gierke disease (Type I GSD) is caused by Glucose-6-phosphatase deficiency in the liver and kidney. Because G6P cannot be converted to free glucose, patients have severe fasting hypoglycemia and hepatomegaly with lactic acidosis, hyperuricemia, and doll-like facies. Dietary management requires frequent cornstarch feedings.",
    examinerTrapBreakdown: "Pompe disease (Type II) is lysosomal acid maltase deficiency; it characteristically presents with massive cardiomegaly and early infantile heart failure, but NOT hypoglycemia.",
  },
  {
    id: "case-4",
    subject: "Microbiology & Infectious Diseases",
    difficulty: "NEET-PG Repeat Core",
    casePresentation: "A 34-year-old male who recently went on a camping trek in Himachal Pradesh presents with high-grade fever, severe headache, conjunctival suffusion, and a 6 mm painless blackened eschar with an erythematous halo in the groin region. A clinical diagnosis of Scrub Typhus is suspected.",
    step1ImplicitDiagnosis: "Scrub Typhus (Orientia tsutsugamushi)",
    step2TargetQuestion: "What is the transmitting vector and the antimicrobial drug of choice for this condition?",
    options: [
      "A) Chigger mite (Leptotrombidium deliense); Oral Doxycycline",
      "B) Hard tick (Ixodes scapularis); Oral Amoxicillin",
      "C) Human body louse (Pediculus humanus); Intravenous Ceftriaxone",
      "D) Rat flea (Xenopsylla cheopis); Oral Ciprofloxacin",
    ],
    correctOptionIndex: 0,
    detailedRationale: "Scrub typhus is caused by Orientia tsutsugamushi, transmitted by the bite of the larval stage (chigger) of Leptotrombidium trombiculid mites. The characteristic pathognomonic lesion is a cigarette-burn eschar. Drug of choice is Doxycycline (100 mg BID for 7 days); Azithromycin is the drug of choice in pregnancy.",
    examinerTrapBreakdown: "Ixodes transmits Lyme disease (Borrelia burgdorferi); Xenopsylla transmits Bubonic plague (Yersinia pestis) and Endemic typhus (R. typhi).",
  },
];
