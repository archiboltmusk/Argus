/**
 * ARGUS TRUST & Civic Integrity Infrastructure
 * "Building a Society Where Corruption Becomes Difficult"
 *
 * Core Principle:
 * "Trust should not be demanded by authority, bought by wealth, or manufactured through popularity.
 *  It should be earned through truth, competence, fairness, and verifiable accountability."
 *
 * The 7 Pillars of ARGUS Trust:
 * 1. Promise Ledger: Verifiable commitments and milestone execution
 * 2. Public Money Tracker: Connecting published budgets, tenders, expenditures, and geo-tagged deliverables
 * 3. Service Navigator: Transparent official fees, required documents, statutory deadlines, grievance paths
 * 4. Evidence Vault: Cryptographically verifiable document preservation (hash-linked)
 * 5. Integrity Risk Detector: Anomaly detection flagging deviations for HUMAN review (NEVER automated guilt)
 * 6. Protected Reporting: Legal whistleblower guidance, anti-retaliation rights, institutional ombudsman
 * 7. Resolution Tracker: Grievance lifecycle tracking from submission to independent verification
 */

export interface PublicProject {
  id: string;
  title: string;
  jurisdiction: string;
  department: string;
  budgetInLakhs: number;
  publishedBudgetFormatted: string;
  completionDeadline: string;
  status: "verified_on_track" | "incomplete_documentation" | "overdue" | "completed_audited";
  milestones: {
    id: string;
    title: string;
    status: "verified" | "evidence_pending" | "not_documented" | "delayed";
    evidenceHash?: string;
    evidenceDescription?: string;
  }[];
  integrityAssessment: {
    verdict: string;
    actionableStep: string;
    isCorruptionAlleged: false; // Invariant: AI never declares guilt
    clarificationRequested: boolean;
  };
}

export interface CivicServiceJourney {
  id: string;
  name: string;
  department: string;
  statutoryDays: number;
  officialFee: string;
  requiredDocuments: string[];
  officialProcedure: string[];
  responsibleOffice: string;
  grievanceChannel: {
    portalName: string;
    escalationContact: string;
    statutoryAppellateAuthority: string;
  };
  sampleInteractionHistory?: {
    date: string;
    step: string;
    status: "applied" | "acknowledged" | "verified" | "delivered" | "disputed";
    notes: string;
  }[];
}

export interface TrustMetric {
  name: string;
  currentValue: string;
  benchmark: string;
  definition: string;
}

export const SAMPLE_PUBLIC_PROJECTS: PublicProject[] = [
  {
    id: "proj-jal-01",
    title: "Village Drinking Water Pipe & Solar Pump Installation",
    jurisdiction: "Purulia District, Gram Panchayat Ward 4",
    department: "Public Health Engineering Department (PHED)",
    budgetInLakhs: 20,
    publishedBudgetFormatted: "₹20.0 Lakh",
    completionDeadline: "30 June 2026",
    status: "incomplete_documentation",
    milestones: [
      { id: "m1", title: "Tender Publication & E-Procurement", status: "verified", evidenceHash: "tender/2026/PHED-PUR-891", evidenceDescription: "Published in State E-tender portal on Jan 14" },
      { id: "m2", title: "Contract Award to L1 Bidder", status: "verified", evidenceHash: "award/L1-SunPower-Infra", evidenceDescription: "Technical evaluation score 92.4, awarded Feb 02" },
      { id: "m3", title: "Submersible Pump & Pipe Laying", status: "evidence_pending", evidenceDescription: "Physical installation reported by contractor; geo-tagged photos pending" },
      { id: "m4", title: "Potable Water Quality Laboratory Test", status: "not_documented", evidenceDescription: "No NABL lab test report uploaded to state water dashboard" }
    ],
    integrityAssessment: {
      verdict: "The published record is currently incomplete. Missing documentation is NOT proof of corruption.",
      actionableStep: "Request the installation certificate and water-quality lab report from the Panchayat Executive Officer via the Right to Information portal before drawing conclusions.",
      isCorruptionAlleged: false,
      clarificationRequested: true
    }
  },
  {
    id: "proj-road-02",
    title: "All-Weather Rural Link Road (PMGSY)",
    jurisdiction: "Bankura North, Section 12",
    department: "National Rural Infrastructure Development Agency",
    budgetInLakhs: 65,
    publishedBudgetFormatted: "₹65.0 Lakh",
    completionDeadline: "15 October 2026",
    status: "completed_audited",
    milestones: [
      { id: "r1", title: "Soil Compaction & Drainage Grading", status: "verified", evidenceHash: "pmgsy/grade/BN-12", evidenceDescription: "Tested by District Quality Monitor on May 18" },
      { id: "r2", title: "Bituminous Blacktop Layering (3.4 km)", status: "verified", evidenceHash: "pmgsy/blacktop/BN-12", evidenceDescription: "Core cut density test verified: 2.38 g/cm³" },
      { id: "r3", title: "National Quality Monitor (NQM) Final Audit", status: "verified", evidenceHash: "nqm/report/2026-901", evidenceDescription: "Awarded 'Satisfactory' grade with geo-tagged drone video" }
    ],
    integrityAssessment: {
      verdict: "Published milestones are 100% verified with independent third-party lab documentation.",
      actionableStep: "Routine 5-year maintenance defect liability period active under contractor warranty bond.",
      isCorruptionAlleged: false,
      clarificationRequested: false
    }
  }
];

