/**
 * ARGUS Universal Accountability Ledger
 * "From a Student to a Prime Minister"
 *
 * Core Principles:
 * 1. The greater someone's responsibility and impact on others, the greater the need for verifiable accountability—without sacrificing fairness, privacy, or due process.
 * 2. Three Levels of Accountability: Personal (Private), Professional (Role-Authorized), Public (Verifiable Integrity).
 * 3. NO UNIVERSAL CITIZEN SCORE: Strictly complies with UNESCO's recommendation against mass surveillance and AI social scoring.
 * 4. 5 Essential Ledger Operations: createCommitment, attachEvidence, updateStatus, explainDeviation, requestReview.
 * 5. Adaptable across all 6 roles: Student, Shopkeeper, Business Owner, Elected Representative, Healthcare Professional, Farmer.
 */

export type AccountabilityLevel = "personal" | "professional" | "public";

export type RoleCategory = 
  | "student" 
  | "shopkeeper" 
  | "business_owner" 
  | "elected_representative" 
  | "healthcare_professional" 
  | "farmer";

export type LedgerStatus = 
  | "planned" 
  | "active" 
  | "completed_verified" 
  | "delayed_circumstantial" 
  | "disputed" 
  | "renegotiated";

export type LedgerVisibility = 
  | "private_individual" 
  | "organization_authorized" 
  | "lawfully_public";

export interface LedgerEvidence {
  id: string;
  type: "assessment" | "audit_trail" | "receipt_ledger" | "public_gazette" | "clinical_record" | "soil_report" | "personal_reflection";
  title: string;
  uriOrHash: string;
  timestamp: string;
  verifiedBy?: string;
  isAllegationOrFact: "verified_fact" | "reported_allegation" | "preliminary_claim";
}

export interface DeviationExplanation {
  rootCause: "external_unavoidable" | "procedural_delay" | "resource_shortfall" | "voluntary_avoidance" | "policy_pivot";
  narrative: string;
  mitigationPlanned: string;
  isDisciplineFailure: boolean;
  reviewedBy?: string;
  reviewDate?: string;
}

export interface LedgerCommitment {
  id: string;
  level: AccountabilityLevel;
  role: RoleCategory;
  responsibleEntity: {
    name: string;
    designation: string;
    organizationOrJurisdiction?: string;
  };
  commitment: string;
  targetMetric: string;
  dueDate: string;
  dependencies: string[];
  status: LedgerStatus;
  visibility: LedgerVisibility;
  evidence: LedgerEvidence[];
  deviation?: DeviationExplanation;
  reviewAuditTrail: {
    actor: string;
    action: string;
    timestamp: string;
    notes: string;
  }[];
  safeguardRule: string;
}

export interface RoleConfig {
  role: RoleCategory;
  title: string;
  level: AccountabilityLevel;
  visibilityDefault: LedgerVisibility;
  keyResponsibilities: string[];
  evidenceTypes: string[];
  misuseSafeguard: string;
  oecdUnescoAlignment: string;
}

