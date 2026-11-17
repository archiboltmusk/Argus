/**
 * Complete, verified manifest of user BTR local media library at:
 * /Users/anupam/Downloads/BTR
 * 100% verified against physical disk filesystem.
 */

export interface BTRManifestItem {
  id: string;
  title: string;
  filename: string;
  fullPath: string;
  relativePath: string;
  sizeBytes: number;
  kind: "video" | "pdf_annotated" | "pdf_unannotated" | "master_pdf" | "gt_pdf" | "tnd_pdf" | "html_test" | "other";
  subjectId?: string;
  lectureNumber?: number;
}

export interface BTRCuratedCollection {
  rootPath: string;
  masterPdfs: BTRManifestItem[];
  megaBtrVideos: BTRManifestItem[];
  tndVideos: BTRManifestItem[];
  tndPdfs: BTRManifestItem[];
  grandTests: BTRManifestItem[];
  subjectFiles: BTRManifestItem[];
}

export const USER_LOCAL_BTR_MANIFEST: BTRCuratedCollection = {
  rootPath: "/Users/anupam/Downloads/BTR",
  masterPdfs: [
  {
    "id": "btr-7abde321",
    "title": "CoreBTR QBank",
    "filename": "CoreBTR QBank.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR QBank.pdf",
    "relativePath": "CoreBTR QBank.pdf",
    "sizeBytes": 349944036,
    "kind": "master_pdf"
  },
  {
    "id": "btr-d63ce4e2",
    "title": "Vol 1",
    "filename": "Vol 1.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Vol 1.pdf",
    "relativePath": "Vol 1.pdf",
    "sizeBytes": 250732837,
    "kind": "master_pdf"
  },
  {
    "id": "btr-1add0c3d",
    "title": "Vol 2",
    "filename": "Vol 2.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Vol 2.pdf",
    "relativePath": "Vol 2.pdf",
    "sizeBytes": 172382004,
    "kind": "master_pdf"
  },
  {
    "id": "btr-2d3f5c44",
    "title": "Volume 3",
    "filename": "Volume 3.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Volume 3.pdf",
    "relativePath": "Volume 3.pdf",
    "sizeBytes": 226016587,
    "kind": "master_pdf"
  }
],
  megaBtrVideos: [
  {
    "id": "btr-5e99d380",
    "title": "MegaBTR Part 1 INICET",
    "filename": "MegaBTR Part 1 INICET.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr INICET NOV 2026/MegaBTR Part 1 INICET.mp4",
    "relativePath": "Mega btr INICET NOV 2026/MegaBTR Part 1 INICET.mp4",
    "sizeBytes": 947247309,
    "kind": "video"
  },
  {
    "id": "btr-6b6f38d4",
    "title": "MegaBTR Part 2 INICET",
    "filename": "MegaBTR Part 2 INICET.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr INICET NOV 2026/MegaBTR Part 2 INICET.mp4",
    "relativePath": "Mega btr INICET NOV 2026/MegaBTR Part 2 INICET.mp4",
    "sizeBytes": 1467940874,
    "kind": "video"
  },
  {
    "id": "btr-ad9cbee0",
    "title": "NEET PG MEGA BTR\u20132 Intermediate Subjects",
    "filename": "NEET PG MEGA BTR\u20132 Intermediate Subjects_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr NEET PG 2026/NEET PG MEGA BTR\u20132 Intermediate Subjects_temp_wm.mp4",
    "relativePath": "Mega btr NEET PG 2026/NEET PG MEGA BTR\u20132 Intermediate Subjects_temp_wm.mp4",
    "sizeBytes": 939103473,
    "kind": "video"
  },
  {
    "id": "btr-0a5d14b9",
    "title": "NEET PG Mega BTR 1 Short Subjects",
    "filename": "NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr NEET PG 2026/NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
    "relativePath": "Mega btr NEET PG 2026/NEET PG Mega BTR-1 Short Subjects_temp_wm.mp4",
    "sizeBytes": 1228081900,
    "kind": "video"
  },
  {
    "id": "btr-9475c25d",
    "title": "NEET PG Mega BTR 3 Integrated Systems",
    "filename": "NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr NEET PG 2026/NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
    "relativePath": "Mega btr NEET PG 2026/NEET PG Mega BTR-3 Integrated Systems_temp_wm.mp4",
    "sizeBytes": 1451900904,
    "kind": "video"
  },
  {
    "id": "btr-03adc3f9",
    "title": "NEET PG Mega BTR 4 Long Subjects",
    "filename": "NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Mega btr NEET PG 2026/NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
    "relativePath": "Mega btr NEET PG 2026/NEET PG Mega BTR-4 Long Subjects_temp_wm.mp4",
    "sizeBytes": 1394415990,
    "kind": "video"
  }
],
  tndVideos: [
  {
    "id": "btr-65b2b60e",
    "title": "Anatomy T&D by Dr  Zainab Vora",
    "filename": "Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
    "relativePath": "TND/Anatomy T&D by Dr. Zainab Vora_temp_wm.mp4",
    "sizeBytes": 373870198,
    "kind": "video"
  },
  {
    "id": "btr-cc384446",
    "title": "Biochemistry T&D",
    "filename": "Biochemistry T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Biochemistry T&D_temp_wm.mp4",
    "relativePath": "TND/Biochemistry T&D_temp_wm.mp4",
    "sizeBytes": 526001849,
    "kind": "video"
  },
  {
    "id": "btr-7884d04e",
    "title": "CVS, Renal, Hemat & GI T&D by Dr Zainab Vora",
    "filename": "CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
    "relativePath": "TND/CVS,_Renal,_Hemat_&_GI_T&D_by_Dr_Zainab_Vora_temp_wm.mp4",
    "sizeBytes": 613464927,
    "kind": "video"
  },
  {
    "id": "btr-1a117757",
    "title": "Derma & Anesthesia T&D",
    "filename": "Derma & Anesthesia T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Derma & Anesthesia T&D_temp_wm.mp4",
    "relativePath": "TND/Derma & Anesthesia T&D_temp_wm.mp4",
    "sizeBytes": 383424820,
    "kind": "video"
  },
  {
    "id": "btr-51995e78",
    "title": "Integrated Systems T&D",
    "filename": "Integrated Systems T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Integrated Systems T&D_temp_wm.mp4",
    "relativePath": "TND/Integrated Systems T&D_temp_wm.mp4",
    "sizeBytes": 365466888,
    "kind": "video"
  },
  {
    "id": "btr-c50d53bf",
    "title": "Integrated Systems Test 2",
    "filename": "Integrated Systems Test-2_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Integrated Systems Test-2_temp_wm.mp4",
    "relativePath": "TND/Integrated Systems Test-2_temp_wm.mp4",
    "sizeBytes": 534813380,
    "kind": "video"
  },
  {
    "id": "btr-76bd93bb",
    "title": "Intermediate Subjects T&D",
    "filename": "Intermediate Subjects T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Intermediate Subjects T&D_temp_wm.mp4",
    "relativePath": "TND/Intermediate Subjects T&D_temp_wm.mp4",
    "sizeBytes": 367170854,
    "kind": "video"
  },
  {
    "id": "btr-0db4aafd",
    "title": "Microbiology T&D by Dr  Zainab Vora",
    "filename": "Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
    "relativePath": "TND/Microbiology T&D by Dr. Zainab Vora_temp_wm.mp4",
    "sizeBytes": 496887489,
    "kind": "video"
  },
  {
    "id": "btr-4083418a",
    "title": "NEET PG 2026 Long Subjects T&D (19 08 2026)",
    "filename": "NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
    "relativePath": "TND/NEET PG 2026 Long Subjects T&D (19-08-2026)_temp_wm.mp4",
    "sizeBytes": 419552532,
    "kind": "video"
  },
  {
    "id": "btr-85c9b3ed",
    "title": "OBG Mini Test & Discussion",
    "filename": "OBG Mini Test & Discussion_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/OBG Mini Test & Discussion_temp_wm.mp4",
    "relativePath": "TND/OBG Mini Test & Discussion_temp_wm.mp4",
    "sizeBytes": 469753984,
    "kind": "video"
  },
  {
    "id": "btr-8435431c",
    "title": "Ophthalmology & ENT T&D",
    "filename": "Ophthalmology & ENT T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Ophthalmology & ENT T&D_temp_wm.mp4",
    "relativePath": "TND/Ophthalmology & ENT T&D_temp_wm.mp4",
    "sizeBytes": 388133475,
    "kind": "video"
  },
  {
    "id": "btr-b4920285",
    "title": "Ortho & Radio T&D by Dr  Zainab Vora",
    "filename": "Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
    "relativePath": "TND/Ortho & Radio T&D by Dr. Zainab Vora_temp_wm.mp4",
    "sizeBytes": 763417773,
    "kind": "video"
  },
  {
    "id": "btr-9490327b",
    "title": "PSM Mini Test & Discussion",
    "filename": "PSM Mini Test & Discussion_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/PSM Mini Test & Discussion_temp_wm.mp4",
    "relativePath": "TND/PSM Mini Test & Discussion_temp_wm.mp4",
    "sizeBytes": 438518884,
    "kind": "video"
  },
  {
    "id": "btr-b631b528",
    "title": "Pediatrics Mini Test & Discussion",
    "filename": "Pediatrics Mini Test & Discussion_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Pediatrics Mini Test & Discussion_temp_wm.mp4",
    "relativePath": "TND/Pediatrics Mini Test & Discussion_temp_wm.mp4",
    "sizeBytes": 667572362,
    "kind": "video"
  },
  {
    "id": "btr-b3e9178a",
    "title": "Psychiatry & FMT T&D",
    "filename": "Psychiatry & FMT T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Psychiatry & FMT T&D_temp_wm.mp4",
    "relativePath": "TND/Psychiatry & FMT T&D_temp_wm.mp4",
    "sizeBytes": 435793071,
    "kind": "video"
  },
  {
    "id": "btr-b13a7509",
    "title": "Short Subjects T&D",
    "filename": "Short Subjects T&D_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Short Subjects T&D_temp_wm.mp4",
    "relativePath": "TND/Short Subjects T&D_temp_wm.mp4",
    "sizeBytes": 302354187,
    "kind": "video"
  },
  {
    "id": "btr-b28e2d2f",
    "title": "Surgery T&D by Dr  Zainab Vora",
    "filename": "Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/TND/Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
    "relativePath": "TND/Surgery T&D by Dr. Zainab Vora_temp_wm.mp4",
    "sizeBytes": 741573101,
    "kind": "video"
  }
],
  tndPdfs: [
  {
    "id": "btr-202394c4",
    "title": "Anatomy T D by Dr  Zainab Vora",
    "filename": "Anatomy_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anatomy_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "relativePath": "Anatomy_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "sizeBytes": 16610071,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-5eeba7f8",
    "title": "Biochemistry T D",
    "filename": "Biochemistry_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Biochemistry_T_D_annotated.pdf",
    "relativePath": "Biochemistry_T_D_annotated.pdf",
    "sizeBytes": 22031664,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-faa16d30",
    "title": "CVS  Renal  Hemat   GI T D by Dr  Zainab Vora  (1)",
    "filename": "CVS__Renal__Hemat___GI_T_D_by_Dr._Zainab_Vora_annotated (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CVS__Renal__Hemat___GI_T_D_by_Dr._Zainab_Vora_annotated (1).pdf",
    "relativePath": "CVS__Renal__Hemat___GI_T_D_by_Dr._Zainab_Vora_annotated (1).pdf",
    "sizeBytes": 22496113,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-daafdcdf",
    "title": "Derma   Anesthesia T D",
    "filename": "Derma___Anesthesia_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Derma___Anesthesia_T_D_annotated.pdf",
    "relativePath": "Derma___Anesthesia_T_D_annotated.pdf",
    "sizeBytes": 22266650,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-024d96f1",
    "title": "Integrated Systems T D",
    "filename": "Integrated_Systems_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated_Systems_T_D_annotated.pdf",
    "relativePath": "Integrated_Systems_T_D_annotated.pdf",
    "sizeBytes": 19809215,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-fb62bf3c",
    "title": "Microbiology T D by Dr  Zainab Vora",
    "filename": "Microbiology_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Microbiology_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "relativePath": "Microbiology_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "sizeBytes": 21081029,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-451d9fa8",
    "title": "OBG Mini Test   Discussion",
    "filename": "OBG_Mini_Test___Discussion_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/OBG_Mini_Test___Discussion_annotated.pdf",
    "relativePath": "OBG_Mini_Test___Discussion_annotated.pdf",
    "sizeBytes": 26181368,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-08cc8509",
    "title": "Ophthalmology   ENT T D",
    "filename": "Ophthalmology___ENT_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Ophthalmology___ENT_T_D_annotated.pdf",
    "relativePath": "Ophthalmology___ENT_T_D_annotated.pdf",
    "sizeBytes": 21415443,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-da6fb8d8",
    "title": "Ortho   Radio T D by Dr  Zainab Vora",
    "filename": "Ortho___Radio_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Ortho___Radio_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "relativePath": "Ortho___Radio_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "sizeBytes": 18817324,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-114da37c",
    "title": "PSM Mini Test   Discussion",
    "filename": "PSM_Mini_Test___Discussion_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/PSM_Mini_Test___Discussion_annotated.pdf",
    "relativePath": "PSM_Mini_Test___Discussion_annotated.pdf",
    "sizeBytes": 25642804,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-8078638f",
    "title": "Pediatrics Mini Test   Discussion",
    "filename": "Pediatrics_Mini_Test___Discussion_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Pediatrics_Mini_Test___Discussion_annotated.pdf",
    "relativePath": "Pediatrics_Mini_Test___Discussion_annotated.pdf",
    "sizeBytes": 29548123,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-6ec43ccb",
    "title": "Psychiatry   FMT T D",
    "filename": "Psychiatry___FMT_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Psychiatry___FMT_T_D_annotated.pdf",
    "relativePath": "Psychiatry___FMT_T_D_annotated.pdf",
    "sizeBytes": 19259353,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-1fd57fe2",
    "title": "Short Subjects T D",
    "filename": "Short_Subjects_T_D_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Short_Subjects_T_D_annotated.pdf",
    "relativePath": "Short_Subjects_T_D_annotated.pdf",
    "sizeBytes": 15015984,
    "kind": "tnd_pdf"
  },
  {
    "id": "btr-bb9d4e6f",
    "title": "Surgery T D by Dr  Zainab Vora",
    "filename": "Surgery_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Surgery_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "relativePath": "Surgery_T_D_by_Dr._Zainab_Vora_annotated.pdf",
    "sizeBytes": 23310467,
    "kind": "tnd_pdf"
  }
],
  grandTests: [
  {
    "id": "btr-708c1f71",
    "title": "Baseline Grand Test 4",
    "filename": "Baseline_Grand_Test-4_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Baseline_Grand_Test-4_annotated.pdf",
    "relativePath": "Baseline_Grand_Test-4_annotated.pdf",
    "sizeBytes": 42240537,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-c4401d48",
    "title": "CoreBTR Grand Test 3",
    "filename": "CoreBTR_Grand_Test-3_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-3_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-3_annotated.pdf",
    "sizeBytes": 42867042,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-57eb96c0",
    "title": "CoreBTR Grand Test 5",
    "filename": "CoreBTR_Grand_Test-5_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-5_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-5_annotated.pdf",
    "sizeBytes": 47972153,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-9f4b4ae2",
    "title": "CoreBTR Grand Test 6",
    "filename": "CoreBTR_Grand_Test-6_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-6_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-6_annotated.pdf",
    "sizeBytes": 49187980,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-3c3ec7ed",
    "title": "CoreBTR Grand Test 7",
    "filename": "CoreBTR_Grand_Test-7_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-7_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-7_annotated.pdf",
    "sizeBytes": 45506206,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-0e78309b",
    "title": "CoreBTR Grand Test 8",
    "filename": "CoreBTR_Grand_Test-8_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-8_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-8_annotated.pdf",
    "sizeBytes": 38714147,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-acc38afe",
    "title": "CoreBTR Grand Test 9 non",
    "filename": "CoreBTR_Grand_Test-9_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test-9_non_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test-9_non_annotated.pdf",
    "sizeBytes": 27698836,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-9dea8009",
    "title": "CoreBTR Grand Test 1 Solutions   04 04 2026",
    "filename": "CoreBTR_Grand_Test_1_Solutions_-_04.04.2026_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test_1_Solutions_-_04.04.2026_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test_1_Solutions_-_04.04.2026_annotated.pdf",
    "sizeBytes": 47099601,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-0bcaf800",
    "title": "CoreBTR Grand Test 2 Solutions   17 04 2026",
    "filename": "CoreBTR_Grand_Test_2_Solutions_-_17.04.2026_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CoreBTR_Grand_Test_2_Solutions_-_17.04.2026_annotated.pdf",
    "relativePath": "CoreBTR_Grand_Test_2_Solutions_-_17.04.2026_annotated.pdf",
    "sizeBytes": 58318996,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-78da72d3",
    "title": "NEET PG Mock Grand Test (2)",
    "filename": "NEET-PG_Mock_Grand_Test (2).html",
    "fullPath": "/Users/anupam/Downloads/BTR/NEET-PG_Mock_Grand_Test (2).html",
    "relativePath": "NEET-PG_Mock_Grand_Test (2).html",
    "sizeBytes": 1343286,
    "kind": "html_test"
  },
  {
    "id": "btr-aa35746b",
    "title": "National INICET Mock GT",
    "filename": "National_INICET_Mock_GT_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/National_INICET_Mock_GT_annotated.pdf",
    "relativePath": "National_INICET_Mock_GT_annotated.pdf",
    "sizeBytes": 51248985,
    "kind": "gt_pdf"
  },
  {
    "id": "btr-8433a62c",
    "title": "core btr Grand Tests (1)",
    "filename": "core_btr_Grand_Tests (1).html",
    "fullPath": "/Users/anupam/Downloads/BTR/core_btr_Grand_Tests (1).html",
    "relativePath": "core_btr_Grand_Tests (1).html",
    "sizeBytes": 5266130,
    "kind": "html_test"
  }
],
  subjectFiles: [
  {
    "id": "btr-a0373cc5",
    "title": "2  MEGA INICET BTR 2 @verse medical",
    "filename": "2._MEGA_INICET_BTR_2 @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/2._MEGA_INICET_BTR_2 @verse_medical.pdf",
    "relativePath": "2._MEGA_INICET_BTR_2 @verse_medical.pdf",
    "sizeBytes": 40402556,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f4e8ecf6",
    "title": "Anatomy (1)",
    "filename": "Anatomy (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anatomy (1).pdf",
    "relativePath": "Anatomy (1).pdf",
    "sizeBytes": 17359117,
    "subjectId": "anatomy",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-5abb014b",
    "title": "Anatomy",
    "filename": "Anatomy_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anatomy_annotated.pdf",
    "relativePath": "Anatomy_annotated.pdf",
    "sizeBytes": 20429237,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-82185c34",
    "title": "Anatomy non",
    "filename": "Anatomy_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anatomy_non_annotated.pdf",
    "relativePath": "Anatomy_non_annotated.pdf",
    "sizeBytes": 16272206,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-757934dd",
    "title": "Anesthesia",
    "filename": "Anesthesia.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anesthesia.pdf",
    "relativePath": "Anesthesia.pdf",
    "sizeBytes": 4738855,
    "subjectId": "anesthesia",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-82ae6376",
    "title": "Anesthesia",
    "filename": "Anesthesia_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anesthesia_annotated.pdf",
    "relativePath": "Anesthesia_annotated.pdf",
    "sizeBytes": 18477182,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-d109fa8f",
    "title": "Anesthesia non",
    "filename": "Anesthesia_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Anesthesia_non_annotated.pdf",
    "relativePath": "Anesthesia_non_annotated.pdf",
    "sizeBytes": 8963893,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-6682439a",
    "title": "Biochemistry (1)",
    "filename": "Biochemistry (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Biochemistry (1).pdf",
    "relativePath": "Biochemistry (1).pdf",
    "sizeBytes": 9915495,
    "subjectId": "biochemistry",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-2934ee24",
    "title": "Biochemistry",
    "filename": "Biochemistry_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Biochemistry_annotated.pdf",
    "relativePath": "Biochemistry_annotated.pdf",
    "sizeBytes": 13913261,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-efb7d876",
    "title": "Biochemistry non",
    "filename": "Biochemistry_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Biochemistry_non_annotated.pdf",
    "relativePath": "Biochemistry_non_annotated.pdf",
    "sizeBytes": 13074382,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-704bed2b",
    "title": "CVS",
    "filename": "CVS.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/CVS.pdf",
    "relativePath": "CVS.pdf",
    "sizeBytes": 32814814,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f9233990",
    "title": "Core btr Qbank  2",
    "filename": "Core btr Qbank -2.html",
    "fullPath": "/Users/anupam/Downloads/BTR/Core btr Qbank -2.html",
    "relativePath": "Core btr Qbank -2.html",
    "sizeBytes": 7953944,
    "subjectId": "medicine",
    "kind": "other"
  },
  {
    "id": "btr-abc94872",
    "title": "Corebtr Elite 1",
    "filename": "Corebtr Elite-1.html",
    "fullPath": "/Users/anupam/Downloads/BTR/Corebtr Elite-1.html",
    "relativePath": "Corebtr Elite-1.html",
    "sizeBytes": 7044945,
    "subjectId": "medicine",
    "kind": "other"
  },
  {
    "id": "btr-c6ca5f83",
    "title": "Dermatology (1)",
    "filename": "Dermatology (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Dermatology (1).pdf",
    "relativePath": "Dermatology (1).pdf",
    "sizeBytes": 49807506,
    "subjectId": "dermatology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-7df87133",
    "title": "Dermatology Annotated",
    "filename": "Dermatology Annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Dermatology Annotated.pdf",
    "relativePath": "Dermatology Annotated.pdf",
    "sizeBytes": 43595810,
    "subjectId": "dermatology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-93096da6",
    "title": "Dermatology Un",
    "filename": "Dermatology Unannotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Dermatology Unannotated.pdf",
    "relativePath": "Dermatology Unannotated.pdf",
    "sizeBytes": 12555046,
    "subjectId": "dermatology",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-2ed616b1",
    "title": "ENT (1)",
    "filename": "ENT (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/ENT (1).pdf",
    "relativePath": "ENT (1).pdf",
    "sizeBytes": 5579155,
    "subjectId": "ent",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-c937fe15",
    "title": "ENT",
    "filename": "ENT_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/ENT_annotated.pdf",
    "relativePath": "ENT_annotated.pdf",
    "sizeBytes": 49995428,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-4e18c224",
    "title": "ENT non",
    "filename": "ENT_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/ENT_non_annotated.pdf",
    "relativePath": "ENT_non_annotated.pdf",
    "sizeBytes": 14200714,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-2199d6e6",
    "title": "Endocrinology",
    "filename": "Endocrinology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Endocrinology.pdf",
    "relativePath": "Endocrinology.pdf",
    "sizeBytes": 15533095,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-dafb747a",
    "title": "FMT (2)",
    "filename": "FMT (2).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/FMT (2).pdf",
    "relativePath": "FMT (2).pdf",
    "sizeBytes": 31317545,
    "subjectId": "fmt",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-fc54b7f2",
    "title": "Forensic Medicine",
    "filename": "Forensic Medicine_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Forensic Medicine_annotated.pdf",
    "relativePath": "Forensic Medicine_annotated.pdf",
    "sizeBytes": 48081422,
    "subjectId": "fmt",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-5155caa3",
    "title": "Forensic Medicine non",
    "filename": "Forensic Medicine_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Forensic Medicine_non_annotated.pdf",
    "relativePath": "Forensic Medicine_non_annotated.pdf",
    "sizeBytes": 24032230,
    "subjectId": "fmt",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-12107b09",
    "title": "GIT Hepatobiliary",
    "filename": "GIT Hepatobiliary.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/GIT Hepatobiliary.pdf",
    "relativePath": "GIT Hepatobiliary.pdf",
    "sizeBytes": 13725018,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-a8e4140e",
    "title": "General Pathology",
    "filename": "General Pathology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pathology.pdf",
    "relativePath": "General Pathology.pdf",
    "sizeBytes": 1213627,
    "subjectId": "pathology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-7f4fa589",
    "title": "General Pathology",
    "filename": "General Pathology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pathology_annotated.pdf",
    "relativePath": "General Pathology_annotated.pdf",
    "sizeBytes": 15665700,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-daa76e3e",
    "title": "General Pathology non",
    "filename": "General Pathology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pathology_non_annotated.pdf",
    "relativePath": "General Pathology_non_annotated.pdf",
    "sizeBytes": 7832905,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-62e1b6f0",
    "title": "General Pharmacology",
    "filename": "General Pharmacology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pharmacology.pdf",
    "relativePath": "General Pharmacology.pdf",
    "sizeBytes": 7579473,
    "subjectId": "pharmacology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-282efe99",
    "title": "General Pharmacology",
    "filename": "General Pharmacology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pharmacology_annotated.pdf",
    "relativePath": "General Pharmacology_annotated.pdf",
    "sizeBytes": 15693221,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-ecfab537",
    "title": "General Pharmacology non",
    "filename": "General Pharmacology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Pharmacology_non_annotated.pdf",
    "relativePath": "General Pharmacology_non_annotated.pdf",
    "sizeBytes": 7284730,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-b4b37cc5",
    "title": "General Physiology",
    "filename": "General Physiology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Physiology.pdf",
    "relativePath": "General Physiology.pdf",
    "sizeBytes": 13490945,
    "subjectId": "physiology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-76768904",
    "title": "General Physiology",
    "filename": "General Physiology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Physiology_annotated.pdf",
    "relativePath": "General Physiology_annotated.pdf",
    "sizeBytes": 25028583,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f7c44272",
    "title": "General Physiology non",
    "filename": "General Physiology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/General Physiology_non_annotated.pdf",
    "relativePath": "General Physiology_non_annotated.pdf",
    "sizeBytes": 22813745,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-5582eeaf",
    "title": "Hemat",
    "filename": "Hemat.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Hemat.pdf",
    "relativePath": "Hemat.pdf",
    "sizeBytes": 24058823,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-44031167",
    "title": "Hematology",
    "filename": "Hematology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Hematology_annotated.pdf",
    "relativePath": "Hematology_annotated.pdf",
    "sizeBytes": 38669386,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-d6c21fec",
    "title": "Hematology non",
    "filename": "Hematology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Hematology_non_annotated.pdf",
    "relativePath": "Hematology_non_annotated.pdf",
    "sizeBytes": 11517791,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-4379f85c",
    "title": "Immunology",
    "filename": "Immunology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Immunology.pdf",
    "relativePath": "Immunology.pdf",
    "sizeBytes": 14395920,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-03dc4814",
    "title": "Immunology",
    "filename": "Immunology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Immunology_annotated.pdf",
    "relativePath": "Immunology_annotated.pdf",
    "sizeBytes": 16713169,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-41967db0",
    "title": "Immunology non",
    "filename": "Immunology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Immunology_non_annotated.pdf",
    "relativePath": "Immunology_non_annotated.pdf",
    "sizeBytes": 13171879,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-a11b02c1",
    "title": "Integrated CVS",
    "filename": "Integrated CVS_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated CVS_annotated.pdf",
    "relativePath": "Integrated CVS_annotated.pdf",
    "sizeBytes": 39450771,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-fcc6d4a3",
    "title": "Integrated CVS non",
    "filename": "Integrated CVS_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated CVS_non_annotated.pdf",
    "relativePath": "Integrated CVS_non_annotated.pdf",
    "sizeBytes": 11311957,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-7507e077",
    "title": "Integrated Endocrine System",
    "filename": "Integrated Endocrine System_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Endocrine System_annotated.pdf",
    "relativePath": "Integrated Endocrine System_annotated.pdf",
    "sizeBytes": 25815911,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-fbcd4fc4",
    "title": "Integrated Endocrine System non",
    "filename": "Integrated Endocrine System_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Endocrine System_non_annotated.pdf",
    "relativePath": "Integrated Endocrine System_non_annotated.pdf",
    "sizeBytes": 6682966,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-79759925",
    "title": "Integrated GI   HPB",
    "filename": "Integrated GI - HPB_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated GI - HPB_annotated.pdf",
    "relativePath": "Integrated GI - HPB_annotated.pdf",
    "sizeBytes": 22595443,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f1d95e3c",
    "title": "Integrated GI   HPB non",
    "filename": "Integrated GI - HPB_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated GI - HPB_non_annotated.pdf",
    "relativePath": "Integrated GI - HPB_non_annotated.pdf",
    "sizeBytes": 8312224,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-f5ec0fb1",
    "title": "Integrated Renal Electrolytes",
    "filename": "Integrated Renal-Electrolytes_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Renal-Electrolytes_annotated.pdf",
    "relativePath": "Integrated Renal-Electrolytes_annotated.pdf",
    "sizeBytes": 27277507,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-8e74672c",
    "title": "Integrated Renal Electrolytes non",
    "filename": "Integrated Renal-Electrolytes_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Renal-Electrolytes_non_annotated.pdf",
    "relativePath": "Integrated Renal-Electrolytes_non_annotated.pdf",
    "sizeBytes": 6313778,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-e950021d",
    "title": "Integrated Respiratory System",
    "filename": "Integrated Respiratory System_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Respiratory System_annotated.pdf",
    "relativePath": "Integrated Respiratory System_annotated.pdf",
    "sizeBytes": 24022233,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-012be6ce",
    "title": "Integrated Respiratory System non",
    "filename": "Integrated Respiratory System_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Respiratory System_non_annotated.pdf",
    "relativePath": "Integrated Respiratory System_non_annotated.pdf",
    "sizeBytes": 7956480,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-f9bbf5bd",
    "title": "Integrated Rheumatology",
    "filename": "Integrated Rheumatology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Rheumatology_annotated.pdf",
    "relativePath": "Integrated Rheumatology_annotated.pdf",
    "sizeBytes": 39850790,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-a8f5560d",
    "title": "Integrated Rheumatology non",
    "filename": "Integrated Rheumatology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated Rheumatology_non_annotated.pdf",
    "relativePath": "Integrated Rheumatology_non_annotated.pdf",
    "sizeBytes": 8260678,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-891329f5",
    "title": "Integrated Systems Test 2",
    "filename": "Integrated_Systems_Test-2_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated_Systems_Test-2_annotated.pdf",
    "relativePath": "Integrated_Systems_Test-2_annotated.pdf",
    "sizeBytes": 20022840,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-20d9117e",
    "title": "Integrative Neurology",
    "filename": "Integrative Neurology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrative Neurology_annotated.pdf",
    "relativePath": "Integrative Neurology_annotated.pdf",
    "sizeBytes": 34938625,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-c01509bb",
    "title": "Integrative Neurology non",
    "filename": "Integrative Neurology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrative Neurology_non_annotated.pdf",
    "relativePath": "Integrative Neurology_non_annotated.pdf",
    "sizeBytes": 12872661,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-dbd814a1",
    "title": "MEGA BTR 1 INICET NOV",
    "filename": "MEGA BTR-1 INICET NOV annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA BTR-1 INICET NOV annotated.pdf",
    "relativePath": "MEGA BTR-1 INICET NOV annotated.pdf",
    "sizeBytes": 95988238,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-22c1ea96",
    "title": "MEGA BTR 1 INICET NOV un",
    "filename": "MEGA BTR-1 INICET NOV unannotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA BTR-1 INICET NOV unannotated.pdf",
    "relativePath": "MEGA BTR-1 INICET NOV unannotated.pdf",
    "sizeBytes": 66386631,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-bc957792",
    "title": "MEGA BTR 2 INICET NOV",
    "filename": "MEGA BTR-2 INICET NOV annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA BTR-2 INICET NOV annotated.pdf",
    "relativePath": "MEGA BTR-2 INICET NOV annotated.pdf",
    "sizeBytes": 99430702,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-457dffad",
    "title": "MEGA BTR 2 INICET NOV un",
    "filename": "MEGA BTR-2 INICET NOV unannotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA BTR-2 INICET NOV unannotated.pdf",
    "relativePath": "MEGA BTR-2 INICET NOV unannotated.pdf",
    "sizeBytes": 60484376,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-3b45dc19",
    "title": "MEGA INICET BTR 1 @verse medical",
    "filename": "MEGA INICET BTR 1 @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA INICET BTR 1 @verse_medical.pdf",
    "relativePath": "MEGA INICET BTR 1 @verse_medical.pdf",
    "sizeBytes": 56957287,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-af975c33",
    "title": "MEGA INICET BTR 1 Redacted @verse medical",
    "filename": "MEGA INICET BTR 1-Redacted @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA INICET BTR 1-Redacted @verse_medical.pdf",
    "relativePath": "MEGA INICET BTR 1-Redacted @verse_medical.pdf",
    "sizeBytes": 30594551,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-b77042ba",
    "title": "MEGA INICET BTR 2  @verse medical",
    "filename": "MEGA INICET BTR 2 annotated @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA INICET BTR 2 annotated @verse_medical.pdf",
    "relativePath": "MEGA INICET BTR 2 annotated @verse_medical.pdf",
    "sizeBytes": 61107764,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-af597eac",
    "title": "MEGA INICET BTR 2 redacted @verse medical",
    "filename": "MEGA INICET BTR 2 redacted @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/MEGA INICET BTR 2 redacted @verse_medical.pdf",
    "relativePath": "MEGA INICET BTR 2 redacted @verse_medical.pdf",
    "sizeBytes": 33410525,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-39ecf32f",
    "title": "Microbiology (1)",
    "filename": "Microbiology (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Microbiology (1).pdf",
    "relativePath": "Microbiology (1).pdf",
    "sizeBytes": 5344774,
    "subjectId": "microbiology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f54b76da",
    "title": "Microbiology",
    "filename": "Microbiology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Microbiology_annotated.pdf",
    "relativePath": "Microbiology_annotated.pdf",
    "sizeBytes": 22931367,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-8f283dd2",
    "title": "Microbiology non",
    "filename": "Microbiology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Microbiology_non_annotated.pdf",
    "relativePath": "Microbiology_non_annotated.pdf",
    "sizeBytes": 24302685,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-c9986a74",
    "title": "Neurology",
    "filename": "Neurology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Neurology.pdf",
    "relativePath": "Neurology.pdf",
    "sizeBytes": 30159159,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-8856823a",
    "title": "OBGYN",
    "filename": "OBGYN .pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/OBGYN .pdf",
    "relativePath": "OBGYN .pdf",
    "sizeBytes": 31589168,
    "subjectId": "obgyn",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-a90b472b",
    "title": "Obstetrics and Gynaecology",
    "filename": "Obstetrics and Gynaecology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Obstetrics and Gynaecology_annotated.pdf",
    "relativePath": "Obstetrics and Gynaecology_annotated.pdf",
    "sizeBytes": 23122514,
    "subjectId": "obgyn",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-b2dec095",
    "title": "Obstetrics and Gynaecology non",
    "filename": "Obstetrics and Gynaecology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Obstetrics and Gynaecology_non_annotated.pdf",
    "relativePath": "Obstetrics and Gynaecology_non_annotated.pdf",
    "sizeBytes": 4861624,
    "subjectId": "obgyn",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-4b07f6e0",
    "title": "Ophthalmology (1)",
    "filename": "Ophthalmology (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Ophthalmology (1).pdf",
    "relativePath": "Ophthalmology (1).pdf",
    "sizeBytes": 6031969,
    "subjectId": "ophthalmology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-2fd048e6",
    "title": "Ophthalmology",
    "filename": "Ophthalmology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Ophthalmology_annotated.pdf",
    "relativePath": "Ophthalmology_annotated.pdf",
    "sizeBytes": 16587632,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-fef3c31f",
    "title": "Ophthalmology non",
    "filename": "Ophthalmology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Ophthalmology_non_annotated.pdf",
    "relativePath": "Ophthalmology_non_annotated.pdf",
    "sizeBytes": 17917794,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-ca0f42c0",
    "title": "Orthopaedics (1)",
    "filename": "Orthopaedics (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Orthopaedics (1).pdf",
    "relativePath": "Orthopaedics (1).pdf",
    "sizeBytes": 45090522,
    "subjectId": "orthopedics",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-b89a7fcd",
    "title": "Orthopedics",
    "filename": "Orthopedics_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Orthopedics_annotated.pdf",
    "relativePath": "Orthopedics_annotated.pdf",
    "sizeBytes": 17421264,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f35e6a2c",
    "title": "Orthopedics non",
    "filename": "Orthopedics_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Orthopedics_non_annotated.pdf",
    "relativePath": "Orthopedics_non_annotated.pdf",
    "sizeBytes": 12574055,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-8caf8a8f",
    "title": "PSM",
    "filename": "PSM.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/PSM.pdf",
    "relativePath": "PSM.pdf",
    "sizeBytes": 16193204,
    "subjectId": "psm",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-6f0307b8",
    "title": "Pediatric",
    "filename": "Pediatric.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Pediatric.pdf",
    "relativePath": "Pediatric.pdf",
    "sizeBytes": 5277483,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-b512576b",
    "title": "Pediatrics",
    "filename": "Pediatrics_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Pediatrics_annotated.pdf",
    "relativePath": "Pediatrics_annotated.pdf",
    "sizeBytes": 23615374,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-86e59f59",
    "title": "Pediatrics non",
    "filename": "Pediatrics_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Pediatrics_non_annotated.pdf",
    "relativePath": "Pediatrics_non_annotated.pdf",
    "sizeBytes": 18463502,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-d3286947",
    "title": "Preventive and Social Medicine",
    "filename": "Preventive and Social Medicine_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Preventive and Social Medicine_annotated.pdf",
    "relativePath": "Preventive and Social Medicine_annotated.pdf",
    "sizeBytes": 20055326,
    "subjectId": "psm",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-f1e5dd88",
    "title": "Preventive and Social Medicine non",
    "filename": "Preventive and Social Medicine_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Preventive and Social Medicine_non_annotated.pdf",
    "relativePath": "Preventive and Social Medicine_non_annotated.pdf",
    "sizeBytes": 8022615,
    "subjectId": "psm",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-3e8d90e3",
    "title": "Psychiatry @verse medical",
    "filename": "Psychiatry @verse_medical.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Psychiatry @verse_medical.pdf",
    "relativePath": "Psychiatry @verse_medical.pdf",
    "sizeBytes": 1082101,
    "subjectId": "psychiatry",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-e39bdd6d",
    "title": "Psychiatry",
    "filename": "Psychiatry_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Psychiatry_annotated.pdf",
    "relativePath": "Psychiatry_annotated.pdf",
    "sizeBytes": 26401472,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-b2c5a92c",
    "title": "Psychiatry non",
    "filename": "Psychiatry_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Psychiatry_non_annotated.pdf",
    "relativePath": "Psychiatry_non_annotated.pdf",
    "sizeBytes": 6014513,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-300e0681",
    "title": "RENAL",
    "filename": "RENAL.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/RENAL.pdf",
    "relativePath": "RENAL.pdf",
    "sizeBytes": 11965907,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-e65b9119",
    "title": "Radiology (1)",
    "filename": "Radiology (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Radiology (1).pdf",
    "relativePath": "Radiology (1).pdf",
    "sizeBytes": 41393734,
    "subjectId": "radiology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-74d2ac2d",
    "title": "Radiology",
    "filename": "Radiology_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Radiology_annotated.pdf",
    "relativePath": "Radiology_annotated.pdf",
    "sizeBytes": 19036892,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-99245a4a",
    "title": "Radiology non",
    "filename": "Radiology_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Radiology_non_annotated.pdf",
    "relativePath": "Radiology_non_annotated.pdf",
    "sizeBytes": 19437587,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-d42d35e5",
    "title": "Respiratory",
    "filename": "Respiratory.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Respiratory.pdf",
    "relativePath": "Respiratory.pdf",
    "sizeBytes": 15618951,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-25ba9a14",
    "title": "Rheumatology",
    "filename": "Rheumatology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Rheumatology.pdf",
    "relativePath": "Rheumatology.pdf",
    "sizeBytes": 17156298,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-4cdb9997",
    "title": "Surgery (1)",
    "filename": "Surgery (1).pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Surgery (1).pdf",
    "relativePath": "Surgery (1).pdf",
    "sizeBytes": 14709034,
    "subjectId": "surgery",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-e58257ef",
    "title": "Surgery",
    "filename": "Surgery_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Surgery_annotated.pdf",
    "relativePath": "Surgery_annotated.pdf",
    "sizeBytes": 23592862,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-fc82527b",
    "title": "Surgery non",
    "filename": "Surgery_non_annotated.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Surgery_non_annotated.pdf",
    "relativePath": "Surgery_non_annotated.pdf",
    "sizeBytes": 5375456,
    "subjectId": "medicine",
    "kind": "pdf_unannotated"
  },
  {
    "id": "btr-f6498f35",
    "title": "core btr Mini Tests",
    "filename": "core_btr_Mini_Tests.html",
    "fullPath": "/Users/anupam/Downloads/BTR/core_btr_Mini_Tests.html",
    "relativePath": "core_btr_Mini_Tests.html",
    "sizeBytes": 3845468,
    "subjectId": "medicine",
    "kind": "other"
  },
  {
    "id": "btr-fccfbf3e",
    "title": "Preventive and Social Medicine 1of2",
    "filename": "Preventive and Social Medicine_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/PSM/Preventive and Social Medicine_1of2.mp4",
    "relativePath": "Long Subjects/PSM/Preventive and Social Medicine_1of2.mp4",
    "sizeBytes": 1899673599,
    "subjectId": "psm",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-60da8bcc",
    "title": "Preventive and Social Medicine 2of2",
    "filename": "Preventive and Social Medicine_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/PSM/Preventive and Social Medicine_2of2.mp4",
    "relativePath": "Long Subjects/PSM/Preventive and Social Medicine_2of2.mp4",
    "sizeBytes": 1322449144,
    "subjectId": "psm",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-74edef07",
    "title": "Obstetrics and Gynaecology 1of2",
    "filename": "Obstetrics and Gynaecology_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Obs Gynae/Obstetrics and Gynaecology_1of2.mp4",
    "relativePath": "Long Subjects/Obs Gynae/Obstetrics and Gynaecology_1of2.mp4",
    "sizeBytes": 1899804620,
    "subjectId": "obgyn",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-b7d4f3e5",
    "title": "Obstetrics and Gynaecology 2of2",
    "filename": "Obstetrics and Gynaecology_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Obs Gynae/Obstetrics and Gynaecology_2of2.mp4",
    "relativePath": "Long Subjects/Obs Gynae/Obstetrics and Gynaecology_2of2.mp4",
    "sizeBytes": 868333895,
    "subjectId": "obgyn",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-7af9a1bf",
    "title": "Surgery 1of2",
    "filename": "Surgery_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Surgery/Surgery_1of2.mp4",
    "relativePath": "Long Subjects/Surgery/Surgery_1of2.mp4",
    "sizeBytes": 1899966741,
    "subjectId": "surgery",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-e5e1bb7d",
    "title": "Surgery 2of2",
    "filename": "Surgery_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Long Subjects/Surgery/Surgery_2of2.mp4",
    "relativePath": "Long Subjects/Surgery/Surgery_2of2.mp4",
    "sizeBytes": 1042602832,
    "subjectId": "surgery",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-275008b2",
    "title": "CVS",
    "filename": "CVS.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/CVS.pdf",
    "relativePath": "Integrated/CVS.pdf",
    "sizeBytes": 32814814,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-ea1a3fd7",
    "title": "Endocrinology",
    "filename": "Endocrinology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Endocrinology.pdf",
    "relativePath": "Integrated/Endocrinology.pdf",
    "sizeBytes": 15533095,
    "subjectId": "medicine",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-572d06a0",
    "title": "General Pathology",
    "filename": "General Pathology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pathology.mp4",
    "relativePath": "Integrated/General Pathology.mp4",
    "sizeBytes": 633429231,
    "subjectId": "pathology",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-6714ca4a",
    "title": "General Pathology",
    "filename": "General Pathology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pathology.pdf",
    "relativePath": "Integrated/General Pathology.pdf",
    "sizeBytes": 1213627,
    "subjectId": "pathology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-e155a836",
    "title": "General Pharmacology",
    "filename": "General Pharmacology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Pharmacology.mp4",
    "relativePath": "Integrated/General Pharmacology.mp4",
    "sizeBytes": 776441884,
    "subjectId": "pharmacology",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-9d78dc9e",
    "title": "General Physiology",
    "filename": "General Physiology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/General Physiology.mp4",
    "relativePath": "Integrated/General Physiology.mp4",
    "sizeBytes": 685353686,
    "subjectId": "physiology",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-dfde6b96",
    "title": "Hematology",
    "filename": "Hematology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Hematology.mp4",
    "relativePath": "Integrated/Hematology.mp4",
    "sizeBytes": 1578733146,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-472f499f",
    "title": "Immunology",
    "filename": "Immunology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Immunology.mp4",
    "relativePath": "Integrated/Immunology.mp4",
    "sizeBytes": 658567691,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-6839882c",
    "title": "Integrated CVS",
    "filename": "Integrated CVS.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated CVS.mp4",
    "relativePath": "Integrated/Integrated CVS.mp4",
    "sizeBytes": 1861518167,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-6d757f72",
    "title": "Integrated Endocrine System",
    "filename": "Integrated Endocrine System.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Endocrine System.mp4",
    "relativePath": "Integrated/Integrated Endocrine System.mp4",
    "sizeBytes": 1079259601,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-5d469fee",
    "title": "Integrated GI   HPB",
    "filename": "Integrated GI - HPB.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated GI - HPB.mp4",
    "relativePath": "Integrated/Integrated GI - HPB.mp4",
    "sizeBytes": 733251408,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-d641a9e7",
    "title": "Integrated Renal Electrolytes",
    "filename": "Integrated Renal-Electrolytes.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Renal-Electrolytes.mp4",
    "relativePath": "Integrated/Integrated Renal-Electrolytes.mp4",
    "sizeBytes": 903561591,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-e544225d",
    "title": "Integrated Respiratory System",
    "filename": "Integrated Respiratory System.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Respiratory System.mp4",
    "relativePath": "Integrated/Integrated Respiratory System.mp4",
    "sizeBytes": 1559232524,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-905c2c78",
    "title": "Integrated Rheumatology intro",
    "filename": "Integrated Rheumatology_intro.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrated Rheumatology_intro.mp4",
    "relativePath": "Integrated/Integrated Rheumatology_intro.mp4",
    "sizeBytes": 524961037,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-e950a90b",
    "title": "Integrative Neurology",
    "filename": "Integrative Neurology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Integrated/Integrative Neurology.mp4",
    "relativePath": "Integrated/Integrative Neurology.mp4",
    "sizeBytes": 1818368065,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-9281c731",
    "title": "Anesthesia",
    "filename": "Anesthesia.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Anesthesia.mp4",
    "relativePath": "Short subjects/Anesthesia.mp4",
    "sizeBytes": 1303956825,
    "subjectId": "anesthesia",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-257ff6cd",
    "title": "Anesthesia",
    "filename": "Anesthesia.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Anesthesia.pdf",
    "relativePath": "Short subjects/Anesthesia.pdf",
    "sizeBytes": 4738855,
    "subjectId": "anesthesia",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-0f833c53",
    "title": "Dermatology",
    "filename": "Dermatology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Dermatology.mp4",
    "relativePath": "Short subjects/Dermatology.mp4",
    "sizeBytes": 1526190736,
    "subjectId": "dermatology",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-0e125611",
    "title": "Dermatology",
    "filename": "Dermatology.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Dermatology.pdf",
    "relativePath": "Short subjects/Dermatology.pdf",
    "sizeBytes": 49807506,
    "subjectId": "dermatology",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-46a3a154",
    "title": "ENT",
    "filename": "ENT.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT.pdf",
    "relativePath": "Short subjects/ENT.pdf",
    "sizeBytes": 5579155,
    "subjectId": "ent",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-11115309",
    "title": "FMT",
    "filename": "FMT.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT.pdf",
    "relativePath": "Short subjects/FMT.pdf",
    "sizeBytes": 31317545,
    "subjectId": "fmt",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-6257df34",
    "title": "Psychiatry",
    "filename": "Psychiatry.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Psychiatry.mp4",
    "relativePath": "Short subjects/Psychiatry.mp4",
    "sizeBytes": 1301486198,
    "subjectId": "psychiatry",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-f1329834",
    "title": "Radiology",
    "filename": "Radiology.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Radiology.mp4",
    "relativePath": "Short subjects/Radiology.mp4",
    "sizeBytes": 1824981076,
    "subjectId": "radiology",
    "kind": "video",
    "lectureNumber": 4
  },
  {
    "id": "btr-f7c0997a",
    "title": "ENT 1of2",
    "filename": "ENT_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT/ENT_1of2.mp4",
    "relativePath": "Short subjects/ENT/ENT_1of2.mp4",
    "sizeBytes": 1899944971,
    "subjectId": "ent",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-7f7967f9",
    "title": "ENT 2of2",
    "filename": "ENT_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/ENT/ENT_2of2.mp4",
    "relativePath": "Short subjects/ENT/ENT_2of2.mp4",
    "sizeBytes": 355127329,
    "subjectId": "ent",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-16f8cd34",
    "title": "Forensic Medicine 1of2",
    "filename": "Forensic Medicine_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT/Forensic Medicine_1of2.mp4",
    "relativePath": "Short subjects/FMT/Forensic Medicine_1of2.mp4",
    "sizeBytes": 1899836228,
    "subjectId": "fmt",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-5f0ee823",
    "title": "Forensic Medicine 2of2",
    "filename": "Forensic Medicine_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/FMT/Forensic Medicine_2of2.mp4",
    "relativePath": "Short subjects/FMT/Forensic Medicine_2of2.mp4",
    "sizeBytes": 65104826,
    "subjectId": "fmt",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-83b664db",
    "title": "Orthopedics 1of2",
    "filename": "Orthopedics_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Ortho/Orthopedics_1of2.mp4",
    "relativePath": "Short subjects/Ortho/Orthopedics_1of2.mp4",
    "sizeBytes": 1899613485,
    "subjectId": "orthopedics",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-493b43b8",
    "title": "Orthopedics 2of2",
    "filename": "Orthopedics_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/Ortho/Orthopedics_2of2.mp4",
    "relativePath": "Short subjects/Ortho/Orthopedics_2of2.mp4",
    "sizeBytes": 43372388,
    "subjectId": "orthopedics",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-66a4b860",
    "title": "Ophthalmology 1of2",
    "filename": "Ophthalmology_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/OPHTHA/Ophthalmology_1of2.mp4",
    "relativePath": "Short subjects/OPHTHA/Ophthalmology_1of2.mp4",
    "sizeBytes": 1899749896,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-9677739d",
    "title": "Ophthalmology 2of2",
    "filename": "Ophthalmology_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Short subjects/OPHTHA/Ophthalmology_2of2.mp4",
    "relativePath": "Short subjects/OPHTHA/Ophthalmology_2of2.mp4",
    "sizeBytes": 227141050,
    "subjectId": "medicine",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-7cff795e",
    "title": "Anatomy",
    "filename": "Anatomy.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy.pdf",
    "relativePath": "Intermediate sub/Anatomy.pdf",
    "sizeBytes": 17359117,
    "subjectId": "anatomy",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-89a2dca5",
    "title": "Biochemistry",
    "filename": "Biochemistry.pdf",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry.pdf",
    "relativePath": "Intermediate sub/Biochemistry.pdf",
    "sizeBytes": 9915495,
    "subjectId": "biochemistry",
    "kind": "pdf_annotated"
  },
  {
    "id": "btr-8edd0bef",
    "title": "Anatomy 1of2",
    "filename": "Anatomy_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy/Anatomy_1of2.mp4",
    "relativePath": "Intermediate sub/Anatomy/Anatomy_1of2.mp4",
    "sizeBytes": 1899980322,
    "subjectId": "anatomy",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-ee80d4cf",
    "title": "Anatomy 2of2",
    "filename": "Anatomy_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy/Anatomy_2of2.mp4",
    "relativePath": "Intermediate sub/Anatomy/Anatomy_2of2.mp4",
    "sizeBytes": 840414923,
    "subjectId": "anatomy",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-28068ce0",
    "title": "Pediatrics part01 intro",
    "filename": "Pediatrics_part01_intro.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Paedia/Pediatrics_part01_intro.mp4",
    "relativePath": "Intermediate sub/Paedia/Pediatrics_part01_intro.mp4",
    "sizeBytes": 1043119188,
    "subjectId": "pediatrics",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-3599646e",
    "title": "Pediatrics part02 intro",
    "filename": "Pediatrics_part02_intro.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Paedia/Pediatrics_part02_intro.mp4",
    "relativePath": "Intermediate sub/Paedia/Pediatrics_part02_intro.mp4",
    "sizeBytes": 1138508938,
    "subjectId": "pediatrics",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-d85ed489",
    "title": "Biochemistry 1of2",
    "filename": "Biochemistry_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry/Biochemistry_1of2.mp4",
    "relativePath": "Intermediate sub/Biochemistry/Biochemistry_1of2.mp4",
    "sizeBytes": 1899985300,
    "subjectId": "biochemistry",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-9879e241",
    "title": "Biochemistry 2of2",
    "filename": "Biochemistry_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/Biochemistry/Biochemistry_2of2.mp4",
    "relativePath": "Intermediate sub/Biochemistry/Biochemistry_2of2.mp4",
    "sizeBytes": 178725834,
    "subjectId": "biochemistry",
    "kind": "video",
    "lectureNumber": 2
  },
  {
    "id": "btr-d5cecf1c",
    "title": "Microbiology 1of2",
    "filename": "Microbiology_1of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/mircobiology/Microbiology_1of2.mp4",
    "relativePath": "Intermediate sub/mircobiology/Microbiology_1of2.mp4",
    "sizeBytes": 1899700846,
    "subjectId": "microbiology",
    "kind": "video",
    "lectureNumber": 1
  },
  {
    "id": "btr-4c235137",
    "title": "Microbiology 2of2",
    "filename": "Microbiology_2of2.mp4",
    "fullPath": "/Users/anupam/Downloads/BTR/Intermediate sub/mircobiology/Microbiology_2of2.mp4",
    "relativePath": "Intermediate sub/mircobiology/Microbiology_2of2.mp4",
    "sizeBytes": 918667892,
    "subjectId": "microbiology",
    "kind": "video",
    "lectureNumber": 2
  }
]
};