export const CIVIC_SERVICE_JOURNEYS: CivicServiceJourney[] = [
  {
    id: "service-caste",
    name: "Issuance of Caste / Domicile Certificate",
    department: "Backward Classes Welfare & Revenue Department",
    statutoryDays: 15,
    officialFee: "₹0 (Zero Fee / Free of Cost)",
    requiredDocuments: [
      "Proof of Identity (Aadhaar or Voter ID Card)",
      "Proof of Residence (Electricity bill or Ration card in applicant's/parent's name)",
      "Blood relation paternal certificate OR RoR (Record of Rights) land deed",
      "Two passport-sized photographs"
    ],
    officialProcedure: [
      "1. Submit application online at state portal or nearest Common Service Centre (CSC).",
      "2. Obtain dated system acknowledgement with 14-digit application tracking number.",
      "3. Revenue Inspector conducts field inquiry within 7 business days.",
      "4. Sub-Divisional Officer (SDO) signs digitally and releases certificate for direct download."
    ],
    responsibleOffice: "Office of the Sub-Divisional Officer (SDO), Revenue Circle",
    grievanceChannel: {
      portalName: "State Right to Public Services Grievance Portal (RTS)",
      escalationContact: "District Magistrate Grievance Cell (Toll-free 1800-345-5555)",
      statutoryAppellateAuthority: "First Appellate Authority: Additional District Magistrate (Revenue)"
    },
    sampleInteractionHistory: [
      { date: "2026-10-18", step: "Application Submitted at CSC", status: "applied", notes: "Acknowledgement #WB26-99182 generated" },
      { date: "2026-10-22", step: "Field Inquiry by Revenue Inspector", status: "acknowledged", notes: "Inspector visited premises; verified paternal lineage docs" },
      { date: "2026-10-29", step: "Digital Signature & Approval by SDO", status: "delivered", notes: "Digitally signed certificate downloaded without payment or tout intermediary" }
    ]
  },
  {
    id: "service-ration",
    name: "Correction in Digital Ration Card / NFSA Name Amendment",
    department: "Food & Supplies Department",
    statutoryDays: 21,
    officialFee: "₹0 (Free / Zero Fee)",
    requiredDocuments: [
      "Current Digital Ration Card copy",
      "Aadhaar Card with updated spelling",
      "Self-declaration affidavit (for major typographical changes)"
    ],
    officialProcedure: [
      "1. Fill Form 8 online at food portal with Aadhaar OTP authentication.",
      "2. Automatic cross-check against UIDAI database for name alignment.",
      "3. Food Inspector approves digital endorsement within 14 days.",
      "4. Updated e-Ration card generated instantly."
    ],
    responsibleOffice: "Block Food & Supplies Inspector (BFI) Office",
    grievanceChannel: {
      portalName: "National Food Security Act (NFSA) Grievance Portal",
      escalationContact: "District Food Controller Helpdesk (1967)",
      statutoryAppellateAuthority: "District Grievance Redressal Officer (DGRO)"
    }
  },
  {
    id: "service-trade",
    name: "Municipal Trade License Registration",
    department: "Urban Local Bodies / Municipal Corporation",
    statutoryDays: 7,
    officialFee: "₹500 - ₹2,000 (Statutory municipal tariff based on commercial floor area)",
    requiredDocuments: [
      "Shop ownership deed or valid rental lease agreement",
      "Trade PAN card and GST certificate (if turnover > ₹20 Lakh)",
      "Fire NOC (only if restaurant or hazardous storage > 500 sq ft)"
    ],
    officialProcedure: [
      "1. Submit online application on e-District municipal window.",
      "2. Pay statutory fee directly via online treasury gateway with printable challan.",
      "3. Automated risk engine issues provisional license immediately on payment.",
      "4. Post-facto sanitary inspection conducted within 30 days."
    ],
    responsibleOffice: "Municipal License Officer, Borough / Ward Office",
    grievanceChannel: {
      portalName: "Municipal Public Grievance Cell",
      escalationContact: "Borough Executive Officer Desk",
      statutoryAppellateAuthority: "Municipal Commissioner"
    }
  }
];

export const ARGUS_TRUST_METRICS: TrustMetric[] = [
  {
    name: "Service Transparency Index",
    currentValue: "96.4%",
    benchmark: "> 95%",
    definition: "Percentage of public civic procedures with published zero-fee transparency and required checklists."
  },
  {
    name: "Statutory Deadline Compliance",
    currentValue: "88.2%",
    benchmark: "> 85%",
    definition: "Citizen applications completed within statutory Right to Service (RTS) legal timelines."
  },
  {
    name: "Evidence Traceability Rate",
    currentValue: "94.0%",
    benchmark: "> 90%",
    definition: "Published infrastructure milestone claims supported by hash-linked lab or geo-tagged proof."
  },
  {
    name: "False Accusation Protection",
    currentValue: "0% Automated Guilt",
    benchmark: "100% Human Oversight",
    definition: "Strict ban on algorithmic guilt declarations; all risk indicators flagged solely for human due process."
  }
];
