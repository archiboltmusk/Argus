/**
 * Argus CoreBTR Multi-Step Branching Clinical Decision Trees
 *
 * Implements sequential, consequence-driven diagnostic simulations modeled after
 * INI-CET / AIIMS and USMLE Step 3 Clinical Case Presentations.
 *
 * Each scenario features:
 * - Stage 1: Initial Presentation & Bedside Triage
 * - Stage 2: Confirmatory Diagnostic Selection (Traps lead to hemodynamic decompensation)
 * - Stage 3: Management of Complications / Therapeutic Intervention
 */

export interface DecisionBranchOption {
  id: string;
  label: string;
  isOptimal: boolean;
  isFatalTrap: boolean;
  clinicalConsequence: string;
  mechanismAutopsy: string;
  nextStageId?: string; // If optimal or survivable
}

export interface DecisionStage {
  id: string;
  stageNumber: number;
  stageTitle: string;
  patientVitals: {
    hr: number;
    bp: string;
    rr: number;
    spo2: number;
    gcs?: number;
  };
  clinicalNarrative: string;
  investigationFindings?: string;
  options: DecisionBranchOption[];
}

export interface BranchingScenario {
  id: string;
  title: string;
  specialty: string;
  initialChiefComplaint: string;
  difficulty: "HighYieldCore" | "FrontierDecider";
  tags: string[];
  stages: DecisionStage[];
  debriefingBottomLine: string;
}

