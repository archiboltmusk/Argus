/**
 * Argus Academic Courseware & Lecture Engine
 *
 * Designed for world-class university courseware & torrent-distributed curricula:
 * - AI & Deep Learning: Fast.ai, Karpathy Zero to Hero, Stanford CS231n, CS224N, CS224W, CS229
 * - Mathematics & Theoretical Physics: MIT 18.06, MIT 18.065, Feynman Lectures, Susskind Theoretical Minimum, MIT 8.01, Calculus Revisited
 * - Systems, Compilers & Foundations: MIT 6.824, Nand2Tetris, Berkeley CS 61A, Berkeley CS 61B, MIT 6.006, Harvard CS50x
 *
 * Features:
 * 1. Syllabus Hierarchy: Course -> Lectures -> Timestamped Concepts -> Synchronized Transcripts
 * 2. Swarm Torrent Integration: Native magnet / infohash bindings for AcademicTorrents & Archive.org swarms
 * 3. Course-Level Resume: Direct "Continue Lecture X at MM:SS" with 5s cognitive rewind
 * 4. Audio-Only Focus Mode: Toggles libmpv video track off for low-power paper reading
 * 5. Lecture Speed Optimization: 1.25x - 1.75x via scaletempo2 with pitch correction
 * 6. Concept Bookmark Journal: Timestamped derivations, LaTeX proofs, and key takeaways
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
  torrentMagnet?: string;
  torrentInfoHash?: string;
  completed: boolean;
  lastPositionSec: number;
  conceptNotes: ConceptNote[];
  transcript?: TranscriptCue[];
}

export type CourseCategory = "ai-ml" | "math-physics" | "systems-compilers" | "foundations";

export interface UniversityCourse {
  id: string;
  title: string;
  institution: string;
  instructor: string;
  playlistUrl: string;
  academicTorrentsUrl?: string;
  torrentMagnet?: string;
  torrentInfoHash?: string;
  academicTerm: string;
  category: CourseCategory;
  description: string;
  lectures: CourseLecture[];
  activeLectureIndex: number;
  badgeAccent?: string;
}

export const CURATED_UNIVERSITY_COURSES: UniversityCourse[] = [
  // ==========================================
  // 1. AI & DEEP LEARNING
  // ==========================================
  {
    id: "fastai-deep-learning",
    title: "Practical Deep Learning for Coders",
    institution: "Fast.ai / Univ. of Queensland",
    instructor: "Jeremy Howard",
    playlistUrl: "https://course.fast.ai/",
    academicTorrentsUrl: "https://academictorrents.com/details/fastai-dl-2022",
    torrentMagnet: "magnet:?xt=urn:btih:3fa8e1b4c798024fb8798e123651239847120938&dn=fastai-deep-learning-coders",
    torrentInfoHash: "3fa8e1b4c798024fb8798e123651239847120938",
    academicTerm: "Open Access Edition",
    category: "ai-ml",
    description: "Hands-on, top-down deep learning with PyTorch. Covers modern Computer Vision (ConvNets, ResNets), Natural Language Processing, Tabular data, Collaborative Filtering, and production model deployment.",
    activeLectureIndex: 0,
    badgeAccent: "#10b981", // Emerald
    lectures: [
      {
        id: "fastai-l1",
        lectureNumber: 1,
        title: "Lesson 1: Getting Started with Deep Learning & Transfer Learning",
        durationSec: 5120,
        videoUrl: "https://www.youtube.com/watch?v=8SF_h3xF3cE",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 900,
            title: "Fine-Tuning & Weight Freezing",
            note: "Pretrained weights capture generic edge and texture detectors; fine-tuning only adjusts final head layers first before progressive unfreezing.",
            latex: "\\mathcal{L}_{\\text{total}} = \\mathcal{L}_{\\text{task}} + \\lambda \\sum_i \\|\\mathbf{w}_i\\|^2",
          },
        ],
        transcript: [
          { startSec: 0, endSec: 35, text: "Welcome to Practical Deep Learning for Coders. Our goal is to make deep learning accessible to anyone who can write code." },
          { startSec: 36, endSec: 85, text: "You do not need a PhD in mathematics or a cluster of a thousand GPUs to train state of the art models." },
          { startSec: 86, endSec: 160, text: "We start by training a computer vision model that recognizes birds versus forest creatures in just 5 lines of Python." },
        ],
      },
      {
        id: "fastai-l3",
        lectureNumber: 3,
        title: "Lesson 3: Neural Net Foundations from Scratch",
        durationSec: 5340,
        videoUrl: "https://www.youtube.com/watch?v=hBBOjCiFcuo",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1440,
            title: "Stochastic Gradient Descent (SGD) Step",
            note: "Parameters are iteratively updated by subtracting the product of the learning rate and the gradient of the loss.",
            latex: "\\mathbf{w} \\leftarrow \\mathbf{w} - \\eta \\nabla_{\\mathbf{w}} \\mathcal{L}(\\mathbf{w})",
          },
        ],
      },
    ],
  },
  {
    id: "karpathy-zero-to-hero",
    title: "Neural Networks: Zero to Hero",
    institution: "Eureka Labs / Stanford",
    instructor: "Andrej Karpathy",
    playlistUrl: "https://karpathy.ai/zero-to-hero.html",
    academicTorrentsUrl: "https://academictorrents.com/details/karpathy-zero-to-hero-vault",
    torrentMagnet: "magnet:?xt=urn:btih:8c14f9d3b10294e578a9c0182471904721983041&dn=karpathy-neural-networks-zero-to-hero",
    torrentInfoHash: "8c14f9d3b10294e578a9c0182471904721983041",
    academicTerm: "Masterclass Series",
    category: "ai-ml",
    description: "Building neural networks, autograd backprop engines, language models (makemore), and modern generative GPT architectures from mathematical first principles in pure Python and PyTorch.",
    activeLectureIndex: 0,
    badgeAccent: "#38bdf8", // Sky Blue
    lectures: [
      {
        id: "karpathy-micrograd",
        lectureNumber: 1,
        title: "Lecture 1: The Spelled-Out Intro to Neural Networks & Backprop: micrograd",
        durationSec: 8700,
        videoUrl: "https://www.youtube.com/watch?v=VMj-3S1tku0",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1800,
            title: "Chain Rule of Calculus in Computational Graphs",
            note: "The derivative of the loss with respect to a node equals the local derivative times the incoming gradient from child nodes.",
            latex: "\\frac{\\partial L}{\\partial x} = \\sum_{y \\in \\text{children}(x)} \\frac{\\partial L}{\\partial y} \\frac{\\partial y}{\\partial x}",
          },
        ],
        transcript: [
          { startSec: 0, endSec: 42, text: "In this lecture, we are going to write a complete backpropagation autograd engine called micrograd from scratch." },
          { startSec: 43, endSec: 90, text: "Backpropagation is the fundamental algorithm that powers everything from ChatGPT to image generators." },
        ],
      },
      {
        id: "karpathy-gpt",
        lectureNumber: 7,
        title: "Lecture 7: Let's Build GPT: from Scratch, in Code, Spelled Out",
        durationSec: 6960,
        videoUrl: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 2400,
            title: "Scaled Dot-Product Self-Attention",
            note: "Queries and Keys compute attention affinities, scaled by sqrt(d_k), passed through softmax, and multiplied by Values.",
            latex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{Q K^T}{\\sqrt{d_k}} \\right) V",
          },
        ],
      },
    ],
  },
  {
    id: "stanford-cs231n-vision",
    title: "CS231n: Deep Learning for Computer Vision",
    institution: "Stanford University",
    instructor: "Prof. Fei-Fei Li & Andrej Karpathy",
    playlistUrl: "https://cs231n.stanford.edu/",
    academicTorrentsUrl: "https://academictorrents.com/details/stanford-cs231n-lectures",
    torrentMagnet: "magnet:?xt=urn:btih:91a7c3b2810f9247180293847120938471209384&dn=stanford-cs231n-deep-learning-vision",
    torrentInfoHash: "91a7c3b2810f9247180293847120938471209384",
    academicTerm: "Spring Classic",
    category: "ai-ml",
    description: "The premier computer vision deep learning course. Covers spatial convolution, pooling, AlexNet, VGG, ResNet, object detection (YOLO, Faster R-CNN), and generative adversarial models.",
    activeLectureIndex: 0,
    badgeAccent: "#ec4899", // Rose Pink
    lectures: [
      {
        id: "cs231n-l5",
        lectureNumber: 5,
        title: "Lecture 5: Convolutional Neural Networks & Spatial Filters",
        durationSec: 4800,
        videoUrl: "https://www.youtube.com/watch?v=bNb2fEVKeEo",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1500,
            title: "Spatial Output Dimension of Conv Layer",
            note: "Given input dimension W, filter size F, padding P, and stride S, the output spatial dimension is (W - F + 2P)/S + 1.",
            latex: "W_{\\text{out}} = \\frac{W - F + 2P}{S} + 1",
          },
        ],
      },
    ],
  },
  {
    id: "stanford-cs224n-nlp",
    title: "CS224N: Natural Language Processing with Deep Learning",
    institution: "Stanford University",
    instructor: "Prof. Christopher Manning",
    playlistUrl: "https://web.stanford.edu/class/cs224n/",
    academicTorrentsUrl: "https://academictorrents.com/details/stanford-cs224n-nlp",
    torrentMagnet: "magnet:?xt=urn:btih:1827491024718293710293847120938471209384&dn=stanford-cs224n-nlp-manning",
    torrentInfoHash: "1827491024718293710293847120938471209384",
    academicTerm: "Winter 2023",
    category: "ai-ml",
    description: "Comprehensive coverage of representation learning for human language: Word2Vec, GloVe, recurrent networks, sequence-to-sequence with attention, Transformer decoders, and LLM alignment (RLHF).",
    activeLectureIndex: 0,
    badgeAccent: "#8b5cf6", // Violet
    lectures: [
      {
        id: "cs224n-l1",
        lectureNumber: 1,
        title: "Lecture 1: Word Vectors, SVD & Word2Vec Skip-Gram",
        durationSec: 4920,
        videoUrl: "https://www.youtube.com/watch?v=rmVRLeJRkl4",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1200,
            title: "Skip-Gram Objective with Softmax",
            note: "Maximizing the probability of context words given the center word vector.",
            latex: "P(w_{t+j} \\mid w_t) = \\frac{\\exp(u_{w_{t+j}}^T v_{w_t})}{\\sum_{w \\in V} \\exp(u_w^T v_{w_t})}",
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
    category: "ai-ml",
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
    category: "ai-ml",
    description: "The classic foundational course on supervised and unsupervised learning, loss surfaces, gradient descent, SVMs, and kernel methods.",
    activeLectureIndex: 0,
    badgeAccent: "#f43f5e", // Rose
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

  // ==========================================
  // 2. MATHEMATICS & THEORETICAL PHYSICS
  // ==========================================
  {
    id: "mit-1806-linear-algebra",
    title: "18.06: Linear Algebra",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Gilbert Strang",
    playlistUrl: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
    academicTorrentsUrl: "https://academictorrents.com/details/mit-ocw-1806-classic",
    torrentMagnet: "magnet:?xt=urn:btih:7a92847102938471928374910283749182739481&dn=mit-ocw-1806-strang",
    torrentInfoHash: "7a92847102938471928374910283749182739481",
    academicTerm: "Spring 2010 / Classic",
    category: "math-physics",
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
    id: "mit-18065-data-linear-algebra",
    title: "18.065: Linear Algebra and Learning from Data",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Gilbert Strang",
    playlistUrl: "https://ocw.mit.edu/courses/18-065-linear-algebra-and-learning-from-data-spring-2019/",
    academicTorrentsUrl: "https://academictorrents.com/details/mit-ocw-18065-learning-from-data",
    torrentMagnet: "magnet:?xt=urn:btih:6182749102938471928374910283749182739482&dn=mit-ocw-18065-strang-data",
    torrentInfoHash: "6182749102938471928374910283749182739482",
    academicTerm: "Spring 2019",
    category: "math-physics",
    description: "Prof. Strang's masterwork connecting linear algebra to deep learning, neural networks, PCA, Eckart-Young low-rank approximations, stochastic gradient descent, and ADAM optimization.",
    activeLectureIndex: 0,
    badgeAccent: "#d97706", // Dark Amber
    lectures: [
      {
        id: "mit-18065-l1",
        lectureNumber: 1,
        title: "Lecture 1: The Four Ways to Multiply AB = Columns times Rows",
        durationSec: 3120,
        videoUrl: "https://www.youtube.com/watch?v=YIQEG8rFnpU",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 960,
            title: "Matrix Multiplication as Sum of Outer Products",
            note: "AB is the sum of (column i of A) times (row i of B). Each term is a rank-1 matrix.",
            latex: "A B = \\sum_{k=1}^r \\mathbf{a}_k \\mathbf{b}_k^T",
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
    academicTorrentsUrl: "https://academictorrents.com/details/caltech-feynman-lectures-complete",
    torrentMagnet: "magnet:?xt=urn:btih:5182940192847102938471928374910283749183&dn=caltech-feynman-lectures-archive",
    torrentInfoHash: "5182940192847102938471928374910283749183",
    academicTerm: "Historic Masterwork",
    category: "math-physics",
    description: "The legendary Caltech physics sequence: atoms in motion, conservation of energy, gravitation, spacetime geometry, thermodynamics, and quantum mechanical wave-particle duality delivered with Feynman's unmatched intuition.",
    activeLectureIndex: 0,
    badgeAccent: "#0ea5e9", // Vivid Cyan
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
    id: "stanford-theoretical-minimum",
    title: "The Theoretical Minimum: Physics Sequence",
    institution: "Stanford University",
    instructor: "Prof. Leonard Susskind",
    playlistUrl: "https://theoreticalminimum.com/courses",
    academicTorrentsUrl: "https://academictorrents.com/details/susskind-theoretical-minimum-physics",
    torrentMagnet: "magnet:?xt=urn:btih:4182940192847102938471928374910283749184&dn=stanford-susskind-theoretical-minimum",
    torrentInfoHash: "4182940192847102938471928374910283749184",
    academicTerm: "Core Physics Curriculum",
    category: "math-physics",
    description: "Everything you need to know to start doing modern physics. Classical Mechanics, Euler-Lagrange equations, Hamiltonian phase space, Quantum Mechanics, and Special/General Relativity.",
    activeLectureIndex: 0,
    badgeAccent: "#06b6d4", // Cyan
    lectures: [
      {
        id: "susskind-cm-l1",
        lectureNumber: 1,
        title: "Classical Mechanics: Generalized Coordinates & Euler-Lagrange",
        durationSec: 6180,
        videoUrl: "https://www.youtube.com/watch?v=ApUFtLCrU90",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1800,
            title: "Euler-Lagrange Equations of Motion",
            note: "The actual path taken by a physical system minimizes the action integral S = int L dt where L = T - V.",
            latex: "\\frac{d}{dt} \\left( \\frac{\\partial L}{\\partial \\dot{q}_i} \\right) - \\frac{\\partial L}{\\partial q_i} = 0",
          },
        ],
      },
    ],
  },
  {
    id: "mit-801-physics",
    title: "8.01: Physics I - Classical Mechanics",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Walter Lewin",
    playlistUrl: "https://ocw.mit.edu/courses/8-01-physics-i-classical-mechanics-fall-1999/",
    academicTorrentsUrl: "https://archive.org/details/MIT8.01F1999",
    torrentMagnet: "magnet:?xt=urn:btih:3182940192847102938471928374910283749185&dn=mit-ocw-801-walter-lewin",
    torrentInfoHash: "3182940192847102938471928374910283749185",
    academicTerm: "Fall 1999 Classic",
    category: "math-physics",
    description: "The world-famous MIT physics series with Walter Lewin's jaw-dropping live demonstrations: pendulums of death, conservation of mechanical energy, circular motion, and celestial mechanics.",
    activeLectureIndex: 0,
    badgeAccent: "#eab308", // Bright Gold
    lectures: [
      {
        id: "mit-801-l11",
        lectureNumber: 11,
        title: "Lecture 11: Work, Energy & The Pendulum of Death",
        durationSec: 3060,
        videoUrl: "https://www.youtube.com/watch?v=xXXF2C-vrQE",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1620,
            title: "Conservation of Mechanical Energy in Heavy Pendulum",
            note: "In a closed conservative field, kinetic and potential energy trade off: E = 1/2 m v^2 + m g h = constant.",
            latex: "E = \\frac{1}{2} m v^2 + m g h = \\text{const}",
          },
        ],
      },
    ],
  },
  {
    id: "mit-calculus-revisited",
    title: "Calculus Revisited: Single & Multivariable",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Herbert Gross",
    playlistUrl: "https://ocw.mit.edu/resources/res-18-006-calculus-revisited-single-variable-calculus-fall-2010/",
    academicTorrentsUrl: "https://academictorrents.com/details/mit-calculus-revisited-complete",
    torrentMagnet: "magnet:?xt=urn:btih:2182940192847102938471928374910283749186&dn=mit-ocw-calculus-revisited-gross",
    torrentInfoHash: "2182940192847102938471928374910283749186",
    academicTerm: "Historic Series",
    category: "math-physics",
    description: "A legendary, intuitive pedagogical approach to calculus. Re-examines derivatives as best linear approximations and integrals as Riemann accumulations.",
    activeLectureIndex: 0,
    badgeAccent: "#6366f1", // Indigo
    lectures: [
      {
        id: "gross-calc-l1",
        lectureNumber: 1,
        title: "Study Guide 1: The Concept of a Function & Sets",
        durationSec: 2160,
        videoUrl: "https://www.youtube.com/watch?v=yW3dZ3_tPzE",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 600,
            title: "Derivative as Linear Approximation",
            note: "The derivative f'(a) is the unique slope ensuring f(x) - (f(a) + f'(a)(x - a)) vanishes faster than |x - a|.",
            latex: "\\lim_{x \\to a} \\frac{f(x) - [f(a) + f'(a)(x - a)]}{x - a} = 0",
          },
        ],
      },
    ],
  },

  // ==========================================
  // 3. SYSTEMS, COMPILERS & NETWORKS
  // ==========================================
  {
    id: "nand2tetris",
    title: "The Elements of Computing Systems (Nand2Tetris)",
    institution: "Hebrew Univ. & Reichman Univ.",
    instructor: "Prof. Noam Nisan & Prof. Shimon Schocken",
    playlistUrl: "https://www.nand2tetris.org/",
    academicTorrentsUrl: "https://academictorrents.com/details/nand2tetris-full-course",
    torrentMagnet: "magnet:?xt=urn:btih:1182940192847102938471928374910283749187&dn=nand2tetris-computing-systems",
    torrentInfoHash: "1182940192847102938471928374910283749187",
    academicTerm: "Complete Course Pack",
    category: "systems-compilers",
    description: "Constructing a modern, general-purpose computer system from hardware NAND logic gates up to an ALU, CPU, assembler, virtual machine, compiler, operating system, and a playable Tetris game.",
    activeLectureIndex: 0,
    badgeAccent: "#14b8a6", // Teal
    lectures: [
      {
        id: "nand2tetris-l1",
        lectureNumber: 1,
        title: "Unit 1: Boolean Logic & Elementary Hardware Gates",
        durationSec: 2700,
        videoUrl: "https://www.youtube.com/watch?v=IlPj5Rg1y2w",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 720,
            title: "Functional Completeness of NAND",
            note: "Any Boolean function (AND, OR, NOT, XOR, MUX) can be constructed solely using primitive NAND gates.",
            latex: "\\text{NOT}(x) = x \\ \\overline{\\wedge} \\ x, \\quad \\text{AND}(x, y) = \\text{NOT}(x \\ \\overline{\\wedge} \\ y)",
          },
        ],
      },
      {
        id: "nand2tetris-l6",
        lectureNumber: 6,
        title: "Unit 6: The Assembler & Translation to Binary Machine Code",
        durationSec: 2880,
        videoUrl: "https://www.youtube.com/watch?v=kYJvMv6n1B8",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 840,
            title: "Hack Computer Instruction Encoding",
            note: "16-bit instructions: A-instruction (0 + 15-bit address) vs C-instruction (111 + comp bits + dest bits + jump bits).",
          },
        ],
      },
    ],
  },
  {
    id: "mit-6824-distributed-systems",
    title: "6.824: Distributed Systems",
    institution: "Massachusetts Institute of Technology",
    instructor: "Prof. Robert Morris",
    playlistUrl: "https://pdos.csail.mit.edu/6.824/",
    academicTorrentsUrl: "https://academictorrents.com/details/mit-6824-distributed-systems",
    torrentMagnet: "magnet:?xt=urn:btih:0182940192847102938471928374910283749188&dn=mit-6824-distributed-systems-morris",
    torrentInfoHash: "0182940192847102938471928374910283749188",
    academicTerm: "Spring 2021",
    category: "systems-compilers",
    description: "Core principles of distributed computing: Raft consensus, Byzantine fault tolerance, linearizable consistency, MapReduce, Spanner, and Google File System (GFS) implemented in Go.",
    activeLectureIndex: 0,
    badgeAccent: "#f97316", // Orange
    lectures: [
      {
        id: "mit-6824-l1",
        lectureNumber: 1,
        title: "Lecture 1: Introduction, MapReduce Architecture & Fault Recovery",
        durationSec: 4860,
        videoUrl: "https://www.youtube.com/watch?v=cQP8WApzIQQ",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1200,
            title: "MapReduce Worker Re-execution Invariant",
            note: "Deterministic functional map and reduce stages allow failed workers to simply re-execute tasks without corrupting distributed output.",
          },
        ],
      },
      {
        id: "mit-6824-l3",
        lectureNumber: 3,
        title: "Lecture 3: GFS: The Google File System Architecture",
        durationSec: 4980,
        videoUrl: "https://www.youtube.com/watch?v=6ETFkL9SSt8",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 900,
            title: "Single Master Design with Big Chunk Sizes (64MB)",
            note: "Large chunk size reduces metadata volume so the central master can maintain all chunk mappings in memory without bottlenecking data transfer.",
          },
        ],
      },
      {
        id: "mit-6824-l6",
        lectureNumber: 6,
        title: "Lecture 6: Fault Tolerance: Raft Consensus Algorithm",
        durationSec: 5120,
        videoUrl: "https://www.youtube.com/watch?v=R2-9bsKmEbo",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1440,
            title: "Raft Leader Election & Randomized Heartbeat Timeouts",
            note: "Heartbeat timer jitter (150-300ms) prevents split votes and guarantees single candidate victory in majority quorum.",
            latex: "\\text{Quorum} = \\lfloor N / 2 \\rfloor + 1",
          },
        ],
      },
    ],
  },

  // ==========================================
  // 4. FOUNDATIONS OF COMPUTATION
  // ==========================================
  {
    id: "berkeley-cs61a",
    title: "CS 61A: Structure & Interpretation of Computer Programs",
    institution: "University of California, Berkeley",
    instructor: "Prof. John DeNero",
    playlistUrl: "https://cs61a.org/",
    academicTorrentsUrl: "https://academictorrents.com/details/berkeley-cs61a-full",
    torrentMagnet: "magnet:?xt=urn:btih:9082940192847102938471928374910283749189&dn=berkeley-cs61a-sicp-denero",
    torrentInfoHash: "9082940192847102938471928374910283749189",
    academicTerm: "Fall Modern",
    category: "foundations",
    description: "The gold standard introductory computer science course based on SICP: procedural abstraction, environment model of execution, higher-order functions, interpreters, and Scheme evaluation in Python.",
    activeLectureIndex: 0,
    badgeAccent: "#38bdf8", // Sky Blue
    lectures: [
      {
        id: "cs61a-l1",
        lectureNumber: 1,
        title: "Lecture 1: Functional Abstraction, Call Expressions & Functions",
        durationSec: 3000,
        videoUrl: "https://www.youtube.com/watch?v=2Tz89iGjE_0",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 840,
            title: "Environment Diagram Scope Rules",
            note: "Evaluating an expression requires an environment: names are looked up in the current frame, then parent frames, back to the global frame.",
          },
        ],
      },
    ],
  },
  {
    id: "berkeley-cs61b",
    title: "CS 61B: Data Structures & Algorithms",
    institution: "University of California, Berkeley",
    instructor: "Prof. Josh Hug",
    playlistUrl: "https://sp21.datastructur.es/",
    academicTorrentsUrl: "https://academictorrents.com/details/berkeley-cs61b-data-structures",
    torrentMagnet: "magnet:?xt=urn:btih:8082940192847102938471928374910283749190&dn=berkeley-cs61b-hug-datastructures",
    torrentInfoHash: "8082940192847102938471928374910283749190",
    academicTerm: "Spring 2021",
    category: "foundations",
    description: "Advanced data structures with unmatched pedagogical clarity: red-black trees, B-trees, hashing with load factors, Dijkstra's algorithm, A* search, and graph connectivity algorithms.",
    activeLectureIndex: 0,
    badgeAccent: "#a855f7", // Purple
    lectures: [
      {
        id: "cs61b-l16",
        lectureNumber: 16,
        title: "Lecture 16: Balanced Trees: 2-3 Trees & Left-Leaning Red-Black (LLRB)",
        durationSec: 3120,
        videoUrl: "https://www.youtube.com/watch?v=F_Ym2bWqjJk",
        completed: false,
        lastPositionSec: 0,
        conceptNotes: [
          {
            timestampSec: 1080,
            title: "LLRB Tree Isomorphism to 2-3 Trees",
            note: "A Left-Leaning Red-Black tree is a BST representation of a 2-3 tree where red edges represent internal 3-node glues.",
            latex: "H_{\\text{LLRB}} \\le 2 \\log_2(N + 1)",
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
    academicTorrentsUrl: "https://academictorrents.com/details/harvard-cs50x-vault",
    torrentMagnet: "magnet:?xt=urn:btih:7082940192847102938471928374910283749191&dn=harvard-cs50x-malan",
    torrentInfoHash: "7082940192847102938471928374910283749191",
    academicTerm: "Current / Continuous",
    category: "foundations",
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
    academicTorrentsUrl: "https://academictorrents.com/details/mit-6006-algorithms-complete",
    torrentMagnet: "magnet:?xt=urn:btih:6082940192847102938471928374910283749192&dn=mit-ocw-6006-algorithms",
    torrentInfoHash: "6082940192847102938471928374910283749192",
    academicTerm: "Fall 2011",
    category: "foundations",
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

  public getCoursesByCategory(category: CourseCategory): UniversityCourse[] {
    return Array.from(this.courses.values()).filter((c) => c.category === category);
  }

  public getTorrentBackedCourses(): UniversityCourse[] {
    return Array.from(this.courses.values()).filter(
      (c) => Boolean(c.torrentMagnet || c.torrentInfoHash || c.academicTorrentsUrl)
    );
  }

  public searchCourses(query: string): UniversityCourse[] {
    if (!query.trim()) return this.getAllCourses();
    const q = query.toLowerCase();
    return Array.from(this.courses.values()).filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.institution.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
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
