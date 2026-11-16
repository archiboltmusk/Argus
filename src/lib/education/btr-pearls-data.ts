export interface BTRPearlItem {
  id: string;
  code: string; // e.g. P-89341049
  subjectId: string;
  title: string;
  highYieldSummary: string;
  status: "Completed" | "In Progress" | "Not Viewed";
  is2VRecommended?: boolean;
}

export interface BTRSubjectQBankTopic {
  id: string;
  name: string;
  totalQuestions: number;
  completedQuestions: number;
}

export const BTR_TOPIC_WISE_QBANK: Record<string, BTRSubjectQBankTopic[]> = {
  radiology: [
    { id: "gen_rad", name: "General Radiology", totalQuestions: 22, completedQuestions: 1 },
    { id: "gi_rad", name: "GI & HBP Radiology", totalQuestions: 25, completedQuestions: 2 },
    { id: "gu_rad", name: "GU Radiology", totalQuestions: 21, completedQuestions: 1 },
    { id: "thoracic_rad", name: "Thoracic Radiology", totalQuestions: 42, completedQuestions: 1 },
    { id: "neuro_rad", name: "Neuroradiology", totalQuestions: 40, completedQuestions: 2 },
    { id: "rad_therapy", name: "Radiotherapy & Nuclear Medicine", totalQuestions: 19, completedQuestions: 0 },
  ],
  orthopedics: [
    { id: "trauma", name: "Trauma & Fractures", totalQuestions: 45, completedQuestions: 4 },
    { id: "upper_limb", name: "Upper Limb Pathology", totalQuestions: 38, completedQuestions: 2 },
    { id: "lower_limb", name: "Lower Limb & Pelvis", totalQuestions: 42, completedQuestions: 1 },
    { id: "spine", name: "Spine & Pediatric Orthopedics", totalQuestions: 36, completedQuestions: 0 },
    { id: "bone_tumors", name: "Bone Tumors & Infections", totalQuestions: 34, completedQuestions: 1 },
    { id: "special_tests", name: "Special Tests & Clinical Signs", totalQuestions: 34, completedQuestions: 3 },
  ],
  dermatology: [
    { id: "papulosquamous", name: "Papulosquamous Disorders", totalQuestions: 35, completedQuestions: 3 },
    { id: "vesiculobullous", name: "Vesiculobullous Diseases", totalQuestions: 30, completedQuestions: 2 },
    { id: "infections_skin", name: "Infections & Infestations", totalQuestions: 40, completedQuestions: 1 },
    { id: "hair_nail", name: "Hair, Nail & Pigmentary Disorders", totalQuestions: 32, completedQuestions: 0 },
    { id: "leprosy_stds", name: "Leprosy & Sexually Transmitted Infections", totalQuestions: 47, completedQuestions: 2 },
  ],
  psychiatry: [
    { id: "schizo", name: "Schizophrenia & Psychotic Disorders", totalQuestions: 28, completedQuestions: 2 },
    { id: "mood", name: "Mood Disorders (Depression & Bipolar)", totalQuestions: 26, completedQuestions: 1 },
    { id: "anxiety", name: "Anxiety, OCD & Stress Disorders", totalQuestions: 22, completedQuestions: 0 },
    { id: "substance", name: "Substance Use Disorders", totalQuestions: 18, completedQuestions: 1 },
    { id: "paraphilias", name: "Paraphilias & Sexual Disorders", totalQuestions: 15, completedQuestions: 1 },
  ],
};