export const BRANCHING_CLINICAL_SCENARIOS: BranchingScenario[] = [
  // Case 1: Polytrauma Hemodynamic Resuscitation
  {
    id: "branch-trauma-01",
    title: "Blunt Abdominal Polytrauma: The Unstable CT Trap",
    specialty: "Surgery / Emergency Medicine",
    initialChiefComplaint: "24-year-old motorcyclist brought to trauma bay after high-speed collision.",
    difficulty: "HighYieldCore",
    tags: ["Trauma", "Surgery", "FAST", "Hemodynamic Shock"],
    debriefingBottomLine:
      "Cardinal Rule of Trauma: NEVER transport an unstable patient to the CT scanner ('The Tunnel of Death'). In an unstable patient (BP < 90), positive FAST equals emergent exploratory laparotomy.",
    stages: [
      {
        id: "t1-stage-1",
        stageNumber: 1,
        stageTitle: "Stage 1: Primary Survey & Bedside Triage",
        patientVitals: { hr: 132, bp: "78/48", rr: 28, spo2: 93, gcs: 14 },
        clinicalNarrative:
          "Patient is pale, diaphoretic, and confused. Airway is patent with high-flow oxygen. Bilateral breath sounds are equal. Abdomen is mildly distended with diffuse involuntary guarding. Pelvis is stable. Two large-bore IV cannulae are placed.",
        options: [
          {
            id: "t1-opt-1",
            label: "Rush immediately for Contrast-Enhanced CT (CECT) of Abdomen & Pelvis to localize organ laceration",
            isOptimal: false,
            isFatalTrap: true,
            clinicalConsequence:
              "FATAL TRAP: Patient undergoes cardiac arrest in the CT gantry 8 minutes into scanning. Resuscitation fails.",
            mechanismAutopsy:
              "The 'Tunnel of Death' trap: Unstable blunt trauma patients must NEVER enter a CT room. Diagnostic imaging must be bedside (FAST) or operative.",
          },
          {
            id: "t1-opt-2",
            label: "Perform immediate Bedside Extended Focused Assessment with Sonography in Trauma (eFAST) + Balanced Hemostatic Transfusion (1:1:1 PRBC, FFP, Platelets)",
            isOptimal: true,
            isFatalTrap: false,
            clinicalConsequence:
              "Resuscitation initiated. eFAST demonstrates free anechoic fluid in Morison's pouch and splenorenal recess. No pneumothorax.",
            mechanismAutopsy:
              "eFAST is the gold standard bedside test for unstable trauma. Balanced blood product resuscitation prevents trauma triad of death (hypothermia, acidosis, coagulopathy).",
            nextStageId: "t1-stage-2",
          },
          {
            id: "t1-opt-3",
            label: "Infuse 3 Liters of chilled Normal Saline rapidly through pressure bags before imaging",
            isOptimal: false,
            isFatalTrap: false,
            clinicalConsequence:
              "Transient BP rise to 88/54 followed by severe dilutional coagulopathy, hypothermia, and worsening bleeding.",
            mechanismAutopsy:
              "Outdated ATLS dogma: Aggressive crystalloid resuscitation dislodges early platelet plugs and induces lethal coagulopathy. Permissive hypotension with blood products is the modern standard.",
            nextStageId: "t1-stage-2",
          },
        ],
      },
      {
        id: "t1-stage-2",
        stageNumber: 2,
        stageTitle: "Stage 2: Operative Decision-Making",
        patientVitals: { hr: 126, bp: "82/50", rr: 24, spo2: 95 },
        clinicalNarrative:
          "eFAST confirms massive hemoperitoneum. Despite 2 units of uncrossed O-negative blood, mean arterial pressure remains < 60 mmHg. What is the definitive immediate intervention?",
        options: [
          {
            id: "t2-opt-1",
            label: "Transfer to Interventional Radiology for splenic artery transcatheter embolization",
            isOptimal: false,
            isFatalTrap: true,
            clinicalConsequence:
              "IR suite delay of 45 minutes results in refractory hemorrhagic arrest.",
            mechanismAutopsy:
              "Angioembolization is reserved strictly for HEMODYNAMICALLY STABLE patients with splenic blush on CT. Ongoing instability with positive FAST mandates laparotomy.",
          },
          {
            id: "t2-opt-2",
            label: "Immediate Transfer to Operating Theatre for Damage Control Laparotomy with four-quadrant abdominal packing",
            isOptimal: true,
            isFatalTrap: false,
            clinicalConsequence:
              "Four-quadrant packing controls Grade IV splenic rupture and liver laceration. Patient stabilized for temporary abdominal closure.",
            mechanismAutopsy:
              "Damage Control Surgery (DCS): Abbreviated laparotomy (< 60 mins), packing, and temporary abdominal closure followed by ICU resuscitation before planned re-look.",
            nextStageId: "t1-stage-3",
          },
        ],
      },
      {
        id: "t1-stage-3",
        stageNumber: 3,
        stageTitle: "Stage 3: ICU Critical Care Complication",
        patientVitals: { hr: 104, bp: "110/68", rr: 20, spo2: 97 },
        clinicalNarrative:
          "In the Surgical ICU 14 hours post-damage control laparotomy, peak airway pressures spike to 45 cmH2O. Urine output drops to 8 mL/hr. Bladder pressure catheter measures 28 mmHg. What is the diagnosis and rescue intervention?",
        options: [
          {
            id: "t3-opt-1",
            label: "Abdominal Compartment Syndrome (ACS): Immediate bedside release of temporary abdominal closure / decompressive laparostomy",
            isOptimal: true,
            isFatalTrap: false,
            clinicalConsequence:
              "Bedside decompression restores renal perfusion; bladder pressure drops to 12 mmHg; airway pressures normalize.",
            mechanismAutopsy:
              "Intra-abdominal hypertension (IAH > 20 mmHg) with new organ dysfunction defines ACS. Emergent surgical decompression is lifesaving.",
          },
          {
            id: "t3-opt-2",
            label: "Acute Tubular Necrosis (ATN): Administer 80 mg IV furosemide bolus and increase PEEP",
            isOptimal: false,
            isFatalTrap: true,
            clinicalConsequence:
              "Furosemide accelerates hypovolemic collapse while increased PEEP further impairs venous return. Patient suffers cardiac arrest.",
            mechanismAutopsy:
              "Oliguria in ACS is due to renal vein compression from intra-abdominal hypertension. Diuretics worsen the underlying circulatory failure.",
          },
        ],
      },
    ],
  },

  // Case 2: Acute Massive PE with Thrombolytic Decision
  {
    id: "branch-pe-02",
    title: "Massive Pulmonary Embolism & The Bleeding Dilemma",
    specialty: "Cardiology / Pulmonology",
    initialChiefComplaint: "58-year-old female 10 days post-knee replacement presents with sudden severe syncope and dyspnea.",
    difficulty: "FrontierDecider",
    tags: ["Pulmonology", "Cardiology", "PE", "ECG", "Thrombolysis"],
    debriefingBottomLine:
      "High-risk (Massive) PE is defined by sustained hypotension (SBP < 90) or shock. Immediate systemic thrombolysis (or catheter-directed embolectomy if strict contraindication) takes precedence over diagnostic delay.",
    stages: [
      {
        id: "pe-stage-1",
        stageNumber: 1,
        stageTitle: "Stage 1: Bedside Differentiation",
        patientVitals: { hr: 138, bp: "74/46", rr: 36, spo2: 84 },
        clinicalNarrative:
          "Patient is in profound cardiogenic shock with elevated jugular venous distension. ECG reveals S1Q3T3 pattern with new right bundle branch block (RBBB). Bedside echocardiography shows severely dilated right ventricle with McConnell's sign (hyperdynamic RV apex with akinetic RV free wall).",
        options: [
          {
            id: "pe1-opt-1",
            label: "Initiate systemic thrombolysis with recombinant tissue plasminogen activator (Alteplase 100 mg IV over 2 hours) + IV unfractionated heparin",
            isOptimal: true,
            isFatalTrap: false,
            clinicalConsequence:
              "Within 45 minutes, right ventricular strain diminishes, SBP recovers to 102/64, and PaO2 improves dramatically.",
            mechanismAutopsy:
              "In massive PE with hemodynamic collapse, systemic thrombolysis rapidly dissolves mechanical outflow obstruction and reverses fatal RV failure.",
            nextStageId: "pe-stage-2",
          },
          {
            id: "pe1-opt-2",
            label: "Infuse 2 Liters of IV crystalloid boluses to increase right ventricular preload",
            isOptimal: false,
            isFatalTrap: true,
            clinicalConsequence:
              "Excessive volume loading causes acute right ventricular dilatation, interventricular septal shift into left ventricle, and complete loss of cardiac output.",
            mechanismAutopsy:
              "The RV Overload Trap: The failing ischemic right ventricle operates on the descending limb of Starling curve. Volume loading increases RV wall stress and exacerbates ischemia.",
          },
        ],
      },
      {
        id: "pe-stage-2",
        stageNumber: 2,
        stageTitle: "Stage 2: Post-Lysis Monitoring",
        patientVitals: { hr: 96, bp: "112/72", rr: 20, spo2: 96 },
        clinicalNarrative:
          "Hemodynamics have normalized. 6 hours post-thrombolysis, what anticoagulation regimen must be maintained?",
        options: [
          {
            id: "pe2-opt-1",
            label: "Maintain IV unfractionated heparin with aPTT monitoring at 1.5 - 2.5 times control, transitioning to oral direct oral anticoagulant (DOAC) once stabilized",
            isOptimal: true,
            isFatalTrap: false,
            clinicalConsequence:
              "Smooth stabilization with zero hemorrhagic events. Patient successfully bridged to Apixaban on Day 3.",
            mechanismAutopsy:
              "Continuous unfractionated heparin is easily reversible with protamine if bleeding occurs in the early post-thrombolytic period.",
          },
          {
            id: "pe2-opt-2",
            label: "Stop all anticoagulants for 48 hours to avoid intracranial hemorrhage",
            isOptimal: false,
            isFatalTrap: true,
            clinicalConsequence:
              "Rebound thromboembolism occurs at 18 hours with fatal cardiac arrest.",
            mechanismAutopsy:
              "Thrombolysis only dissolves existing clot; the prothrombotic state remains extreme. Anticoagulation must never be interrupted.",
          },
        ],
      },
    ],
  },
];
