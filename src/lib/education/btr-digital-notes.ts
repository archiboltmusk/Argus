/**
 * Core BTR High-Yield Digital Master Notes Engine
 *
 * Provides structured, interactive, high-yield digital notes with active recall
 * cloze testing and tabular summaries across all medical subjects (Anatomy,
 * Physiology, Pathology, etc.) ensuring students always have instant, readable notes
 * even when a raw PDF file is missing or being linked.
 */

export interface BTRDigitalNoteSection {
  id: string;
  subjectId: string;
  title: string;
  category: "High-Yield Tables" | "Nerve & Lesion Matrix" | "Anatomical Landmarks" | "Embryology & Derivations" | "20th Subject Traps";
  summary: string;
  pearls: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  clozeItems?: Array<{
    id: string;
    textWithBlanks: string; // e.g. "Erb's palsy involves roots {C5-C6} resulting in {waiter's tip} deformity."
    hiddenAnswers: string[];
  }>;
}

export const ANATOMY_DIGITAL_NOTES: BTRDigitalNoteSection[] = [
  {
    id: "anat-brachial-plexus",
    subjectId: "anatomy",
    title: "Brachial Plexus & Upper Limb Clinical Lesions",
    category: "Nerve & Lesion Matrix",
    summary: "Formed by ventral rami of C5-T1. High-frequency NEET-PG / INI-CET question triggers.",
    pearls: [
      "Erb-Duchenne Palsy: Upper trunk injury (C5-C6) from traction during birth or motorcycle fall. Suprascapular, axillary, and musculocutaneous nerves lost -> Policeman's / Waiter's tip posture.",
      "Klumpke Palsy: Lower trunk lesion (C8-T1) from upward traction (e.g. grabbing branch while falling). Total claw hand (intrinsic muscles of hand loss) + ipsilateral Horner syndrome (T1 sympathetic fibers).",
      "Winging of Scapula: Injury to Long Thoracic Nerve of Bell (C5, C6, C7) supplying Serratus Anterior. Prominent medial border of scapula when pushing against wall.",
      "Surgical Neck of Humerus Fracture: Damages Axillary Nerve (C5-C6) and Posterior Circumflex Humeral Artery. Causes deltoid atrophy and sensory loss over regimental badge area.",
      "Spiral Groove Fracture (Humerus Shaft): Damages Radial Nerve -> Wrist Drop + sensory loss on dorsal first web space (triceps spared if fracture is below triceps branch).",
      "Supracondylar Fracture of Humerus: Most commonly damages Anterior Interosseous Nerve (branch of Median) or Brachial Artery (Volkmann ischemic contracture).",
      "Medial Epicondyle / Cubital Tunnel: Damages Ulnar Nerve -> Cubital tunnel syndrome, weak flexor carpi ulnaris, ulnar claw hand (worse in low lesion: Ulnar Paradox).",
    ],
    table: {
      headers: ["Nerve", "Root", "Vulnerable Site", "Clinical Hallmark Deficit"],
      rows: [
        ["Long Thoracic", "C5, C6, C7", "Axillary dissection / lymphadenectomy", "Winging of scapula (Serratus anterior paralysis)"],
        ["Axillary", "C5, C6", "Surgical neck fracture / shoulder dislocation", "Abduction lost after 15°, regimental badge numbness"],
        ["Radial", "C5-T1", "Midshaft humerus (spiral groove)", "Wrist drop, intact triceps if midshaft"],
        ["PIN (Deep Radial)", "C7, C8", "Arcade of Frohse / supinator", "Finger drop with NO sensory loss (pure motor)"],
        ["Median", "C5-T1", "Carpal tunnel / supracondylar fracture", "Ape thumb deformity, loss of thenar opposition"],
        ["AIN (branch of Median)", "C8, T1", "Forearm entrapment", "Loss of 'OK' sign (FPL & FDP 1st/2nd digit loss, no sensory loss)"],
        ["Ulnar", "C8, T1", "Medial epicondyle / Guyon canal", "Claw hand (digits 4 & 5), Froment sign (+), adductor pollicis paralysis"],
      ],
    },
    clozeItems: [
      {
        id: "cloze-1",
        textWithBlanks: "Erb-Duchenne palsy involves roots {C5-C6} and presents with arm {adducted and internally rotated} and forearm {pronated}.",
        hiddenAnswers: ["C5-C6", "adducted and internally rotated", "pronated"],
      },
      {
        id: "cloze-2",
        textWithBlanks: "Klumpke palsy involves roots {C8-T1} and frequently associates with {Horner syndrome} due to disruption of T1 sympathetic chain.",
        hiddenAnswers: ["C8-T1", "Horner syndrome"],
      },
    ],
  },
  {
    id: "anat-skull-foramina",
    subjectId: "anatomy",
    title: "Cranial Nerves, Skull Foramina & Dural Venous Sinuses",
    category: "High-Yield Tables",
    summary: "Base of skull foramina and the neurovascular structures traversing them.",
    pearls: [
      "Superior Orbital Fissure: Transmits CN III (Oculomotor), CN IV (Trochlear), CN V1 branches (Lacrimal, Frontal, Nasociliary), CN VI (Abducens), superior ophthalmic veins.",
      "Foramen Rotundum: Maxillary nerve (CN V2) passes straight into the pterygopalatine fossa.",
      "Foramen Ovale Mnemonic 'MALE': Mandibular nerve (CN V3), Accessory meningeal artery, Lesser petrosal nerve, Emissary veins.",
      "Foramen Spinosum: Middle Meningeal Artery & Vein, Nervous spinosus (meningeal branch of V3). Fracture of Pterion tears MMA causing epidural (extradural) hematoma.",
      "Internal Acoustic Meatus: CN VII (Facial), CN VIII (Vestibulocochlear), Nervus intermedius, Labyrinthine artery.",
      "Jugular Foramen: CN IX (Glossopharyngeal), CN X (Vagus), CN XI (Accessory), Internal Jugular Vein (continuation of sigmoid sinus), Inferior petrosal sinus.",
      "Hypoglossal Canal: CN XII (Hypoglossal nerve).",
    ],
    table: {
      headers: ["Foramen", "Fossa", "Traversing Structures", "Clinical Pearl"],
      rows: [
        ["Cribriform Plate", "Anterior", "CN I (Olfactory nerve fila)", "Anosmia following cribriform plate fracture / CSF rhinorrhea"],
        ["Optic Canal", "Middle", "CN II (Optic nerve) + Ophthalmic artery", "Optic neuropathy, papilledema pathway"],
        ["Superior Orbital Fissure", "Middle", "CN III, IV, V1, VI + Superior ophthalmic vein", "Superior Orbital Fissure Syndrome (ophthalmoplegia + V1 numbness)"],
        ["Foramen Rotundum", "Middle", "CN V2 (Maxillary)", "Trigeminal neuralgia (tic douloureux) V2 distribution"],
        ["Foramen Ovale", "Middle", "CN V3 (Mandibular), Acc. Meningeal A, Lesser petrosal, Emissary vein", "Mnemonic MALE; Percutaneous balloon rhizotomy access"],
        ["Foramen Spinosum", "Middle", "Middle meningeal artery, nervous spinosus", "Pterion fracture -> Lucid interval -> Extradural hematoma"],
        ["Internal Acoustic Meatus", "Posterior", "CN VII, CN VIII, Labyrinthine artery", "Vestibular schwannoma (acoustic neuroma) expands IAM"],
        ["Jugular Foramen", "Posterior", "CN IX, X, XI, Internal jugular vein", "Vernet syndrome (loss of gag, hoarseness, trapezius weakness)"],
        ["Hypoglossal Canal", "Posterior", "CN XII (Hypoglossal nerve)", "Collet-Sicard syndrome; tongue deviates to side of lesion"],
      ],
    },
  },
  {
    id: "anat-peritoneum-abdomen",
    subjectId: "anatomy",
    title: "Abdomen, Peritoneum & Inguinal Anatomy",
    category: "Anatomical Landmarks",
    summary: "Peritoneal spaces, epiploic foramen of Winslow, and inguinal canal architecture.",
    pearls: [
      "Epiploic Foramen of Winslow: Boundary anteriorly is the free edge of lesser omentum containing the Portal Triad (Bile duct right anterior, Hepatic artery left anterior, Portal vein posterior). Boundary posteriorly is the Inferior Vena Cava (IVC). Superior is Caudate lobe of liver; Inferior is 1st part of duodenum.",
      "Pringle Maneuver: Clamping the hepatoduodenal ligament at epiploic foramen compresses hepatic artery & portal vein to control hepatic hemorrhage. If bleeding continues, source is retrohepatic IVC or hepatic veins.",
      "Hesselbach's Triangle: Medial border = Lateral border of rectus abdominis; Lateral border = Inferior epigastric vessels; Inferior border = Inguinal ligament. Direct inguinal hernias protrude through Hesselbach triangle (medial to inferior epigastrics).",
      "Indirect Inguinal Hernia: Passes through Deep Inguinal Ring (lateral to inferior epigastric vessels) inside coverings of spermatic cord. Result of patent processus vaginalis.",
      "Femoral Canal: Medial to femoral vein, lateral to lacunar ligament (Gimbernat's), anterior to Cooper's (pectineal) ligament. High risk of strangulation in elderly females.",
    ],
    table: {
      headers: ["Structure / Space", "Key Boundary", "Content / Connection", "Surgical Pearl"],
      rows: [
        ["Foramen of Winslow", "Ant: Portal triad, Post: IVC", "Greater sac communicates with Lesser sac (Omental bursa)", "Pringle maneuver controls inflow bleeding"],
        ["Inguinal Canal", "Floor: Inguinal lig, Roof: Conjoint tendon", "Spermatic cord / Round ligament + Ilioinguinal nerve", "Deep ring is fascia transversalis defect; superficial is external oblique"],
        ["Hesselbach Triangle", "Med: Rectus, Lat: Inf. Epigastric, Inf: Inguinal", "Direct inguinal hernia defect (acquired weakness of fascia transversalis)", "Medial to inferior epigastric vessels, does NOT enter scrotum typically"],
        ["Femoral Ring", "Lat: Femoral vein, Med: Lacunar lig", "Cloquet's / Rosenmuller's lymph node", "Prone to irreducibility & strangulation"],
        ["Pouch of Douglas", "Between rectum and uterus", "Most dependent part of female peritoneal cavity in erect posture", "Culdocentesis site for hemoperitoneum / PID fluid"],
      ],
    },
  },
  {
    id: "anat-embryo-derivatives",
    subjectId: "anatomy",
    title: "High-Yield Embryology Derivations & Pharyngeal Apparatus",
    category: "Embryology & Derivations",
    summary: "Pharyngeal arches, pouches, clefts, and cardinal vascular remnants.",
    pearls: [
      "Pharyngeal Arch 1 (Mandibular): CN V3, muscles of mastication, mylohyoid, anterior belly of digastric, tensor tympani, tensor veli palatini. Cartilage: Malleus, Incus, Meckel's cartilage.",
      "Pharyngeal Arch 2 (Hyoid): CN VII, muscles of facial expression, stapedius, stylohyoid, posterior belly of digastric. Cartilage: Stapes, styloid process, lesser horn of hyoid.",
      "Pharyngeal Arch 3: CN IX, stylopharyngeus muscle. Cartilage: Greater horn and lower body of hyoid bone.",
      "Pharyngeal Arch 4 & 6: CN X (Arch 4: Superior laryngeal nerve; Arch 6: Recurrent laryngeal nerve). Cricothyroid (Arch 4), intrinsic muscles of larynx (Arch 6). Thyroid and cricoid cartilages.",
      "Pharyngeal Pouch 1: Middle ear cavity, auditory (Eustachian) tube, tympanic membrane inner layer.",
      "Pharyngeal Pouch 2: Palatine tonsil crypts and intratonsillar cleft.",
      "Pharyngeal Pouch 3: Inferior parathyroid glands + Thymus (migrate downwards together). Disrupted in DiGeorge syndrome (22q11 deletion: absent thymic shadow + hypocalcemia).",
      "Pharyngeal Pouch 4: Superior parathyroid glands + Ultimobranchial body (giving rise to calcitonin-secreting parafollicular C-cells).",
      "Pharyngeal Cleft 1: External acoustic meatus and outer layer of tympanic membrane. Persistent cleft 2-4 forms lateral cervical (branchial) cyst anterior to SCM.",
    ],
    table: {
      headers: ["Arch / Pouch", "Nerve / Artery", "Muscles / Gland", "Skeletal Derivatives / Notes"],
      rows: [
        ["Arch 1", "CN V3 (Mandibular)", "Mastication, Mylohyoid, Ant digastric, Tensor tympani", "Malleus, Incus, Sphenomandibular lig"],
        ["Arch 2", "CN VII (Facial)", "Facial expression, Stapedius, Stylohyoid, Post digastric", "Stapes, Styloid process, Lesser horn of hyoid"],
        ["Arch 3", "CN IX (Glossopharyngeal)", "Stylopharyngeus", "Greater horn & inferior body of hyoid"],
        ["Arch 4", "CN X (Superior laryngeal)", "Cricothyroid, pharyngeal constrictors", "Thyroid, cuneiform, corniculate cartilages"],
        ["Arch 6", "CN X (Recurrent laryngeal)", "All intrinsic muscles of larynx except cricothyroid", "Cricoid cartilage"],
        ["Pouch 1", "Endodermal derivative", "Tympanic cavity & Eustachian tube", "Middle ear mucosa"],
        ["Pouch 2", "Endodermal derivative", "Palatine tonsillar stroma & crypts", "Infiltrated by lymphatic tissue later"],
        ["Pouch 3", "Endodermal derivative", "Inferior parathyroids + Thymus", "DiGeorge 22q11 deletion failure of 3rd & 4th pouch"],
        ["Pouch 4", "Endodermal derivative", "Superior parathyroids + Ultimobranchial body", "Parafollicular C-cells of thyroid (calcitonin)"],
      ],
    },
  },
  {
    id: "anat-neuro-levels",
    subjectId: "anatomy",
    title: "Dermatomes, Cord Reflexes & 20th Subject Traps",
    category: "20th Subject Traps",
    summary: "High-yield dermatomal landmarks, cord segment reflex arcs, and classic examiner traps.",
    pearls: [
      "Key Dermatomes: C6 = Thumb; C7 = Middle finger; C8 = Little finger; T4 = Nipple line; T10 = Umbilicus; L1 = Inguinal crease; L4 = Knee & medial malleolus; L5 = Great toe & dorsal foot; S1 = Little toe, lateral foot, and heel; S2-S4 = Perineum & 'saddle' anesthesia.",
      "Deep Tendon Reflexes: Biceps = C5-C6; Brachioradialis = C5-C6; Triceps = C7-C8; Patellar (Knee jerk) = L3-L4; Achilles (Ankle jerk) = S1-S2.",
      "Corneal Reflex: Afferent = CN V1 (Nasociliary); Efferent = CN VII (Temporal & Zygomatic branches to Orbicularis Oculi).",
      "Gag Reflex: Afferent = CN IX (Glossopharyngeal); Efferent = CN X (Vagus).",
      "Pupillary Light Reflex: Afferent = CN II (Optic); Center = Edinger-Westphal nucleus; Efferent = CN III (Parasympathetic fibers to pupillary sphincter).",
      "Jaw Jerk: Afferent & Efferent = CN V3 (Mesencephalic nucleus of trigeminal). Hyperactive in pseudobulbar palsy (UMN).",
    ],
  },
];