export const BTR_PEARLS_DATABASE: Record<string, BTRPearlItem[]> = {
  orthopedics: [
    {
      id: "p1",
      code: "P-89341049",
      subjectId: "orthopedics",
      title: "Special Tests for Knee Ligament and Meniscal Injuries",
      highYieldSummary: "Lachman test (most sensitive for ACL), Pivot shift (most specific for ACL), McMurray & Apley grinding tests for meniscal tears.",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "p2",
      code: "P-72689038",
      subjectId: "orthopedics",
      title: "Thoracic Outlet Syndrome Tests",
      highYieldSummary: "Adson's test (radial pulse diminishes on ipsilateral head turning with deep inspiration), Wright's test (hyperabduction), Roos stress test.",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "p3",
      code: "P-65456463",
      subjectId: "orthopedics",
      title: "Common Nerve Injuries and Associated Pathologies",
      highYieldSummary: "Radial nerve in spiral groove fracture (wrist drop), Ulnar nerve at medial epicondyle (claw hand), Axillary nerve in surgical neck of humerus (deltoid atrophy).",
      status: "In Progress",
      is2VRecommended: true,
    },
    {
      id: "p4",
      code: "P-51673996",
      subjectId: "orthopedics",
      title: "Seddon's Classification of Nerve Injury",
      highYieldSummary: "Neuropraxia (physiological conduction block, complete recovery), Axonotmesis (axon disrupted, endoneurium intact, Wallerian degeneration), Neurotmesis (transection, surgical repair required).",
      status: "Completed",
    },
    {
      id: "p5",
      code: "P-23838920",
      subjectId: "orthopedics",
      title: "Radial Nerve Injury - Site vs Deficit",
      highYieldSummary: "Axilla injury: loss of triceps + wrist drop + sensory loss over anatomical snuffbox. Spiral groove: triceps spared, wrist drop present. Posterior interosseous nerve (PIN): finger drop without sensory loss.",
      status: "In Progress",
    },
    {
      id: "p6",
      code: "P-55033580",
      subjectId: "orthopedics",
      title: "Localization of Radial Nerve Injuries",
      highYieldSummary: "Detailed motor vs sensory innervation along radial trunk, arcade of Frohse entrapment, and supinator tunnel syndrome.",
      status: "Not Viewed",
    },
    {
      id: "p7",
      code: "P-41530787",
      subjectId: "orthopedics",
      title: "Important Fractures & Named Injuries",
      highYieldSummary: "Monteggia (Proximal 1/3 ulna fracture + radial head dislocation), Galeazzi (Distal 1/3 radius fracture + distal radioulnar joint dislocation), Colles (Dinner fork deformity with dorsal displacement).",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "p8",
      code: "P-87346745",
      subjectId: "orthopedics",
      title: "Gustilo-Anderson Classification of Open Fractures",
      highYieldSummary: "Type I: <1cm clean wound; Type II: 1-10cm without extensive soft tissue damage; Type IIIA: >10cm with adequate soft tissue coverage; IIIB: periosteal stripping needing flap; IIIC: arterial injury requiring repair.",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "p9",
      code: "P-32636047",
      subjectId: "orthopedics",
      title: "Gartland Classification of Supracondylar Humerus Fracture",
      highYieldSummary: "Type I: Undisplaced (anterior humeral line passes through middle 1/3 capitellum); Type II: Angulated with posterior cortex intact; Type III: Completely displaced with posterolateral vs posteromedial displacement.",
      status: "Not Viewed",
    },
    {
      id: "p10",
      code: "P-95483024",
      subjectId: "orthopedics",
      title: "Intertrochanteric & Neck of Femur Fracture",
      highYieldSummary: "Intracapsular (Garden classification, avascular necrosis risk of femoral head) vs Extracapsular (Intertrochanteric, high union rate, managed with DHS or PFN).",
      status: "Not Viewed",
    },
    {
      id: "p11",
      code: "P-70147136",
      subjectId: "orthopedics",
      title: "Skin and Skeletal Traction",
      highYieldSummary: "Buck's traction (<5kg, skin), Thomas splint, Bohler-Braun frame, Steinman vs Denham pin skeletal traction indications and weight calculations (1/10th body weight).",
      status: "In Progress",
    },
    {
      id: "p12",
      code: "P-70633771",
      subjectId: "orthopedics",
      title: "Common Sites of Fracture Malunion and Non-union",
      highYieldSummary: "Scaphoid waist non-union (retrograde blood supply), Femoral neck, Talus neck, Tibial shaft (hypovascular watershed zone between middle and distal thirds).",
      status: "Not Viewed",
    },
  ],
  radiology: [
    {
      id: "pr1",
      code: "P-39482011",
      subjectId: "radiology",
      title: "Chest X-Ray Classic Signs & Pathologies",
      highYieldSummary: "Silhouette sign (loss of right heart border in middle lobe consolidation), Golden S curve of Golden (Right upper lobe collapse with hilar mass), Hampton's hump & Westermark sign (pulmonary embolism).",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "pr2",
      code: "P-48291039",
      subjectId: "radiology",
      title: "HRCT Patterns of Interstitial Lung Disease",
      highYieldSummary: "UIP/IPF (subpleural basilar honeycombing, traction bronchiectasis), NSIP (ground glass opacities with subpleural sparing), Sarcoidosis (perilymphatic nodules, 1-2-3 galaxy sign).",
      status: "Completed",
      is2VRecommended: true,
    },
    {
      id: "pr3",
      code: "P-81029384",
      subjectId: "radiology",
      title: "Neuroimaging Signatures of Intracranial Hemorrhage",
      highYieldSummary: "Hyperacute (T1 isointense, T2 hyperintense), Acute (T1 iso, T2 hypointense - intracellular deoxyhemoglobin), Subacute early (T1 hyperintense, T2 hypointense - methemoglobin).",
      status: "In Progress",
      is2VRecommended: true,
    },
    {
      id: "pr4",
      code: "P-91023485",
      subjectId: "radiology",
      title: "Abdominal Ultrasound & CT Signs",
      highYieldSummary: "Double duct sign (head of pancreas carcinoma), Target/Donut sign (intussusception), Whirlpool sign (midgut volvulus), String of pearls sign (PCOS).",
      status: "Completed",
    },
  ],
};
