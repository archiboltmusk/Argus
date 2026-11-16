/**
 * Argus Academic Courseware & Lecture Engine
 *
 * Designed for world-class university courseware:
 * - Stanford University (CS224W, CS229)
 * - MIT OpenCourseWare (18.06 Linear Algebra, 6.006 Algorithms)
 * - Harvard University (CS50x)
 * - Caltech (The Feynman Lectures on Physics)
 *
 * Features:
 * 1. Syllabus Hierarchy: Course -> Lectures -> Timestamped Concepts -> Synchronized Transcripts
 * 2. Course-Level Resume: Direct "Continue Lecture X at MM:SS" with 5s cognitive rewind
 * 3. Audio-Only Focus Mode: Toggles libmpv video track off for low-power paper reading
 * 4. Lecture Speed Optimization: 1.25x - 1.75x via scaletempo2 with pitch correction
 * 5. Concept Bookmark Journal: Timestamped derivations, LaTeX proofs, and key takeaways
 */

export interface ConceptNote {
  timestampSec: number;
  title: string;
  note: string;
  latex?: string;
}

export interface TranscriptCue {
  startSec: number;
  endSec: number;
  text: string;
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
  transcript?: TranscriptCue[];
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
  badgeAccent?: string;
}

export const CURATED_UNIVERSITY_COURSES: UniversityCourse[] = [
  {
    id: "mit-1806-linear-algebra",
    title: "18.06: Linear Algebra",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Gilbert Strang",
    playlistUrl: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
    academicTerm: "Spring 2010 / Classic",
    description: "The definitive mathematical foundation of modern computer science and deep learning: four fundamental subspaces, orthogonal projections, eigenvalues, eigenvectors, positive definite matrices, and Singular Value Decomposition (SVD).",
    activeLectureIndex: 0,
    badgeAccent: "#f59e0b", // Warm Amber
    lectures: [
      {
        id: "mit-1806-l1",
        lectureNumber: 1,
        title: "Lecture 1: The Geometry of Linear Equations & Column Picture",
        durationSec: 2390,
        videoUrl: "https://www.youtube.com/watch?v=J7DzL2_Na80",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 360,
            title: "Row Picture vs Column Picture",
            note: "The row picture intersects hyperplanes; the column picture finds linear combinations of column vectors that hit the target vector b: Ax = b.",
            latex: "A x = x_1 \\mathbf{a}_1 + x_2 \\mathbf{a}_2 + \\dots + x_n \\mathbf{a}_n = \\mathbf{b}",
          },
          {
            timestampSec: 1320,
            title: "Matrix Multiplication as Column Combinations",
            note: "Multiplying A by vector x is a linear combination of the columns of A with weights from x.",
            latex: "\\begin{bmatrix} 2 & 5 \\\\ 1 & 3 \\end{bmatrix} \\begin{bmatrix} u \\\\ v \\end{bmatrix} = u \\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix} + v \\begin{bmatrix} 5 \\\\ 3 \\end{bmatrix}",
          },
        ],
        transcript: [
          { startSec: 0, endSec: 25, text: "Okay, this is the opening lecture in MIT's course 18.06, Linear Algebra." },
          { startSec: 26, endSec: 58, text: "And I'm Gilbert Strang. The fundamental problem of linear algebra is to solve a system of linear equations." },
          { startSec: 59, endSec: 120, text: "So let's start with two equations and two unknowns: 2x - y = 0 and -x + 2y = 3." },
          { startSec: 121, endSec: 210, text: "First is the row picture, which everyone knows. Two lines meeting at a point x = 1, y = 2." },
          { startSec: 211, endSec: 340, text: "Now the column picture. Look at the columns: x times (2, -1) plus y times (-1, 2) equals (0, 3)." },
          { startSec: 341, endSec: 480, text: "We are combining the column vectors. That is the fundamental operation of linear algebra." },
        ],
      },
      {
        id: "mit-1806-l14",
        lectureNumber: 14,
        title: "Lecture 14: Orthogonal Vectors and Projections onto Subspaces",
        durationSec: 2850,
        videoUrl: "https://www.youtube.com/watch?v=Y_Ac6KiQ1t0",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 720,
            title: "Projection Matrix Formula",
            note: "Projection matrix P projects any vector b onto the column space of A. If A has independent columns, P = A(A^T A)^(-1) A^T.",
            latex: "P = A (A^T A)^{-1} A^T, \\quad P^2 = P, \\quad P^T = P",
          },
          {
            timestampSec: 1800,
            title: "Least Squares Normal Equations",
            note: "When Ax = b has no solution, we solve A^T A x_hat = A^T b to minimize ||Ax - b||^2.",
            latex: "A^T A \\hat{\\mathbf{x}} = A^T \\mathbf{b}",
          },
        ],
      },
      {
        id: "mit-1806-l29",
        lectureNumber: 29,
        title: "Lecture 29: Singular Value Decomposition (SVD)",
        durationSec: 3040,
        videoUrl: "https://www.youtube.com/watch?v=mBcLRGuAFUk",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 600,
            title: "SVD Theorem: A = U Sigma V^T",
            note: "Any m x n matrix factors into orthonormal basis U (left singular vectors), diagonal matrix Sigma (singular values), and orthonormal basis V^T.",
            latex: "A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T",
          },
        ],
      },
    ],
  },
  {
    id: "harvard-cs50x",
    title: "CS50x: Introduction to Computer Science",
    institution: "Harvard University",
    instructor: "Prof. David J. Malan",
    playlistUrl: "https://cs50.harvard.edu/x/",
    academicTerm: "Current / Continuous",
    description: "An intellectual enterprise in computer science and the art of programming: computational thinking, algorithmic efficiency, memory allocation, data structures, low-level C pointers, and web architecture.",
    activeLectureIndex: 0,
    badgeAccent: "#ef4444", // Crimson
    lectures: [
      {
        id: "cs50-l1",
        lectureNumber: 1,
        title: "Lecture 1: Computational Thinking, C & Memory Basics",
        durationSec: 5700,
        videoUrl: "https://www.youtube.com/watch?v=3Pr0F1_aU0M",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1200,
            title: "Binary & ASCII Representation",
            note: "Computers only store switches (bits 0 and 1). Context determines whether bits represent integers, ASCII chars, or IEEE floating points.",
            latex: "N = \\sum_{i=0}^{k-1} b_i 2^i",
          },
        ],
        transcript: [
          { startSec: 0, endSec: 40, text: "This is CS50, Harvard University's introduction to the intellectual enterprises of computer science." },
          { startSec: 41, endSec: 95, text: "What matters in this course is not so much where you end up relative to your peers, but where you end up relative to yourself." },
          { startSec: 96, endSec: 180, text: "At its core, computer science is about problem solving. We take an input, process it with an algorithm, and yield an output." },
        ],
      },
      {
        id: "cs50-l4",
        lectureNumber: 4,
        title: "Lecture 4: Memory, Pointers, and Heap Allocation",
        durationSec: 6100,
        videoUrl: "https://www.youtube.com/watch?v=FzpA36wVpVE",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 900,
            title: "Pointers as Hexadecimal Addresses",
            note: "A pointer is a variable that stores the memory address of another variable (& operator gets address, * dereferences).",
            latex: "\\text{int } n = 50; \\quad \\text{int } *p = \\&n;",
          },
          {
            timestampSec: 2400,
            title: "Heap vs Stack Memory Segmentation",
            note: "Stack allocates local function frames automatically; malloc allocates raw chunks on the heap requiring manual free().",
          },
        ],
      },
    ],
  },
  {
    id: "mit-6006-algorithms",
    title: "6.006: Introduction to Algorithms",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Erik Demaine & Prof. Srini Devadas",
    playlistUrl: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
    academicTerm: "Fall 2011",
    description: "Algorithmic thinking with mathematical rigor: asymptotic notation, divide & conquer, balanced binary search trees (AVL), hashing, shortest paths (Dijkstra, Bellman-Ford), and dynamic programming.",
    activeLectureIndex: 0,
    badgeAccent: "#10b981", // Emerald
    lectures: [
      {
        id: "mit-6006-l1",
        lectureNumber: 1,
        title: "Lecture 1: Algorithmic Thinking & Peak Finding",
        durationSec: 3060,
        videoUrl: "https://www.youtube.com/watch?v=HtSuA80QTyo",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 480,
            title: "1D Peak Finding: O(n) vs O(log n)",
            note: "Binary search divide-and-conquer on array halves reduces worst-case comparisons from Theta(n) to Theta(log n).",
            latex: "T(n) = T(n/2) + \\Theta(1) \\implies T(n) = \\Theta(\\log n)",
          },
        ],
      },
      {
        id: "mit-6006-l19",
        lectureNumber: 19,
        title: "Lecture 19: Dynamic Programming I: Fibonacci, Shortest Paths",
        durationSec: 3180,
        videoUrl: "https://www.youtube.com/watch?v=OQ5jsbhAv_M",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 720,
            title: "DP Paradigm: Memoization & Subproblems",
            note: "Dynamic Programming = recursion + memoization + guessing. Total time = (number of subproblems) x (time per subproblem).",
            latex: "\\text{Time} = |\\text{Subproblems}| \\times \\text{Work per Subproblem}",
          },
        ],
      },
    ],
  },
  {
    id: "caltech-feynman-physics",
    title: "The Feynman Lectures on Physics",
    institution: "California Institute of Technology",
    instructor: "Prof. Richard Feynman",
    playlistUrl: "https://www.feynmanlectures.caltech.edu/",
    academicTerm: "Historic Masterwork",
    description: "The legendary Caltech physics sequence: atoms in motion, conservation of energy, gravitation, spacetime geometry, thermodynamics, and quantum mechanical wave-particle duality delivered with Feynman's unmatched intuition.",
    activeLectureIndex: 0,
    badgeAccent: "#38bdf8", // Sky Cyan
    lectures: [
      {
        id: "feynman-l1",
        lectureNumber: 1,
        title: "Lecture 1: Atoms in Motion & The Atomic Hypothesis",
        durationSec: 3120,
        videoUrl: "https://www.youtube.com/watch?v=P1ww1IXRfTA",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 450,
            title: "The Atomic Hypothesis Axiom",
            note: "All things are made of atoms—little particles that move around in perpetual motion, attracting each other when a little distance apart, but repelling upon being squeezed.",
          },
        ],
      },
      {
        id: "feynman-l37",
        lectureNumber: 37,
        title: "Lecture 37: Quantum Behavior & Two-Slit Experiment",
        durationSec: 3450,
        videoUrl: "https://www.youtube.com/watch?v=hUJfjR427lI",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 900,
            title: "Probability Amplitudes & Interference",
            note: "In quantum mechanics, probabilities are squares of complex amplitudes: P = |phi_1 + phi_2|^2 = P_1 + P_2 + 2 Re(phi_1^* phi_2).",
            latex: "P_{12} = |\\phi_1 + \\phi_2|^2 = P_1 + P_2 + 2 \\sqrt{P_1 P_2} \\cos(\\delta)",
          },
        ],
      },
    ],
  },
  {
    id: "stanford-cs224w-gnn",
    title: "CS224W: Machine Learning with Graphs",
    institution: "Stanford University",
    instructor: "Prof. Jure Leskovec",
    playlistUrl: "https://www.youtube.com/playlist?list=PLoROMvodv4rPLKxIpqhCS56QG8Yj53Jtu",
    academicTerm: "Autumn 2021",
    description: "Deep dive into representation learning for networks: Graph Convolutional Networks (GCN), GraphSAGE, Graph Attention Networks (GAT), knowledge graph embeddings, and drug discovery applications.",
    activeLectureIndex: 0,
    badgeAccent: "#a855f7", // Purple
    lectures: [
      {
        id: "cs224w-l1",
        lectureNumber: 1,
        title: "Lecture 1: Introduction to Graph ML & Network Properties",
        durationSec: 4620,
        videoUrl: "https://www.youtube.com/watch?v=JAB_plj2iks",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          { timestampSec: 720, title: "Node & Edge Representation", note: "Adjacency matrices vs edge lists in sparse graphs." },
          { timestampSec: 2100, title: "Degree Distribution & Paths", note: "Small-world effect and clustering coefficients." },
        ],
      },
      {
        id: "cs224w-l6",
        lectureNumber: 6,
        title: "Lecture 6: Graph Neural Networks & Graph Convolution (GCN)",
        durationSec: 5100,
        videoUrl: "https://www.youtube.com/watch?v=0qF1_jWkO4w",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1200,
            title: "Neighborhood Aggregation Derivation",
            note: "Message passing update rule: h_v^(k) = AGG({h_u^(k-1), u in N(v)}).",
            latex: "\\mathbf{h}_v^{(k)} = \\sigma \\left( \\mathbf{W}^{(k)} \\sum_{u \\in \\mathcal{N}(v)} \\frac{\\mathbf{h}_u^{(k-1)}}{|\\mathcal{N}(v)|} + \\mathbf{B}^{(k)} \\mathbf{h}_v^{(k-1)} \\right)",
          },
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
    badgeAccent: "#ec4899", // Rose Pink
    lectures: [
      {
        id: "cs229-l1",
        lectureNumber: 1,
        title: "Lecture 1: Introduction, Linear Regression & Gradient Descent",
        durationSec: 4500,
        videoUrl: "https://www.youtube.com/watch?v=4b4MUYve_U8",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 900,
            title: "Batch Gradient Descent Update Rule",
            note: "Iterative parameter adjustment along negative gradient of cost function J(theta).",
            latex: "\\theta_j := \\theta_j - \\alpha \\frac{\\partial}{\\partial \\theta_j} J(\\theta)",
          },
        ],
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
    for (const c of CURATED_UNIVERSITY_COURSES) {
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
