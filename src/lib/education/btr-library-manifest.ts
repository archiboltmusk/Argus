/**
 * Pre-indexed manifest of user BTR local media library at:
 * /Users/anupam/Downloads/BTR
 */

export interface BTRManifestItem {
  id: string;
  title: string;
  filename: string;
  fullPath: string;
  relativePath: string;
  sizeBytes: number;
  kind: "video" | "pdf_annotated" | "pdf_unannotated" | "master_pdf";
  subjectId?: string;
  lectureNumber?: number;
}

export interface BTRCuratedCollection {
  rootPath: string;
  masterPdfs: BTRManifestItem[];
  megaBtrVideos: BTRManifestItem[];
  tndVideos: BTRManifestItem[];
  subjectFiles: BTRManifestItem[];
}

export const USER_LOCAL_BTR_MANIFEST: BTRCuratedCollection = {
  "rootPath": "/Users/anupam/Downloads/BTR",
  "masterPdfs": [
    {
      "id": "btr-4p3d0c9",
      "title": "CoreBTR QBank",
      "filename": "CoreBTR QBank.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR QBank.pdf",
      "relativePath": "CoreBTR QBank.pdf",
      "sizeBytes": 349944036,
      "kind": "master_pdf"
    },
    {
      "id": "btr-m9vxoro",
      "title": "Vol 1",
      "filename": "Vol 1.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Vol 1.pdf",
      "relativePath": "Vol 1.pdf",
      "sizeBytes": 250732837,
      "kind": "master_pdf"
    },
    {
      "id": "btr-89g54hy",
      "title": "Vol 2",
      "filename": "Vol 2.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Vol 2.pdf",
      "relativePath": "Vol 2.pdf",
      "sizeBytes": 172382004,
      "kind": "master_pdf"
    },
    {
      "id": "btr-zvx8gvf",
      "title": "Volume 3",
      "filename": "Volume 3.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Volume 3.pdf",
      "relativePath": "Volume 3.pdf",
      "sizeBytes": 226016587,
      "kind": "master_pdf"
    }
  ],
  "megaBtrVideos": [
    {
      "id": "btr-ra9wt0b",
      "title": "NEET PG MEGA BTR–2 Intermediate Subjects",
      "filename": "NEET PG MEGA BTR–2 Intermediate Subjects_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Mega btr/NEET PG MEGA BTR–2 Intermediate Subjects_temp_wm.mp4",
      "relativePath": "Mega btr/NEET PG MEGA BTR–2 Intermediate Subjects_temp_wm.mp4",
      "sizeBytes": 939103473,
      "kind": "video"
    },
    {
      "id": "btr-exa6215",
      "title": "NEET PG Mega BTR-1 Short Subjects",
      "filename": "NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Mega btr/NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
      "relativePath": "Mega btr/NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
      "sizeBytes": 1228081900,
      "kind": "video"
    },
    {
      "id": "btr-zkscxbb",
      "title": "NEET PG Mega BTR-3 Integrated Systems",
      "filename": "NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Mega btr/NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
      "relativePath": "Mega btr/NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
      "sizeBytes": 1451900904,
      "kind": "video"
    },
    {
      "id": "btr-qi2xkbm",
      "title": "NEET PG Mega BTR-4 Long Subjects",
      "filename": "NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Mega btr/NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
      "relativePath": "Mega btr/NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
      "sizeBytes": 1394415990,
      "kind": "video"
    },
    {
      "id": "btr-7qt9ubo",
      "title": "MegaBTR Part 1 INICET",
      "filename": "MegaBTR Part 1 INICET.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/MegaBTR Part 1 INICET.mp4",
      "relativePath": "MegaBTR Part 1 INICET.mp4",
      "sizeBytes": 947247309,
      "kind": "video"
    },
    {
      "id": "btr-zeiswmk",
      "title": "MegaBTR Part 2 INICET",
      "filename": "MegaBTR Part 2 INICET.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/MegaBTR Part 2 INICET.mp4",
      "relativePath": "MegaBTR Part 2 INICET.mp4",
      "sizeBytes": 1467940874,
      "kind": "video"
    }
  ],
  "tndVideos": [
    {
      "id": "btr-r03hflz",
      "title": "Anatomy T&D by Dr. Zainab Vora",
      "filename": "Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
      "relativePath": "TND/Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
      "sizeBytes": 373870198,
      "kind": "video"
    },
    {
      "id": "btr-1zujw1p",
      "title": "Biochemistry T&D",
      "filename": "Biochemistry T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Biochemistry T&D_temp_wm.mp4",
      "relativePath": "TND/Biochemistry T&D_temp_wm.mp4",
      "sizeBytes": 526001849,
      "kind": "video"
    },
    {
      "id": "btr-mb7xswv",
      "title": "CVS, Renal, Hemat & GI T&D",
      "filename": "CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
      "relativePath": "TND/CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
      "sizeBytes": 613464927,
      "kind": "video"
    },
    {
      "id": "btr-ks7eoef",
      "title": "Derma & Anesthesia T&D",
      "filename": "Derma & Anesthesia T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Derma & Anesthesia T&D_temp_wm.mp4",
      "relativePath": "TND/Derma & Anesthesia T&D_temp_wm.mp4",
      "sizeBytes": 383424820,
      "kind": "video"
    },
    {
      "id": "btr-umm1zy8",
      "title": "Integrated Systems T&D",
      "filename": "Integrated Systems T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Integrated Systems T&D_temp_wm.mp4",
      "relativePath": "TND/Integrated Systems T&D_temp_wm.mp4",
      "sizeBytes": 365466888,
      "kind": "video"
    },
    {
      "id": "btr-drimbzt",
      "title": "Integrated Systems Test-2",
      "filename": "Integrated Systems Test-2_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Integrated Systems Test-2_temp_wm.mp4",
      "relativePath": "TND/Integrated Systems Test-2_temp_wm.mp4",
      "sizeBytes": 534813380,
      "kind": "video"
    },
    {
      "id": "btr-sfi0bx2",
      "title": "Intermediate Subjects T&D",
      "filename": "Intermediate Subjects T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Intermediate Subjects T&D_temp_wm.mp4",
      "relativePath": "TND/Intermediate Subjects T&D_temp_wm.mp4",
      "sizeBytes": 367170854,
      "kind": "video"
    },
    {
      "id": "btr-tgwkzlm",
      "title": "Microbiology T&D by Dr. Zainab Vora",
      "filename": "Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
      "relativePath": "TND/Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
      "sizeBytes": 496887489,
      "kind": "video"
    },
    {
      "id": "btr-2md7rfg",
      "title": "NEET PG 2026 Long Subjects T&D (19-08-2026)",
      "filename": "NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
      "relativePath": "TND/NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
      "sizeBytes": 419552532,
      "kind": "video"
    },
    {
      "id": "btr-mdgwi5h",
      "title": "OBG Mini Test & Discussion",
      "filename": "OBG Mini Test & Discussion_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/OBG Mini Test & Discussion_temp_wm.mp4",
      "relativePath": "TND/OBG Mini Test & Discussion_temp_wm.mp4",
      "sizeBytes": 469753984,
      "kind": "video"
    },
    {
      "id": "btr-sb0idf6",
      "title": "Ophthalmology & ENT T&D",
      "filename": "Ophthalmology & ENT T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Ophthalmology & ENT T&D_temp_wm.mp4",
      "relativePath": "TND/Ophthalmology & ENT T&D_temp_wm.mp4",
      "sizeBytes": 388133475,
      "kind": "video"
    },
    {
      "id": "btr-io680mg",
      "title": "Ortho & Radio T&D by Dr. Zainab Vora",
      "filename": "Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
      "relativePath": "TND/Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
      "sizeBytes": 763417773,
      "kind": "video"
    },
    {
      "id": "btr-ec00l9q",
      "title": "PSM Mini Test & Discussion",
      "filename": "PSM Mini Test & Discussion_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/PSM Mini Test & Discussion_temp_wm.mp4",
      "relativePath": "TND/PSM Mini Test & Discussion_temp_wm.mp4",
      "sizeBytes": 438518884,
      "kind": "video"
    },
    {
      "id": "btr-auc522m",
      "title": "Pediatrics Mini Test & Discussion",
      "filename": "Pediatrics Mini Test & Discussion_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Pediatrics Mini Test & Discussion_temp_wm.mp4",
      "relativePath": "TND/Pediatrics Mini Test & Discussion_temp_wm.mp4",
      "sizeBytes": 667572362,
      "kind": "video"
    },
    {
      "id": "btr-9r859v6",
      "title": "Psychiatry & FMT T&D",
      "filename": "Psychiatry & FMT T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Psychiatry & FMT T&D_temp_wm.mp4",
      "relativePath": "TND/Psychiatry & FMT T&D_temp_wm.mp4",
      "sizeBytes": 435793071,
      "kind": "video"
    },
    {
      "id": "btr-625hbln",
      "title": "Short Subjects T&D",
      "filename": "Short Subjects T&D_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Short Subjects T&D_temp_wm.mp4",
      "relativePath": "TND/Short Subjects T&D_temp_wm.mp4",
      "sizeBytes": 302354187,
      "kind": "video"
    },
    {
      "id": "btr-gis1inc",
      "title": "Surgery T&D by Dr. Zainab Vora",
      "filename": "Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/TND/Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
      "relativePath": "TND/Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
      "sizeBytes": 741573101,
      "kind": "video"
    }
  ],
  "subjectFiles": [
    {
      "id": "btr-t0a5dbf",
      "title": "GIT Hepatobiliary",
      "filename": "GIT Hepatobiliary.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/GIT Hepatobiliary.pdf",
      "relativePath": "GIT Hepatobiliary.pdf",
      "sizeBytes": 13725018,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-f1ygn5e",
      "title": "General Pharmacology",
      "filename": "General Pharmacology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/General Pharmacology.pdf",
      "relativePath": "General Pharmacology.pdf",
      "sizeBytes": 7579473,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-37540e5",
      "title": "General Physiology",
      "filename": "General Physiology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/General Physiology.pdf",
      "relativePath": "General Physiology.pdf",
      "sizeBytes": 13490945,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-nuw4gvp",
      "title": "Hemat",
      "filename": "Hemat.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Hemat.pdf",
      "relativePath": "Hemat.pdf",
      "sizeBytes": 24058823,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-y162mzk",
      "title": "Immunology",
      "filename": "Immunology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Immunology.pdf",
      "relativePath": "Immunology.pdf",
      "sizeBytes": 14395920,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-e88ndx7",
      "title": "CVS",
      "filename": "CVS.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/CVS.pdf",
      "relativePath": "Integrated/CVS.pdf",
      "sizeBytes": 32814814,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-iqf206x",
      "title": "Endocrinology",
      "filename": "Endocrinology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Endocrinology.pdf",
      "relativePath": "Integrated/Endocrinology.pdf",
      "sizeBytes": 15533095,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-67q4mdv",
      "title": "General Pathology",
      "filename": "General Pathology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pathology.mp4",
      "relativePath": "Integrated/General Pathology.mp4",
      "sizeBytes": 633429231,
      "kind": "video"
    },
    {
      "id": "btr-39iea1a",
      "title": "General Pathology",
      "filename": "General Pathology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pathology.pdf",
      "relativePath": "Integrated/General Pathology.pdf",
      "sizeBytes": 1213627,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-vgx1019",
      "title": "General Pharmacology",
      "filename": "General Pharmacology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pharmacology.mp4",
      "relativePath": "Integrated/General Pharmacology.mp4",
      "sizeBytes": 776441884,
      "kind": "video"
    },
    {
      "id": "btr-gvtkxlc",
      "title": "General Physiology",
      "filename": "General Physiology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Physiology.mp4",
      "relativePath": "Integrated/General Physiology.mp4",
      "sizeBytes": 685353686,
      "kind": "video"
    },
    {
      "id": "btr-czjdvga",
      "title": "Hematology",
      "filename": "Hematology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Hematology.mp4",
      "relativePath": "Integrated/Hematology.mp4",
      "sizeBytes": 1578733146,
      "kind": "video"
    },
    {
      "id": "btr-m4upjdl",
      "title": "Immunology",
      "filename": "Immunology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Immunology.mp4",
      "relativePath": "Integrated/Immunology.mp4",
      "sizeBytes": 658567691,
      "kind": "video"
    },
    {
      "id": "btr-96dsxiq",
      "title": "Integrated CVS",
      "filename": "Integrated CVS.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated CVS.mp4",
      "relativePath": "Integrated/Integrated CVS.mp4",
      "sizeBytes": 1861518167,
      "kind": "video"
    },
    {
      "id": "btr-3q7ksbg",
      "title": "Integrated Endocrine System",
      "filename": "Integrated Endocrine System.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Endocrine System.mp4",
      "relativePath": "Integrated/Integrated Endocrine System.mp4",
      "sizeBytes": 1079259601,
      "kind": "video"
    },
    {
      "id": "btr-46rradn",
      "title": "Integrated GI - HPB",
      "filename": "Integrated GI - HPB.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated GI - HPB.mp4",
      "relativePath": "Integrated/Integrated GI - HPB.mp4",
      "sizeBytes": 733251408,
      "kind": "video"
    },
    {
      "id": "btr-uskogop",
      "title": "Integrated Renal-Electrolytes",
      "filename": "Integrated Renal-Electrolytes.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Renal-Electrolytes.mp4",
      "relativePath": "Integrated/Integrated Renal-Electrolytes.mp4",
      "sizeBytes": 903561591,
      "kind": "video"
    },
    {
      "id": "btr-90lue0q",
      "title": "Integrated Respiratory System",
      "filename": "Integrated Respiratory System.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Respiratory System.mp4",
      "relativePath": "Integrated/Integrated Respiratory System.mp4",
      "sizeBytes": 1559232524,
      "kind": "video"
    },
    {
      "id": "btr-dybfuq4",
      "title": "Integrated Rheumatology intro",
      "filename": "Integrated Rheumatology_intro.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Rheumatology_intro.mp4",
      "relativePath": "Integrated/Integrated Rheumatology_intro.mp4",
      "sizeBytes": 524961037,
      "kind": "video"
    },
    {
      "id": "btr-ddk8250",
      "title": "Integrative Neurology",
      "filename": "Integrative Neurology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrative Neurology.mp4",
      "relativePath": "Integrated/Integrative Neurology.mp4",
      "sizeBytes": 1818368065,
      "kind": "video"
    },
    {
      "id": "btr-vpeczgn",
      "title": "Anatomy 1of2",
      "filename": "Anatomy_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy/Anatomy_1of2.mp4",
      "relativePath": "Intermediate sub/Anatomy/Anatomy_1of2.mp4",
      "sizeBytes": 1899980322,
      "kind": "video"
    },
    {
      "id": "btr-h7pflil",
      "title": "Anatomy 2of2",
      "filename": "Anatomy_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy/Anatomy_2of2.mp4",
      "relativePath": "Intermediate sub/Anatomy/Anatomy_2of2.mp4",
      "sizeBytes": 840414923,
      "kind": "video"
    },
    {
      "id": "btr-cph75qd",
      "title": "Anatomy",
      "filename": "Anatomy.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy.pdf",
      "relativePath": "Intermediate sub/Anatomy.pdf",
      "sizeBytes": 17359117,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-3mb7z3m",
      "title": "Biochemistry 1of2",
      "filename": "Biochemistry_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry/Biochemistry_1of2.mp4",
      "relativePath": "Intermediate sub/Biochemistry/Biochemistry_1of2.mp4",
      "sizeBytes": 1899985300,
      "kind": "video"
    },
    {
      "id": "btr-yzx41zv",
      "title": "Biochemistry 2of2",
      "filename": "Biochemistry_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry/Biochemistry_2of2.mp4",
      "relativePath": "Intermediate sub/Biochemistry/Biochemistry_2of2.mp4",
      "sizeBytes": 178725834,
      "kind": "video"
    },
    {
      "id": "btr-v08pc0v",
      "title": "Biochemistry",
      "filename": "Biochemistry.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry.pdf",
      "relativePath": "Intermediate sub/Biochemistry.pdf",
      "sizeBytes": 9915495,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-nph9ibz",
      "title": "Pediatrics part01 intro",
      "filename": "Pediatrics_part01_intro.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Paedia/Pediatrics_part01_intro.mp4",
      "relativePath": "Intermediate sub/Paedia/Pediatrics_part01_intro.mp4",
      "sizeBytes": 1043119188,
      "kind": "video"
    },
    {
      "id": "btr-hxiul7h",
      "title": "Pediatrics part02 intro",
      "filename": "Pediatrics_part02_intro.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Paedia/Pediatrics_part02_intro.mp4",
      "relativePath": "Intermediate sub/Paedia/Pediatrics_part02_intro.mp4",
      "sizeBytes": 1138508938,
      "kind": "video"
    },
    {
      "id": "btr-m0siw4v",
      "title": "Microbiology 1of2",
      "filename": "Microbiology_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/mircobiology/Microbiology_1of2.mp4",
      "relativePath": "Intermediate sub/mircobiology/Microbiology_1of2.mp4",
      "sizeBytes": 1899700846,
      "kind": "video"
    },
    {
      "id": "btr-picsxi3",
      "title": "Microbiology 2of2",
      "filename": "Microbiology_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/mircobiology/Microbiology_2of2.mp4",
      "relativePath": "Intermediate sub/mircobiology/Microbiology_2of2.mp4",
      "sizeBytes": 918667892,
      "kind": "video"
    },
    {
      "id": "btr-0xpsq0w",
      "title": "Obstetrics and Gynaecology 1of2",
      "filename": "Obstetrics and Gynaecology_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Obs Gynae/Obstetrics and Gynaecology_1of2.mp4",
      "relativePath": "Long Subjects/Obs Gynae/Obstetrics and Gynaecology_1of2.mp4",
      "sizeBytes": 1899804620,
      "kind": "video"
    },
    {
      "id": "btr-e2s05qu",
      "title": "Obstetrics and Gynaecology 2of2",
      "filename": "Obstetrics and Gynaecology_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Obs Gynae/Obstetrics and Gynaecology_2of2.mp4",
      "relativePath": "Long Subjects/Obs Gynae/Obstetrics and Gynaecology_2of2.mp4",
      "sizeBytes": 868333895,
      "kind": "video"
    },
    {
      "id": "btr-klq25vu",
      "title": "Preventive and Social Medicine 1of2",
      "filename": "Preventive and Social Medicine_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/PSM/Preventive and Social Medicine_1of2.mp4",
      "relativePath": "Long Subjects/PSM/Preventive and Social Medicine_1of2.mp4",
      "sizeBytes": 1899673599,
      "kind": "video"
    },
    {
      "id": "btr-1fjlpz7",
      "title": "Preventive and Social Medicine 2of2",
      "filename": "Preventive and Social Medicine_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/PSM/Preventive and Social Medicine_2of2.mp4",
      "relativePath": "Long Subjects/PSM/Preventive and Social Medicine_2of2.mp4",
      "sizeBytes": 1322449144,
      "kind": "video"
    },
    {
      "id": "btr-yn5ep63",
      "title": "Surgery 1of2",
      "filename": "Surgery_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Surgery/Surgery_1of2.mp4",
      "relativePath": "Long Subjects/Surgery/Surgery_1of2.mp4",
      "sizeBytes": 1899966741,
      "kind": "video"
    },
    {
      "id": "btr-vql25zu",
      "title": "Surgery 2of2",
      "filename": "Surgery_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Surgery/Surgery_2of2.mp4",
      "relativePath": "Long Subjects/Surgery/Surgery_2of2.mp4",
      "sizeBytes": 1042602832,
      "kind": "video"
    },
    {
      "id": "btr-d5k0hnz",
      "title": "Microbiology (1)",
      "filename": "Microbiology (1).pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Microbiology (1).pdf",
      "relativePath": "Microbiology (1).pdf",
      "sizeBytes": 5344774,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-so0l19h",
      "title": "Neurology",
      "filename": "Neurology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Neurology.pdf",
      "relativePath": "Neurology.pdf",
      "sizeBytes": 30159159,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-7gtrlh3",
      "title": "OBGYN ",
      "filename": "OBGYN .pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/OBGYN .pdf",
      "relativePath": "OBGYN .pdf",
      "sizeBytes": 31589168,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-y9mpzqg",
      "title": "Ophthalmology (1)",
      "filename": "Ophthalmology (1).pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Ophthalmology (1).pdf",
      "relativePath": "Ophthalmology (1).pdf",
      "sizeBytes": 6031969,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-8gvyd60",
      "title": "Orthopaedics (1)",
      "filename": "Orthopaedics (1).pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Orthopaedics (1).pdf",
      "relativePath": "Orthopaedics (1).pdf",
      "sizeBytes": 45090522,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-h5s53h7",
      "title": "PSM",
      "filename": "PSM.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/PSM.pdf",
      "relativePath": "PSM.pdf",
      "sizeBytes": 16193204,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-n038z0w",
      "title": "Pediatric",
      "filename": "Pediatric.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Pediatric.pdf",
      "relativePath": "Pediatric.pdf",
      "sizeBytes": 5277483,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-owmvj62",
      "title": "Psychiatry @verse medical",
      "filename": "Psychiatry @verse_medical.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Psychiatry @verse_medical.pdf",
      "relativePath": "Psychiatry @verse_medical.pdf",
      "sizeBytes": 1082101,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-lcvt7q8",
      "title": "RENAL",
      "filename": "RENAL.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/RENAL.pdf",
      "relativePath": "RENAL.pdf",
      "sizeBytes": 11965907,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-gegqeg9",
      "title": "Radiology (1)",
      "filename": "Radiology (1).pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Radiology (1).pdf",
      "relativePath": "Radiology (1).pdf",
      "sizeBytes": 41393734,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-bjw80z5",
      "title": "Respiratory",
      "filename": "Respiratory.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Respiratory.pdf",
      "relativePath": "Respiratory.pdf",
      "sizeBytes": 15618951,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-4kkd70n",
      "title": "Rheumatology",
      "filename": "Rheumatology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Rheumatology.pdf",
      "relativePath": "Rheumatology.pdf",
      "sizeBytes": 17156298,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-g9si6td",
      "title": "Anesthesia",
      "filename": "Anesthesia.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Anesthesia.mp4",
      "relativePath": "Short subjects/Anesthesia.mp4",
      "sizeBytes": 1303956825,
      "kind": "video"
    },
    {
      "id": "btr-wwwsy5f",
      "title": "Anesthesia",
      "filename": "Anesthesia.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Anesthesia.pdf",
      "relativePath": "Short subjects/Anesthesia.pdf",
      "sizeBytes": 4738855,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-boh8spg",
      "title": "Dermatology",
      "filename": "Dermatology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Dermatology.mp4",
      "relativePath": "Short subjects/Dermatology.mp4",
      "sizeBytes": 1526190736,
      "kind": "video"
    },
    {
      "id": "btr-dswscsl",
      "title": "Dermatology",
      "filename": "Dermatology.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Dermatology.pdf",
      "relativePath": "Short subjects/Dermatology.pdf",
      "sizeBytes": 49807506,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-poy1c65",
      "title": "ENT 1of2",
      "filename": "ENT_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT/ENT_1of2.mp4",
      "relativePath": "Short subjects/ENT/ENT_1of2.mp4",
      "sizeBytes": 1899944971,
      "kind": "video"
    },
    {
      "id": "btr-v418hqm",
      "title": "ENT 2of2",
      "filename": "ENT_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT/ENT_2of2.mp4",
      "relativePath": "Short subjects/ENT/ENT_2of2.mp4",
      "sizeBytes": 355127329,
      "kind": "video"
    },
    {
      "id": "btr-1byx3cu",
      "title": "ENT",
      "filename": "ENT.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT.pdf",
      "relativePath": "Short subjects/ENT.pdf",
      "sizeBytes": 5579155,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-nkaza88",
      "title": "Forensic Medicine 1of2",
      "filename": "Forensic Medicine_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT/Forensic Medicine_1of2.mp4",
      "relativePath": "Short subjects/FMT/Forensic Medicine_1of2.mp4",
      "sizeBytes": 1899836228,
      "kind": "video"
    },
    {
      "id": "btr-fofxnev",
      "title": "Forensic Medicine 2of2",
      "filename": "Forensic Medicine_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT/Forensic Medicine_2of2.mp4",
      "relativePath": "Short subjects/FMT/Forensic Medicine_2of2.mp4",
      "sizeBytes": 65104826,
      "kind": "video"
    },
    {
      "id": "btr-d08e0hs",
      "title": "FMT",
      "filename": "FMT.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT.pdf",
      "relativePath": "Short subjects/FMT.pdf",
      "sizeBytes": 31317545,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-yw48emf",
      "title": "Ophthalmology 1of2",
      "filename": "Ophthalmology_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/OPHTHA/Ophthalmology_1of2.mp4",
      "relativePath": "Short subjects/OPHTHA/Ophthalmology_1of2.mp4",
      "sizeBytes": 1899749896,
      "kind": "video"
    },
    {
      "id": "btr-mxl0sav",
      "title": "Ophthalmology 2of2",
      "filename": "Ophthalmology_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/OPHTHA/Ophthalmology_2of2.mp4",
      "relativePath": "Short subjects/OPHTHA/Ophthalmology_2of2.mp4",
      "sizeBytes": 227141050,
      "kind": "video"
    },
    {
      "id": "btr-15l82cy",
      "title": "Orthopedics 1of2",
      "filename": "Orthopedics_1of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Ortho/Orthopedics_1of2.mp4",
      "relativePath": "Short subjects/Ortho/Orthopedics_1of2.mp4",
      "sizeBytes": 1899613485,
      "kind": "video"
    },
    {
      "id": "btr-ace6k6a",
      "title": "Orthopedics 2of2",
      "filename": "Orthopedics_2of2.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Ortho/Orthopedics_2of2.mp4",
      "relativePath": "Short subjects/Ortho/Orthopedics_2of2.mp4",
      "sizeBytes": 43372388,
      "kind": "video"
    },
    {
      "id": "btr-nmrn4dc",
      "title": "Psychiatry",
      "filename": "Psychiatry.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Psychiatry.mp4",
      "relativePath": "Short subjects/Psychiatry.mp4",
      "sizeBytes": 1301486198,
      "kind": "video"
    },
    {
      "id": "btr-jy3rabe",
      "title": "Radiology",
      "filename": "Radiology.mp4",
      "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Radiology.mp4",
      "relativePath": "Short subjects/Radiology.mp4",
      "sizeBytes": 1824981076,
      "kind": "video"
    },
    {
      "id": "btr-59hbbhy",
      "title": "Surgery (1)",
      "filename": "Surgery (1).pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Surgery (1).pdf",
      "relativePath": "Surgery (1).pdf",
      "sizeBytes": 14709034,
      "kind": "pdf_unannotated"
    },
    {
      "id": "btr-cvcqcm2",
      "title": "Surgery annotated",
      "filename": "Surgery_annotated.pdf",
      "fullPath": "/Users/anupam/Downloads/BTR/Surgery_annotated.pdf",
      "relativePath": "Surgery_annotated.pdf",
      "sizeBytes": 23592862,
      "kind": "pdf_annotated"
    }
  ]
};