export const ROLE_CONFIGS: Record<RoleCategory, RoleConfig> = {
  student: {
    role: "student",
    title: "Class 6 Student (Aarav)",
    level: "personal",
    visibilityDefault: "private_individual",
    keyResponsibilities: [
      "Master foundational mathematical concepts (fractions, LCM)",
      "Demonstrate independent problem solving without hints",
      "Reflect honestly on study struggles without shame"
    ],
    evidenceTypes: ["Offline workbook quizzes", "Spaced retrieval assessment"],
    misuseSafeguard: "Strict UNESCO compliance: ZERO public ranking, leaderboards, or score sharing with peers.",
    oecdUnescoAlignment: "Article 28 CRC: Educational privacy and protection from arbitrary humiliation."
  },
  shopkeeper: {
    role: "shopkeeper",
    title: "Neighborhood Shopkeeper (Ramesh Kirana)",
    level: "professional",
    visibilityDefault: "organization_authorized",
    keyResponsibilities: [
      "Maintain honest, itemized retail digital billing",
      "Honor customer refund & warranty promises on defective grain packages",
      "Maintain food safety expiry protocols on shelf inventory"
    ],
    evidenceTypes: ["Digital GST/UPI payment receipts", "Vendor return receipts", "Inventory FIFO audit"],
    misuseSafeguard: "Customer purchase history remains strictly protected under local data protection laws.",
    oecdUnescoAlignment: "Consumer protection compliance without predatory credit surveillance."
  },
  business_owner: {
    role: "business_owner",
    title: "Solar Tech Startup CEO (Ananya)",
    level: "professional",
    visibilityDefault: "organization_authorized",
    keyResponsibilities: [
      "Deliver 50kW micro-grid installations on contract schedule",
      "Timely payroll distribution to technicians & statutory PF/ESI filings",
      "Accurate quarterly financial disclosures to investors"
    ],
    evidenceTypes: ["Grid interconnection signoffs", "Bank payroll escrow audit", "Chartered Accountant balance certification"],
    misuseSafeguard: "Role-based encryption; trade secrets protected from hostile competitor scraping.",
    oecdUnescoAlignment: "OECD Corporate Governance Principles on transparent stakeholder reporting."
  },
  elected_representative: {
    role: "elected_representative",
    title: "Member of Parliament / Prime Minister",
    level: "public",
    visibilityDefault: "lawfully_public",
    keyResponsibilities: [
      "Fulfill public election manifesto commitments (e.g., Clean Water Piped Scheme)",
      "Transparent allocation & expenditure of constituency development funds (MPLADS)",
      "Timely response to public parliamentary questions and citizen grievances"
    ],
    evidenceTypes: ["Official Gazette notifications", "Public CAG audit reports", "Geo-tagged pipeline satellite imagery"],
    misuseSafeguard: "High-integrity verifiable evidence only. Distinguishes unverified political allegations from audited records.",
    oecdUnescoAlignment: "OECD Public Integrity Framework & Open Government Partnership (OGP) standards."
  },
  healthcare_professional: {
    role: "healthcare_professional",
    title: "Chief Medical Officer (Dr. Banerjee)",
    level: "professional",
    visibilityDefault: "organization_authorized",
    keyResponsibilities: [
      "Adhere strictly to clinical triage and sterile protocols",
      "Conduct morbidity & mortality clinical audits without blame",
      "Complete 30 annual Continuing Medical Education (CME) credit hours"
    ],
    evidenceTypes: ["Hospital clinical review minutes", "CME accredited transcripts", "Anonymized morbidity logs"],
    misuseSafeguard: "Absolute HIPAA/ABHA patient privacy; zero patient identifiable data leaks.",
    oecdUnescoAlignment: "WHO Global Patient Safety Action Plan 2021-2030."
  },
  farmer: {
    role: "farmer",
    title: "Smallholder Organic Farmer (Harjeet)",
    level: "professional",
    visibilityDefault: "private_individual",
    keyResponsibilities: [
      "Comply with certified pesticide-free organic soil standards",
      "Repay seasonal cooperative Kisan Credit loan installments post-harvest",
      "Adopt drip-irrigation water conservation techniques"
    ],
    evidenceTypes: ["Soil organic carbon test certificates", "Kisan cooperative bank receipts", "Canal water meter logs"],
    misuseSafeguard: "Yield fluctuations due to unseasonal hail/drought never classified as moral credit default.",
    oecdUnescoAlignment: "FAO voluntary guidelines on responsible tenure and climate-resilient farming."
  }
};

