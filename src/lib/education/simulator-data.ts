import type { ClinicalCaseSimulation } from "./simulator-types";

export const CLINICAL_SIMULATOR_CASES: ClinicalCaseSimulation[] = [
  {
    id: "case-ed-tamponade",
    title: "Acute Hypotension in a Post-CABG Patient",
    difficulty: "Resident",
    department: "Emergency Department",
    patientDemographics: {
      age: 58,
      gender: "Male",
      chiefComplaint: "Severe progressive shortness of breath, lightheadedness, and cold clammy skin.",
    },
    initialVitals: {
      heartRateBpm: 124,
      bloodPressureSystolic: 82,
      bloodPressureDiastolic: 60,
      respiratoryRate: 28,
      spO2Percent: 91,
      temperatureCelsius: 36.8,
      glasgowComaScale: 14,
    },
    historyOfPresentIllness:
      "Patient is 7 days status-post Coronary Artery Bypass Graft (CABG). He was recovering uneventfully when he developed sudden acute chest pressure, dyspnea, and dizziness 45 minutes ago. No history of cough or fever.",
    physicalExaminationFindings: [
      "General: Pale, diaphoretic, agitated, sitting upright.",
      "Cardiovascular: Markedly distended jugular neck veins up to the angle of the jaw; heart sounds are notably muffled and distant on auscultation.",
      "Pulmonary: Bilateral lung fields are clear to auscultation with equal air entry.",
      "Peripheral: Weak thready radial pulses; systolic BP drops by 16 mmHg during normal inspiration (Pulsus Paradoxus > 10 mmHg).",
    ],
    examinerTrap:
      "Fatal Trap: Administering high-dose IV Furosemide or Nitroglycerin will cause immediate fatal cardiac arrest! In Cardiac Tamponade, cardiac output is critically dependent on high preload. Diuretics or vasodilators eliminate right ventricular filling.",
    availableInvestigations: [
      {
        id: "inv-bedside-echo",
        name: "Point-of-Care Echocardiogram (POCUS)",
        type: "bedside",
        costPoints: 10,
        turnaroundTimeSec: 1,
        resultSummary:
          "Large circumferential pericardial effusion with right ventricular diastolic collapse and plethoric, non-collapsing inferior vena cava (IVC).",
        highYieldLearningPoint:
          "Right ventricular diastolic collapse on echo is the most specific echocardiographic sign of Cardiac Tamponade.",
      },
      {
        id: "inv-ecg-12lead",
        name: "12-Lead Electrocardiogram",
        type: "bedside",
        costPoints: 5,
        turnaroundTimeSec: 2,
        resultSummary:
          "Sinus tachycardia at 122 bpm, generalized low QRS voltage (<5 mm in limb leads), and electrical alternans (beat-to-beat variation in QRS amplitude).",
        highYieldLearningPoint:
          "Electrical alternans is caused by the heart literally swinging back and forth within the massive fluid-filled pericardial sac.",
      },
      {
        id: "inv-portable-cxr",
        name: "Portable Chest X-Ray",
        type: "imaging",
        costPoints: 15,
        turnaroundTimeSec: 4,
        resultSummary:
          "Markedly enlarged, symmetrical globular cardiac silhouette ('water-bottle' heart) with clear lung fields.",
        highYieldLearningPoint:
          "In acute traumatic tamponade, CXR may be normal because the pericardium has not had time to stretch; in subacute/post-op effusions, water-bottle heart is classic.",
      },
    ],
    availableInterventions: [
      {
        id: "int-iv-fluids",
        name: "Aggressive IV Fluid Resuscitation (500-1000 mL Normal Saline)",
        category: "resuscitation",
        isCorrect: true,
        hemodynamicDelta: {
          bloodPressureSystolic: 94,
          bloodPressureDiastolic: 66,
          heartRateBpm: 112,
        },
        feedback: "Preload restored! Systolic blood pressure temporarily improves while preparing definitive intervention.",
        rationale:
          "Tamponade physiology requires elevated right-sided filling pressures to keep the collapsed RV chamber open during diastole.",
      },
      {
        id: "int-pericardiocentesis",
        name: "Immediate Subxiphoid Needle Pericardiocentesis with Ultrasound Guidance",
        category: "procedure",
        isCorrect: true,
        hemodynamicDelta: {
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 78,
          heartRateBpm: 84,
          spO2Percent: 98,
        },
        feedback: "Aspirated 180 mL of dark non-clotting blood. Blood pressure instantly surges to 120/78 mmHg, JVD collapses, and patient feels immediate relief!",
        rationale:
          "Pericardiocentesis is the definitive life-saving decompression. Removing even 30-50 mL shifts the steep pericardial volume-pressure curve, instantly reversing shock.",
      },
      {
        id: "int-iv-furosemide",
        name: "IV Furosemide 40 mg Bolus",
        category: "medication",
        isCorrect: false,
        isFatal: true,
        hemodynamicDelta: {
          bloodPressureSystolic: 40,
          bloodPressureDiastolic: 20,
          heartRateBpm: 150,
          glasgowComaScale: 6,
        },
        feedback: "FATAL ERROR! Diuresis abruptly dropped RV preload to near zero. Patient suffered sudden PEA (pulseless electrical activity) arrest!",
        rationale:
          "Diuretics and vasodilators are absolutely contraindicated in tamponade because they eliminate the preload maintaining cardiac output.",
      },
      {
        id: "int-intubation",
        name: "Immediate Endotracheal Intubation with Positive Pressure Ventilation",
        category: "procedure",
        isCorrect: false,
        hemodynamicDelta: {
          bloodPressureSystolic: 55,
          bloodPressureDiastolic: 35,
          heartRateBpm: 140,
        },
        feedback: "Severe hemodynamic deterioration! Positive intra-thoracic pressure further impeded venous return to the right heart.",
        rationale:
          "Positive pressure ventilation decreases venous return and precipitates immediate circulatory collapse in tamponade.",
      },
    ],
    finalDiagnosis: "Acute Cardiac Tamponade (Post-Cardiac Surgery / Hemopericardium)",
    clinicalPearls: [
      "Beck's Triad = Hypotension, Distended Neck Veins (JVD), Muffled Heart Sounds.",
      "Pulsus Paradoxus = Exaggerated drop in systolic BP (>10 mmHg) during normal inspiration.",
      "POCUS Echo is the fastest confirmatory test: RV diastolic collapse is pathognomonic.",
      "Definitive Emergency Treatment: Urgent Subxiphoid Pericardiocentesis.",
    ],
  },
  {
    id: "case-ed-anaphylaxis",
    title: "Sudden Collapse in Dental Outpatient Clinic",
    difficulty: "Resident",
    department: "Emergency Department",
    patientDemographics: {
      age: 27,
      gender: "Female",
      chiefComplaint: "Stridor, generalized urticaria, facial swelling, and dizziness within 5 minutes of antibiotic injection.",
    },
    initialVitals: {
      heartRateBpm: 138,
      bloodPressureSystolic: 70,
      bloodPressureDiastolic: 42,
      respiratoryRate: 36,
      spO2Percent: 84,
      temperatureCelsius: 37.1,
      glasgowComaScale: 13,
    },
    historyOfPresentIllness:
      "Patient received intramuscular Amoxicillin-Clavulanate for a dental abscess. Within 4 minutes, she experienced intense pruritus, generalized hives, throat tightness, hoarseness, and sudden syncope upon standing.",
    physicalExaminationFindings: [
      "General: Audible inspiratory stridor, profound lip and uvular angioedema.",
      "Skin: Confluent erythematous wheals and urticaria covering face, chest, and arms.",
      "Respiratory: Severe bilateral expiratory wheezing with subcostal retractions.",
      "Cardiovascular: Tachycardic, weak thready pulses, cool peripheries.",
    ],
    examinerTrap:
      "Trap: Giving IV Hydrocortisone or Chlorpheniramine as the FIRST step is a fatal delay! Antihistamines and steroids take hours to take effect. The single life-saving drug that MUST be given in the first 60 seconds is INTRAMUSCULAR EPINEPHRINE (1:1000) in the anterolateral thigh.",
    availableInvestigations: [
      {
        id: "inv-abg",
        name: "Arterial Blood Gas (ABG)",
        type: "lab",
        costPoints: 10,
        turnaroundTimeSec: 3,
        resultSummary: "pH 7.28, PaO2 54 mmHg (severe hypoxemia), PaCO2 48 mmHg (impending respiratory muscle fatigue).",
        highYieldLearningPoint:
          "Normal or elevated PaCO2 during an acute asthma/anaphylaxis attack indicates impending respiratory failure.",
      },
      {
        id: "inv-bedside-laryngoscopy",
        name: "Bedside Fiberoptic Laryngoscopy",
        type: "bedside",
        costPoints: 15,
        turnaroundTimeSec: 2,
        resultSummary: "Massive edema of epiglottis, aryepiglottic folds, and false vocal cords with pinpoint glottic aperture.",
        highYieldLearningPoint:
          "Severe laryngeal edema requires immediate adrenaline and immediate readiness for emergency surgical airway (cricothyroidotomy).",
      },
    ],
    availableInterventions: [
      {
        id: "int-im-epinephrine",
        name: "Immediate Intramuscular Epinephrine 1:1000 (0.5 mg) into Anterolateral Thigh",
        category: "medication",
        isCorrect: true,
        hemodynamicDelta: {
          bloodPressureSystolic: 110,
          bloodPressureDiastolic: 72,
          heartRateBpm: 110,
          spO2Percent: 95,
          respiratoryRate: 20,
        },
        feedback: "Alpha-1 vasoconstriction reversed shock, Beta-2 bronchodilation relieved bronchospasm and stabilized mast cells! Stridor rapidly diminishes.",
        rationale:
          "Intramuscular adrenaline in the vastus lateralis achieves peak plasma levels significantly faster than subcutaneous or deltoid injection. First-line drug of choice.",
      },
      {
        id: "int-high-flow-o2",
        name: "High-Flow Oxygen 15 L/min via Non-Rebreather Mask + 2 Large Bore IVs",
        category: "resuscitation",
        isCorrect: true,
        hemodynamicDelta: {
          spO2Percent: 92,
        },
        feedback: "Oxygen delivery improved while adrenaline works systemically.",
        rationale:
          "Essential adjunct therapy to combat severe hypoxemia caused by upper airway angioedema and bronchospasm.",
      },
      {
        id: "int-iv-steroids-only",
        name: "IV Hydrocortisone 200 mg and IV Pheniramine as Primary Therapy",
        category: "medication",
        isCorrect: false,
        hemodynamicDelta: {
          bloodPressureSystolic: 50,
          bloodPressureDiastolic: 30,
          spO2Percent: 78,
          glasgowComaScale: 8,
        },
        feedback: "Severe condition worsening! Steroids have zero immediate effect on acute airway closure or vascular collapse.",
        rationale:
          "Corticosteroids prevent biphasic late reactions (hours later) but do NOT reverse acute life-threatening bronchospasm or distributive shock.",
      },
    ],
    finalDiagnosis: "Severe Anaphylactic Shock (IgE-mediated Type I Hypersensitivity to Penicillin)",
    clinicalPearls: [
      "Drug of choice is Intramuscular Adrenaline (1:1000, 0.5 mg in adults, 0.01 mg/kg in children).",
      "Site of injection: Anterolateral thigh (vastus lateralis) due to superior vascular absorption.",
      "Antihistamines and steroids are SECOND-LINE agents that never substitute for epinephrine.",
      "Observe patient for 6-8 hours minimum to monitor for biphasic anaphylaxis.",
    ],
  },
];
