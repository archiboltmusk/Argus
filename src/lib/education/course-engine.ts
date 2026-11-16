/**
 * Argus Academic Courseware & Lecture Engine
 *
 * Designed for university courses (Stanford CS224W, MIT OpenCourseWare, Harvard CS50):
 * 1. Syllabus Hierarchy: Course -> Lectures -> Timestamped Concepts
 * 2. Course-Level Resume: Direct "Continue Lecture X at MM:SS" without browsing playlists
 * 3. Audio-Only Focus Mode: Toggles libmpv video track off for low-power paper reading
 * 4. Lecture Speed Optimization: 1.25x - 1.75x via scaletempo2 with pitch correction
 * 5. Concept Bookmark Journal: Local timestamped derivations and key takeaways
 */

export interface ConceptNote {
  timestampSec: number;
  title: string;
  note: string;
}

export interface CourseLecture {
  id: string;
  lectureNumber: number;
  title: string;
  durationSec: number;
  videoUrl: string;
  completed: boolean;
  lastPositionSec: number;
  conceptNotes: ConceptNote[];
}

export interface UniversityCourse {
  id: string;
  title: string;
  institution: string;
  instructor: string;
  playlistUrl: string;
  academicTerm: string;
  description: string;
  lectures: CourseLecture[];
  activeLectureIndex: number;
}

export const CURATED_STANFORD_COURSES: UniversityCourse[] = [
  {
    id: "stanford-cs224w-gnn",
    title: "CS224W: Machine Learning with Graphs",
    institution: "Stanford University",
    instructor: "Prof. Jure Leskovec",
    playlistUrl: "https://www.youtube.com/playlist?list=PLoROMvodv4rPLKxIpqhCS56QG8Yj53Jtu",
    academicTerm: "Autumn 2021 / Recent",
    description: "Deep dive into representation learning for networks: Graph Convolutional Networks (GCN), GraphSAGE, Graph Attention Networks (GAT), knowledge graph embeddings, and drug discovery applications.",
    activeLectureIndex: 0,
    lectures: [
      {
        id: "cs224w-l1",
        lectureNumber: 1,
        title: "Lecture 1: Introduction to Graph ML & Network Properties",
        durationSec: 4620, // 1h 17m
        videoUrl: "https://www.youtube.com/watch?v=JAB_plj2iks",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          { timestampSec: 720, title: "Node & Edge Representation", note: "Adjacency matrices vs edge lists in sparse graphs." },
          { timestampSec: 2100, title: "Degree Distribution & Paths", note: "Small-world effect and clustering coefficients." },
        ],
      },
      {
        id: "cs224w-l2",
        lectureNumber: 2,
        title: "Lecture 2: Traditional Feature-Based ML for Graphs",
        durationSec: 4380, // 1h 13m
        videoUrl: "https://www.youtube.com/watch?v=3IS7UhNkfPA",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          { timestampSec: 900, title: "Node Centrality & PageRank", note: "Eigenvector centrality, betweenness, and random walk formulations." },
        ],
      },
      {
        id: "cs224w-l6",
        lectureNumber: 6,
        title: "Lecture 6: Graph Neural Networks & Graph Convolution (GCN)",
        durationSec: 5100, // 1h 25m
        videoUrl: "https://www.youtube.com/watch?v=0qF1_jWkO4w",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          { timestampSec: 1200, title: "Neighborhood Aggregation Derivation", note: "Message passing update rule: h_v^(k) = AGG({h_u^(k-1), u in N(v)})." },
          { timestampSec: 2700, title: "GraphSAGE Mean & Max Pooling Aggregators", note: "Inductive node representation learning." },
        ],
      },
    ],
  },
  {
    id: "stanford-cs229-ml",
    title: "CS229: Machine Learning",
    institution: "Stanford University",
    instructor: "Prof. Andrew Ng",
    playlistUrl: "https://www.youtube.com/playlist?list=FX6tL5tW-E",
    academicTerm: "Foundational",
    description: "The classic foundational course on supervised and unsupervised learning, loss surfaces, gradient descent, SVMs, and kernel methods.",
    activeLectureIndex: 0,
    lectures: [
      {
        id: "cs229-l1",
        lectureNumber: 1,
        title: "Lecture 1: Introduction, Linear Regression & Gradient Descent",
        durationSec: 4500,
        videoUrl: "https://www.youtube.com/watch?v=4b4MUYve_U8",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [],
      },
    ],
  },
];

const STORAGE_COURSES_KEY = "argus.courses.store";

export class CoursewareEngine {
  private courses: Map<string, UniversityCourse> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    for (const c of CURATED_STANFORD_COURSES) {
      this.courses.set(c.id, c);
    }

    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        const raw = localStorage.getItem(STORAGE_COURSES_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as UniversityCourse[];
          for (const c of stored) {
            this.courses.set(c.id, c);
          }
        }
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        localStorage.setItem(STORAGE_COURSES_KEY, JSON.stringify(Array.from(this.courses.values())));
      }
    } catch {}
  }

  public getAllCourses(): UniversityCourse[] {
    return Array.from(this.courses.values());
  }

  public getCourse(courseId: string): UniversityCourse | undefined {
    return this.courses.get(courseId);
  }

  /**
   * Updates playback progress for a specific lecture, auto-advancing
   * active lecture pointer if the user completed >= 90% of the lecture.
   */
  public updateLectureProgress(
    courseId: string,
    lectureId: string,
    positionSec: number
  ): void {
    const course = this.courses.get(courseId);
    if (!course) return;

    const lectureIndex = course.lectures.findIndex((l) => l.id === lectureId);
    if (lectureIndex === -1) return;

    const lecture = course.lectures[lectureIndex];
    lecture.lastPositionSec = positionSec;

    // Completed if past 90%
    if (lecture.durationSec > 0 && positionSec / lecture.durationSec >= 0.9) {
      lecture.completed = true;
      if (lectureIndex + 1 < course.lectures.length) {
        course.activeLectureIndex = lectureIndex + 1;
      }
    } else {
      course.activeLectureIndex = lectureIndex;
    }

    this.saveState();
  }

  /**
   * Returns the exact continuation target for a course.
   */
  public getCourseResumeTarget(courseId: string): {
    course: UniversityCourse;
    lecture: CourseLecture;
    resumeSec: number;
  } | null {
    const course = this.courses.get(courseId);
    if (!course || course.lectures.length === 0) return null;

    const activeLecture = course.lectures[course.activeLectureIndex] || course.lectures[0];
    // Apply 5-second cognitive rewind
    const resumeSec = Math.max(0, activeLecture.lastPositionSec - 5);

    return {
      course,
      lecture: activeLecture,
      resumeSec,
    };
  }

  /**
   * Adds a timestamped concept note to a lecture
   */
  public addConceptNote(courseId: string, lectureId: string, note: ConceptNote): void {
    const course = this.courses.get(courseId);
    if (!course) return;

    const lecture = course.lectures.find((l) => l.id === lectureId);
    if (!lecture) return;

    lecture.conceptNotes.push(note);
    lecture.conceptNotes.sort((a, b) => a.timestampSec - b.timestampSec);
    this.saveState();
  }
}

export const coursewareEngine = new CoursewareEngine();