export const INITIAL_LEDGER_ITEMS: LedgerCommitment[] = [
  {
    id: "leg-01",
    level: "personal",
    role: "student",
    responsibleEntity: {
      name: "Aarav Sen",
      designation: "Class 6 Student",
      organizationOrJurisdiction: "Howrah Public School"
    },
    commitment: "Master equivalent fractions and solve 5 novel problems independently",
    targetMetric: "100% independent accuracy on unfamiliar problems",
    dueDate: "2026-11-02",
    dependencies: ["Offline textbook access", "30 minutes quiet evening study"],
    status: "completed_verified",
    visibility: "private_individual",
    safeguardRule: "Private to Aarav & learning companion. Strict ban on school ranking or parental shaming.",
    evidence: [
      {
        id: "ev-s1",
        type: "assessment",
        title: "5/5 Diagnostic Quiz Passed",
        uriOrHash: "sha256:d8a9b2...",
        timestamp: "2026-11-02 16:30",
        verifiedBy: "ARGUS Adaptive Mastery Engine",
        isAllegationOrFact: "verified_fact"
      }
    ],
    reviewAuditTrail: [
      {
        actor: "Aarav",
        action: "created_commitment",
        timestamp: "2026-11-02 08:00",
        notes: "Committed to 30 mins after school"
      },
      {
        actor: "ARGUS Mastery Engine",
        action: "verified_completion",
        timestamp: "2026-11-02 16:30",
        notes: "Solved all 5 unseen fraction division questions without hints."
      }
    ]
  },
  {
    id: "leg-02",
    level: "professional",
    role: "shopkeeper",
    responsibleEntity: {
      name: "Ramesh Gupta",
      designation: "Store Proprietor",
      organizationOrJurisdiction: "Gupta Provision Store, Ward 14"
    },
    commitment: "Deliver 100% itemized digital bills with transparent pricing and zero adulteration guarantee",
    targetMetric: "Zero unregistered transactions; 100% printed/SMS receipt delivery",
    dueDate: "2026-11-02",
    dependencies: ["Working POS terminal", "Stable local power connection"],
    status: "completed_verified",
    visibility: "organization_authorized",
    safeguardRule: "Customer names and telephone numbers are encrypted locally; no broker data marketing.",
    evidence: [
      {
        id: "ev-sh1",
        type: "receipt_ledger",
        title: "Daily GST/UPI Reconciled Transaction Batch",
        uriOrHash: "sha256:7f4c1e...",
        timestamp: "2026-11-02 19:00",
        verifiedBy: "Store POS Reconciler",
        isAllegationOrFact: "verified_fact"
      }
    ],
    reviewAuditTrail: [
      {
        actor: "Ramesh Gupta",
        action: "daily_reconciliation_closed",
        timestamp: "2026-11-02 19:15",
        notes: "42 customer transactions tallied accurately with inventory outtake."
      }
    ]
  },
  {
    id: "leg-03",
    level: "professional",
    role: "business_owner",
    responsibleEntity: {
      name: "Ananya Roy",
      designation: "Founder & Managing Director",
      organizationOrJurisdiction: "SolarSurge Technologies Pvt Ltd"
    },
    commitment: "Complete commissioning and safety certification for 50kW rural microgrid in Nadia District",
    targetMetric: "Full inverter load test verified by State Electricity Inspectorate",
    dueDate: "2026-11-01",
    dependencies: ["State grid interconnect clearance", "Delivery of lithium storage packs from customs"],
    status: "delayed_circumstantial",
    visibility: "organization_authorized",
    safeguardRule: "Commercial contracts protected under mutual NDA. Disclosed solely to client & board.",
    evidence: [
      {
        id: "ev-b1",
        type: "audit_trail",
        title: "Port Customs Clearance Delay Notice (Bill of Entry #49102)",
        uriOrHash: "sha256:91ab3c...",
        timestamp: "2026-10-28 11:30",
        verifiedBy: "Kolkata Port Authority Portal",
        isAllegationOrFact: "verified_fact"
      }
    ],
    deviation: {
      rootCause: "external_unavoidable",
      narrative: "Port strike and customs clearance dock delay held lithium battery racks for 8 days. Inverters and panels are 100% installed on site.",
      mitigationPlanned: "Expedited hot-run testing scheduled for Nov 06 immediately upon cargo receipt.",
      isDisciplineFailure: false,
      reviewedBy: "Board of Directors Audit Committee",
      reviewDate: "2026-11-01"
    },
    reviewAuditTrail: [
      {
        actor: "Ananya Roy",
        action: "recorded_deviation",
        timestamp: "2026-10-30",
        notes: "Proactively notified client with port consignment tracking link."
      }
    ]
  },
  {
    id: "leg-04",
    level: "public",
    role: "elected_representative",
    responsibleEntity: {
      name: "Office of the Prime Minister / Minister of Water Resources",
      designation: "Union Cabinet Minister",
      organizationOrJurisdiction: "National Jal Jeevan Mission"
    },
    commitment: "Provide 100% functional household tap water connections (FHTC) to all 120 villages in District Purulia",
    targetMetric: "120 villages certified with 55 liters per capita per day potable water supply",
    dueDate: "2026-10-31",
    dependencies: ["State treasury fund matching", "Public Works Department pipeline laying", "Groundwater aquifer recharge"],
    status: "disputed",
    visibility: "lawfully_public",
    safeguardRule: "Full public transparency under RTI / Open Data. Clear distinction between audited facts and partisan claims.",
    evidence: [
      {
        id: "ev-p1",
        type: "public_gazette",
        title: "Ministry Dashboard: 108/120 Villages Commissioned (90%)",
        uriOrHash: "https://ejalshakti.gov.in/purulia-report",
        timestamp: "2026-10-31 18:00",
        verifiedBy: "Jal Jeevan Mission Third-Party Verifier (WAPCOS)",
        isAllegationOrFact: "verified_fact"
      },
      {
        id: "ev-p2",
        type: "audit_trail",
        title: "Gram Panchayat Resolution: 12 Remote Hill Hamlets Lack Water Pressure",
        uriOrHash: "sha256:44fe12...",
        timestamp: "2026-11-01 10:00",
        verifiedBy: "Ayodhya Hills Gram Panchayat Council",
        isAllegationOrFact: "reported_allegation"
      }
    ],
    deviation: {
      rootCause: "resource_shortfall",
      narrative: "Rocky terrain in Ayodhya Hills required specialized pneumatic drilling rigs that were reallocated during monsoon landslides. 108 villages active; 12 awaiting high-pressure booster pumps.",
      mitigationPlanned: "Reallocation of 4 heavy drilling rigs from Western Circle; revised commissioning target Dec 15, 2026.",
      isDisciplineFailure: false,
      reviewedBy: "Parliamentary Standing Committee on Water Resources",
      reviewDate: "2026-11-02"
    },
    reviewAuditTrail: [
      {
        actor: "Ministry Secretary",
        action: "published_progress_report",
        timestamp: "2026-10-31",
        notes: "Published verified geo-tagged FHTC data for 108 villages."
      },
      {
        actor: "Civic Audit Observer",
        action: "flagged_discrepancy",
        timestamp: "2026-11-01",
        notes: "Documented water pressure absence in high-elevation hamlets."
      }
    ]
  },
  {
    id: "leg-05",
    level: "professional",
    role: "healthcare_professional",
    responsibleEntity: {
      name: "Dr. S. Banerjee, MD",
      designation: "Head of Intensive Care",
      organizationOrJurisdiction: "District General Hospital"
    },
    commitment: "Execute antibiotic stewardship clinical audit across all 40 ICU beds to eliminate redundant broad-spectrum usage",
    targetMetric: "100% blood culture concordance before prescribing Tier-3 Carbapenems",
    dueDate: "2026-11-01",
    dependencies: ["Microbiology lab turnaround within 24 hours", "EMR pharmacy integration"],
    status: "completed_verified",
    visibility: "organization_authorized",
    safeguardRule: "Strict anonymization under ABHA / HIPAA standards. Zero patient identifiers exposed.",
    evidence: [
      {
        id: "ev-h1",
        type: "clinical_record",
        title: "Monthly ICU Antimicrobial Sensitivity Audit (Anonymized)",
        uriOrHash: "sha256:22bc49...",
        timestamp: "2026-11-01 14:00",
        verifiedBy: "Hospital Infection Control Committee",
        isAllegationOrFact: "verified_fact"
      }
    ],
    reviewAuditTrail: [
      {
        actor: "Dr. S. Banerjee",
        action: "submitted_clinical_audit",
        timestamp: "2026-11-01 16:00",
        notes: "Carbapenem utilization dropped by 24% without elevating 30-day sepsis mortality."
      }
    ]
  },
  {
    id: "leg-06",
    level: "professional",
    role: "farmer",
    responsibleEntity: {
      name: "Harjeet Singh",
      designation: "Certified Organic Producer",
      organizationOrJurisdiction: "Ludhiana Progressive Organic Cooperative"
    },
    commitment: "Transition 4 acres of Basmati rice to zero-tillage Direct Seeded Rice (DSR) to conserve groundwater",
    targetMetric: "30% reduction in irrigation volume measured by canal water meter",
    dueDate: "2026-10-25",
    dependencies: ["Laser land leveler rental", "Pre-monsoon soil moisture balance"],
    status: "completed_verified",
    visibility: "organization_authorized",
    safeguardRule: "Agricultural climate risks protected. Crop damage from sudden hail never counted as farmer negligence.",
    evidence: [
      {
        id: "ev-f1",
        type: "soil_report",
        title: "Punjab Agricultural University (PAU) Extension DSR Verification",
        uriOrHash: "sha256:bb7190...",
        timestamp: "2026-10-26 11:00",
        verifiedBy: "District PAU Field Agronomist",
        isAllegationOrFact: "verified_fact"
      }
    ],
    reviewAuditTrail: [
      {
        actor: "Harjeet Singh",
        action: "recorded_harvest_data",
        timestamp: "2026-10-26",
        notes: "Yield matched conventional puddle nursery while conserving 32% tube-well electricity."
      }
    ]
  }
];