export const GENERAL_SUBJECT_NOTES: Record<string, BTRDigitalNoteSection[]> = {
  anatomy: ANATOMY_DIGITAL_NOTES,
  radiology: [
    {
      id: "rad-signs",
      subjectId: "radiology",
      title: "Chest X-Ray Classic Signs & Pathognomonic Patterns",
      category: "High-Yield Tables",
      summary: "High frequency radiological signs tested in NEET-PG & INI-CET.",
      pearls: [
        "Silhouette Sign: Loss of right cardiac border denotes Right Middle Lobe consolidation; loss of left hemidiaphragm denotes Left Lower Lobe pathology.",
        "Golden S Sign of Golden: Right upper lobe collapse caused by a central hilar mass creates an inverted S curve on PA CXR.",
        "Hampton's Hump: Wedge-shaped peripheral opacity based on pleura indicating pulmonary infarction from pulmonary embolism.",
        "Westermark Sign: Regional oligemia (decreased vascular markings) distal to an occluded pulmonary artery.",
        "Continuous Diaphragm Sign: Pneumomediastinum allowing visualization of the entire uninterrupted diaphragm.",
      ],
    },
  ],
  orthopedics: [
    {
      id: "ortho-fractures",
      subjectId: "orthopedics",
      title: "Named Fractures & Eponymous Orthopedic Injuries",
      category: "High-Yield Tables",
      summary: "Named forearm, pelvic, and lower extremity fracture patterns.",
      pearls: [
        "Monteggia Fracture-Dislocation: Fracture of proximal third of ulna with dislocation of radial head.",
        "Galeazzi Fracture-Dislocation: Fracture of distal third of radius with dislocation of distal radioulnar joint (DRUJ).",
        "Colles Fracture: Extra-articular distal radius fracture with dorsal displacement ('Dinner Fork Deformity').",
        "Smith Fracture: Reverse Colles; distal radius fracture with volar/anterior displacement ('Garden Spade Deformity').",
        "Barton Fracture: Intra-articular fracture-subluxation of distal radius with carpal displacement (Volar or Dorsal).",
        "Rolando Fracture: Comminuted intra-articular Y or T-shaped fracture at the base of the first metacarpal.",
        "Bennett Fracture: Non-comminuted two-part intra-articular fracture-subluxation at the base of the first metacarpal (abductor pollicis longus displaces shaft).",
      ],
    },
  ],
};

/**
 * Get digital high-yield notes for any of the 19 subjects
 */
export function getDigitalNotesForSubject(subjectId: string): BTRDigitalNoteSection[] {
  return GENERAL_SUBJECT_NOTES[subjectId] || ANATOMY_DIGITAL_NOTES;
}