/**
 * Universal Ledger Operations
 */
export class UniversalAccountabilityLedgerService {
  private items: LedgerCommitment[] = [...INITIAL_LEDGER_ITEMS];

  getItems(roleFilter?: RoleCategory, levelFilter?: AccountabilityLevel): LedgerCommitment[] {
    return this.items.filter(item => {
      if (roleFilter && item.role !== roleFilter) return false;
      if (levelFilter && item.level !== levelFilter) return false;
      return true;
    });
  }

  // 1. Create a commitment
  createCommitment(params: {
    level: AccountabilityLevel;
    role: RoleCategory;
    responsibleName: string;
    designation: string;
    organization?: string;
    commitment: string;
    targetMetric: string;
    dueDate: string;
    dependencies: string[];
    visibility: LedgerVisibility;
    safeguardRule: string;
  }): LedgerCommitment {
    const newItem: LedgerCommitment = {
      id: `leg-${Date.now().toString(36)}`,
      level: params.level,
      role: params.role,
      responsibleEntity: {
        name: params.responsibleName,
        designation: params.designation,
        organizationOrJurisdiction: params.organization
      },
      commitment: params.commitment,
      targetMetric: params.targetMetric,
      dueDate: params.dueDate,
      dependencies: params.dependencies,
      status: "planned",
      visibility: params.visibility,
      safeguardRule: params.safeguardRule,
      evidence: [],
      reviewAuditTrail: [
        {
          actor: params.responsibleName,
          action: "created_commitment",
          timestamp: new Date().toISOString(),
          notes: "Initial commitment established in ledger."
        }
      ]
    };
    this.items.unshift(newItem);
    return newItem;
  }

  // 2. Attach evidence
  attachEvidence(commitmentId: string, evidence: Omit<LedgerEvidence, "id">): boolean {
    const target = this.items.find(i => i.id === commitmentId);
    if (!target) return false;

    const newEvidence: LedgerEvidence = {
      ...evidence,
      id: `ev-${Date.now().toString(36)}`
    };

    target.evidence.push(newEvidence);
    target.reviewAuditTrail.push({
      actor: evidence.verifiedBy || target.responsibleEntity.name,
      action: "attached_evidence",
      timestamp: new Date().toISOString(),
      notes: `Evidence added: ${evidence.title} [${evidence.isAllegationOrFact}]`
    });

    if (evidence.isAllegationOrFact === "verified_fact") {
      target.status = "completed_verified";
    }

    return true;
  }

  // 3. Update status
  updateStatus(commitmentId: string, status: LedgerStatus, actor: string, notes: string): boolean {
    const target = this.items.find(i => i.id === commitmentId);
    if (!target) return false;

    target.status = status;
    target.reviewAuditTrail.push({
      actor,
      action: `status_change_to_${status}`,
      timestamp: new Date().toISOString(),
      notes
    });
    return true;
  }

  // 4. Explain deviation
  explainDeviation(commitmentId: string, deviation: DeviationExplanation, actor: string): boolean {
    const target = this.items.find(i => i.id === commitmentId);
    if (!target) return false;

    target.deviation = deviation;
    target.status = deviation.rootCause === "external_unavoidable" ? "delayed_circumstantial" : "disputed";
    target.reviewAuditTrail.push({
      actor,
      action: "documented_deviation",
      timestamp: new Date().toISOString(),
      notes: `Deviation reason: ${deviation.narrative.substring(0, 100)}...`
    });
    return true;
  }

  // 5. Request review / dispute
  requestReview(commitmentId: string, reviewer: string, query: string): boolean {
    const target = this.items.find(i => i.id === commitmentId);
    if (!target) return false;

    target.reviewAuditTrail.push({
      actor: reviewer,
      action: "requested_audit_review",
      timestamp: new Date().toISOString(),
      notes: query
    });
    return true;
  }
}

export const ledgerService = new UniversalAccountabilityLedgerService();
