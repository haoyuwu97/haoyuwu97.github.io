export const profile = {
  name: 'Haoyu Wu',
  headline: 'Molecular Simulation · Polymer Physics · Scientific Software',
  shortTitle: 'PhD Student in Chemical & Biomolecular Engineering',
  affiliation: 'University of Notre Dame',
  location: 'South Bend, Indiana, USA',
  heroKicker: 'From molecular interactions to interpretable observables',
  portrait: 'assets/img/profile-haoyu.jpg',
  portraitSquare: 'assets/img/profile-haoyu-square.webp',
  links: [
    { label: 'GitHub', href: 'https://github.com/haoyuwu97' },
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?hl=en&user=NSpr644AAAAJ' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/haoyu-wu-439bba323' },
    { label: 'Whitmer Group', href: 'https://whitmergroup.github.io/people.html' },
    { label: 'ORCID', href: 'https://orcid.org/0000-0002-2805-4911' }
  ],
  heroSummary:
    'Researching advanced polymeric materials through molecular simulation, coarse-grained modeling, and scientific software that translates trajectories into physically interpretable structure, dynamics, rheology, and transport.',
  bio: [
    'I am a PhD student at the University of Notre Dame working on soft materials and molecular simulation, with a strong emphasis on physically grounded computational modeling and reusable scientific code.',
    'My current profile spans advanced polymeric materials, molecular simulation, and scientific computing. I am especially interested in the bridge from microscopic interactions to emergent observables such as network formation, crystallization, viscoelastic response, and continuum-scale transport.',
    'Before Notre Dame, I earned my M.S. and B.E. from Beijing University of Chemical Technology. That training shaped a workflow I still use today: identify the physics, formalize the data path, then package the analysis into tools other researchers can trust and extend.'
  ],
  focusAreas: [
    'Advanced polymeric materials',
    'Molecular simulations',
    'Polymer nanocomposites',
    'Scientific software',
    'Trajectory analysis',
    'Continuum coupling'
  ],
  quickFacts: [
    { label: 'Current home', value: 'Notre Dame' },
    { label: 'Training', value: 'B.E. + M.S. at BUCT' },
    { label: 'Research style', value: 'Physics-first + code-first' },
    { label: 'Built around', value: 'Reproducible simulation workflows' }
  ]
};

export const researchPillars = [
  {
    id: 'molecular-modeling',
    title: 'Molecular modeling of soft materials',
    body:
      'Coarse-grained and molecular-dynamics studies of vitrimer networks, polymer nanocomposites, glass transition behavior, percolation, fracture, and self-healing.'
  },
  {
    id: 'analysis-systems',
    title: 'Simulation analysis systems',
    body:
      'Reusable code for trajectory processing, structural observables, crystallization analysis, viscoelastic response extraction, and large-scale simulation post-processing.'
  },
  {
    id: 'multiscale-bridges',
    title: 'Microscopic-to-continuum bridges',
    body:
      'A software stack that links nanoscale kernels, thermodynamics, and transport to continuum/device observables, enabling multiscale interpretation rather than isolated simulation outputs.'
  }
];

export const homeSpotlights = [
  {
    title: 'Physically interpretable software',
    text:
      'The code portfolio is organized like a workflow rather than a collection of unrelated repositories: generate trajectories, extract observables, characterize structure and rheology, then push kernels into higher-level continuum models.'
  },
  {
    title: 'Polymer systems with structure and dynamics',
    text:
      'Much of the publication record centers on how topology, filler geometry, pressure, and dynamic exchange reshape fracture, percolation, viscoelasticity, and glass-transition behavior in polymeric systems.'
  },
  {
    title: 'Minimal interfaces, high information density',
    text:
      'This site intentionally adopts a quiet dark interface with simulation-inspired rendering layers, code-atlas navigation, and compact cards so the work feels technical, modern, and easy to scan.'
  }
];

export const publications = [
  {
    id: 'percolation-polydisperse-nanorods-2020',
    year: 2020,
    title: 'Percolation of polydisperse nanorods in polymer nanocomposites: Insights from molecular dynamics simulation',
    authors: 'Haoyu Wu, Haoxiang Li, Wenfeng Zhang, Fei Li, Bin Li, Yangyang Gao, Xiuying Zhao, Liqun Zhang',
    venue: 'Composites Science and Technology',
    citation: '196, 108208',
    doi: '10.1016/j.compscitech.2020.108208',
    url: 'https://doi.org/10.1016/j.compscitech.2020.108208',
    tags: ['Percolation', 'Nanorods', 'Polymer nanocomposites', 'Molecular dynamics'],
    blurb:
      'Examines how rod-length polydispersity reorganizes conductive network formation in polymer nanocomposites and why distributional effects matter for emergent connectivity.'
  },
  {
    id: 'double-interpenetrated-fracture-2020',
    year: 2020,
    title: 'Molecular dynamics simulation of fracture mechanism in the double interpenetrated cross-linked polymer',
    authors: 'Haoxiang Li, Haoyu Wu, Bin Li, Yangyang Gao, Xiuying Zhao, Liqun Zhang',
    venue: 'Polymer',
    citation: '199, 122571',
    doi: '10.1016/j.polymer.2020.122571',
    url: 'https://doi.org/10.1016/j.polymer.2020.122571',
    tags: ['Fracture', 'Double networks', 'Cross-linked polymers', 'Molecular dynamics'],
    blurb:
      'Studies how dual-network architecture and cross-link density influence fracture energy and failure pathways in interpenetrated polymer networks.'
  },
  {
    id: 'rheological-mechanism-spherical-np-2021',
    year: 2021,
    title: 'Rheological mechanism of polymer nanocomposites filled with spherical nanoparticles: Insight from molecular dynamics simulation',
    authors: 'Haoxiang Li, Haoyu Wu, Wenfeng Zhang, Xiuying Zhao, Liqun Zhang, Yangyang Gao',
    venue: 'Polymer',
    citation: '231, 124129',
    doi: '10.1016/j.polymer.2021.124129',
    url: 'https://doi.org/10.1016/j.polymer.2021.124129',
    tags: ['Rheology', 'Spherical nanoparticles', 'Nanocomposites', 'Molecular dynamics'],
    blurb:
      'Connects nanoparticle-induced structural changes to rheological response and gives a simulation-based mechanism for reinforcement in filled polymers.'
  },
  {
    id: 'mixed-nanoparticles-percolated-network-2021',
    year: 2021,
    title: 'Percolated Network of Mixed Nanoparticles with Different Sizes in Polymer Nanocomposites: A Coarse-Grained Molecular Dynamics Simulation',
    authors: 'Xiuying Zhao, Yun Nie, Haoxiang Li, Haoyu Wu, Yangyang Gao, Liqun Zhang',
    venue: 'Materials',
    citation: '14(12), 3301',
    doi: '10.3390/ma14123301',
    url: 'https://doi.org/10.3390/ma14123301',
    tags: ['Coarse-grained MD', 'Percolation', 'Mixed fillers', 'Nanocomposites'],
    blurb:
      'Quantifies how particle-size heterogeneity reshapes filler networks in polymer nanocomposites and highlights a route to tuning percolation by size mixing.'
  },
  {
    id: 'glass-transition-polyisoprene-pressure-2022',
    year: 2022,
    title: 'Structure and dynamics behavior during the glass transition of the polyisoprene in the presence of pressure: A molecular dynamics simulation',
    authors: 'Wei Sun, Haoyu Wu, Yanlong Luo, Bin Li, Lixin Mao, Xiuying Zhao, Liqun Zhang, Yangyang Gao',
    venue: 'Polymer',
    citation: '238, 124433',
    doi: '10.1016/j.polymer.2021.124433',
    url: 'https://doi.org/10.1016/j.polymer.2021.124433',
    tags: ['Glass transition', 'Polyisoprene', 'Pressure effects', 'Molecular dynamics'],
    blurb:
      'Analyzes pressure-dependent structural and dynamical signatures around the glass transition of polyisoprene using simulation-resolved molecular observables.'
  },
  {
    id: 'shape-size-viscoelasticity-2022',
    year: 2022,
    title: 'Effect of shape and size of nanofillers on the viscoelasticity of polymer nanocomposites',
    authors: 'Dandan Luo, Haoyu Wu, Haoxiang Li, Wenfeng Zhang, Liqun Zhang, Yangyang Gao',
    venue: 'Polymer',
    citation: '246, 124750',
    doi: '10.1016/j.polymer.2022.124750',
    url: 'https://doi.org/10.1016/j.polymer.2022.124750',
    tags: ['Viscoelasticity', 'Nanofillers', 'Filler geometry', 'Polymer nanocomposites'],
    blurb:
      'Shows how filler shape and size jointly govern the viscoelastic reinforcement landscape of polymer nanocomposites.'
  },
  {
    id: 'nanorods-nanospheres-2022',
    year: 2022,
    title: 'Manipulating the percolated network of nanorods in polymer matrix by adding non-conductive nanospheres: A molecular dynamics simulation',
    authors: 'Haoyu Wu, Ruibin Ma, Yimin Wang, Xiuying Zhao, Liqun Zhang, Yangyang Gao',
    venue: 'Composites Science and Technology',
    citation: '229, 109694',
    doi: '10.1016/j.compscitech.2022.109694',
    url: 'https://doi.org/10.1016/j.compscitech.2022.109694',
    tags: ['Nanorods', 'Nanospheres', 'Percolated networks', 'Molecular dynamics'],
    blurb:
      'Demonstrates that even non-conductive additives can redirect nanorod network formation and change effective transport pathways in polymer matrices.'
  },
  {
    id: 'vitrimer-topological-transition-2024',
    year: 2024,
    title: 'Molecular Insights into the Topological Transition, Fracture, and Self-Healing Behavior of Vitrimer Composites with Exchangeable Interfaces',
    authors: 'Ruibin Ma, Haoyu Wu, Chenlong Li, Xiuying Zhao, Xiaolin Li, Liqun Zhang, Yangyang Gao',
    venue: 'Macromolecules',
    citation: '57(20), 9725–9736',
    doi: '10.1021/acs.macromol.4c01541',
    url: 'https://doi.org/10.1021/acs.macromol.4c01541',
    tags: ['Vitrimers', 'Self-healing', 'Fracture', 'Exchangeable interfaces'],
    blurb:
      'Probes how exchangeable interfaces govern topological transition, damage evolution, and healing in vitrimer composites.'
  }
];

export const softwareProjects = [
  {
    id: 'pilots',
    name: 'PILOTS',
    slug: 'pilots',
    category: 'Trajectory analysis',
    status: 'Active',
    language: 'C++ / Python',
    license: 'GPL-3.0',
    updated: 'Mar 11, 2026',
    repoUrl: 'https://github.com/haoyuwu97/PILOTS',
    docsUrl: 'https://haoyuwu97.github.io/PILOTS/',
    cardSummary:
      'High-performance, reproducible trajectory-analysis runner for large molecular simulations with an extensible measure framework.',
    headline:
      'Physical Integrated Library for Observables & Trajectories in Simulations',
    overview:
      'PILOTS is the analysis backbone of the software stack: a fast, reproducible runner for LAMMPS trajectories that turns large dumps into audited observables, text datasets, and machine-readable results manifests.',
    whyItMatters:
      'Instead of rewriting one-off scripts for each new observable, PILOTS treats trajectory analysis as a platform. Selection logic, topology loading, checkpoints, streaming output, and metadata auditing are handled centrally so new physics can be added as modular measures.',
    features: [
      'LAMMPS trajectory reader with triclinic / periodic-boundary reconstruction',
      'Follow mode for growing trajectories plus checkpoint / resume support',
      'Measure registry for multi-observable single-pass analysis',
      'Topology, graph, and polymer primitives reusable across measures',
      'Optional Python wrapper (`pilotsio`) for orchestration and result loading'
    ],
    build: ['cmake -S . -B build -DCMAKE_BUILD_TYPE=Release', 'cmake --build build -j'],
    run: ['./build/pilots --config path/to/config.ini --threads 8'],
    architecture: [
      'Reader → selection / topology → algorithm layer → registered measures → results.json + datasets',
      'Designed so new observables normally require only a new measure implementation',
      'Acts as the natural upstream producer for continuum-facing workflows such as CHANNEL'
    ],
    outputs: ['results.json index', 'plain-text datasets', 'audited selection + topology metadata'],
    connections: ['Feeds kernels and observables into CHANNEL', 'Provides shared analysis infrastructure for future observables'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/PILOTS' },
      { label: 'Online manual', href: 'https://haoyuwu97.github.io/PILOTS/' },
      { label: 'Quickstart', href: 'https://haoyuwu97.github.io/PILOTS/getting-started.html' }
    ]
  },
  {
    id: 'channel',
    name: 'CHANNEL',
    slug: 'channel',
    category: 'Continuum modeling',
    status: 'Active',
    language: 'C++ / Python',
    license: 'GPL-3.0',
    updated: 'Mar 10, 2026',
    repoUrl: 'https://github.com/haoyuwu97/CHANNEL',
    docsUrl: 'https://github.com/haoyuwu97/CHANNEL',
    cardSummary:
      '1D continuum simulator for charge, ion, and redox physics designed to consume simulation-derived kernels.',
    headline:
      'Charge and Ion NanoscaLe-to-device Link',
    overview:
      'CHANNEL is a continuum-side solver that links nanoscale kernels to device-scale observables. It solves Poisson electrostatics, multi-species ion thermodynamics/transport, optional redox coupling, and an optional OECT-style observable within a 1D workflow.',
    whyItMatters:
      'Many simulation projects stop at trajectories. CHANNEL is valuable because it formalizes the next step: converting microscopic kernels into higher-level transport predictions without throwing away thermodynamic structure.',
    features: [
      'Poisson and Poisson–Nernst–Planck-style transport formulation',
      'Closure modes for Ω-based and μ-based continuum descriptions',
      'Kernel ingestion from profile files or PILOTS-assisted workflows',
      'Stationary and dynamic modes with verification diagnostics',
      'Lightweight Python wrapper for job launching and output parsing'
    ],
    build: ['cmake -S . -B build -DCMAKE_BUILD_TYPE=Release', 'cmake --build build -j'],
    run: ['./build/channel --config examples/constant_simple.ini'],
    architecture: [
      'Kernel ingestion → closure selection → stationary/dynamic solve → datasets + verification',
      'Supports direct file-based kernels and helper discovery from PILOTS output folders',
      'Designed as a multiscale bridge rather than a standalone nanoscale generator'
    ],
    outputs: ['results.json', 'profile datasets such as psi.dat and c_*.dat', 'optional dynamic/ time-series directory'],
    connections: ['Consumes kernels from molecular workflows', 'Pairs naturally with PILOTS for end-to-end multiscale studies'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/CHANNEL' }
    ]
  },
  {
    id: 'impact',
    name: 'IMPACT',
    slug: 'impact',
    category: 'Crystallization analysis',
    status: 'Active',
    language: 'C++',
    license: 'GPL-3.0',
    updated: 'Mar 9, 2026',
    repoUrl: 'https://github.com/haoyuwu97/IMPACT',
    docsUrl: 'https://github.com/haoyuwu97/IMPACT',
    cardSummary:
      'Coarse-grained crystallization analysis toolkit for semi-crystalline polymeric materials with clustering and chain-conformation modes.',
    headline:
      'Integrated Multi-topology & Multi-criteria Polymeric Analysis of Crystallization & Cluster Toolkit',
    overview:
      'IMPACT is a command-line analysis workflow for semi-crystalline polymers and polymeric nanocomposites. It combines SOP-based, DTT-based, and volume-based crystallinity estimates with optional cluster and polymer-conformation analysis.',
    whyItMatters:
      'Crystallization is often analyzed with fragmented scripts and narrow metrics. IMPACT centralizes several structural criteria in a single workflow that can also follow a growing dump file in real time.',
    features: [
      'SOP-based crystallinity analysis',
      'DTT-based crystallinity identification',
      'Volume-based crystallinity estimation',
      'Cluster analysis and linear-polymer conformation support',
      'Realtime follow mode for evolving trajectories'
    ],
    build: ['make'],
    run: ['IMPACT -in input.dump -out output -sop 1.44 0.8 -c 1.05 0.95 -cf'],
    architecture: [
      'Dump parser → crystallinity mode → optional clustering / conformation → output folder',
      'Supports both batch analysis and streaming/follow analysis',
      'Built for semi-crystalline polymer systems with explicit workflow switches'
    ],
    outputs: ['analysis folders', 'snapshot-style results for selected modes'],
    connections: ['Specialized structural-analysis node inside the broader simulation software portfolio'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/IMPACT' }
    ]
  },
  {
    id: 'vela',
    name: 'VELA',
    slug: 'vela',
    category: 'Linear response',
    status: 'Active',
    language: 'C++',
    license: 'GPL-3.0',
    updated: 'Mar 10, 2026',
    repoUrl: 'https://github.com/haoyuwu97/VELA',
    docsUrl: 'https://github.com/haoyuwu97/VELA',
    cardSummary:
      'Stress-autocorrelation and modulus-analysis package that converts MD stress series into time- and frequency-domain viscoelastic observables.',
    headline:
      'ViscoElastic Linear-response Analyzer',
    overview:
      'VELA computes equilibrium stress autocorrelations and transforms them into modulus–frequency relationships. It supports reduced and absolute branches, multiple transform methods, and an optional runtime LAMMPS backend for affine-modulus extraction.',
    whyItMatters:
      'Turning raw MD stress data into reliable viscoelastic observables is often numerically delicate. VELA treats the transformation and branch semantics explicitly, making the analysis path far more transparent.',
    features: [
      'Reduced and absolute modulus branches',
      'Mode 0 / Mode 1 stress-input handling',
      'Transform options including direct, i-RheoFT, Schwarzl-style, and CAFT-Bounds',
      'Optional liblammps backend for autonomous mu_A extraction',
      'Explicit metadata in output headers for branch and transform provenance'
    ],
    build: ['make'],
    run: ['./VELA INPUT_FILE OUTPUT_FILE_Gt OUTPUT_FILE_Gw DT MODE [GTCUT] [TAIL_PARAM]'],
    architecture: [
      'Stress timeseries → centered correlators → transform route → time/frequency outputs',
      'Optional LAMMPS backend enables physically grounded absolute-modulus workflows',
      'CAFT-Bounds provides trusted-window plus constrained-tail inference'
    ],
    outputs: ['time-domain modulus files', 'frequency-domain modulus files with bounds'],
    connections: ['Natural rheology-analysis complement to MD simulation and trajectory tooling'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/VELA' }
    ]
  },
  {
    id: 'gnm',
    name: 'GNM',
    slug: 'gnm',
    category: 'Monte Carlo',
    status: 'Active',
    language: 'C++',
    license: 'GPL-3.0',
    updated: 'Jan 14, 2026',
    repoUrl: 'https://github.com/haoyuwu97/GNM',
    docsUrl: 'https://github.com/haoyuwu97/GNM',
    cardSummary:
      'MC / GCMC package for simple Lennard–Jones particle systems with an input-driven setup similar to classical simulators.',
    headline:
      'Grand-canonical N-particle Monte Carlo simulation',
    overview:
      'GNM is a compact MC/GCMC engine for simple Lennard–Jones particle systems. It is designed both as a practical starting point for small-scale simulation work and as a teaching-friendly codebase.',
    whyItMatters:
      'Not every useful simulation code should be huge. GNM is valuable as a clean, focused basis for Monte Carlo workflows and for learning how a simple simulation package can be organized around input files and extensible particle types.',
    features: [
      'MC and GCMC modes',
      'Input-file driven execution',
      'Support for many particle types',
      'Periodic-boundary simulations for short-range LJ systems',
      'Suitable as a starter codebase for teaching and extension'
    ],
    build: ['./GNM -i example.in -o output'],
    run: ['./GNM -i ./mc/in.dat -o ./mc/out'],
    architecture: [
      'Input keywords → simulation mode → output selection → trajectories / energies',
      'Focused on Linux environments and short-range LJ interactions',
      'Useful as a sandbox for simple-particle Monte Carlo ideas'
    ],
    outputs: ['energy traces', 'optional configurations'],
    connections: ['Foundational simulation code in the broader portfolio'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/GNM' }
    ]
  },
  {
    id: 'pair-style-swas',
    name: 'pair_style-sw-as',
    slug: 'pair-style-swas',
    category: 'LAMMPS extension',
    status: 'Active',
    language: 'C++',
    license: 'GPL-3.0',
    updated: 'Nov 2, 2025',
    repoUrl: 'https://github.com/haoyuwu97/pair_style-sw-as',
    docsUrl: 'https://github.com/haoyuwu97/pair_style-sw-as',
    cardSummary:
      'LAMMPS pair style implementing a modified Stillinger–Weber three-body potential for associative vitrimer bonding.',
    headline:
      'Custom LAMMPS potential for associative vitrimer bonding',
    overview:
      'This repository extends the Stillinger–Weber potential within LAMMPS to model associative vitrimer bonding, using a modified two-body attraction combined with a three-body repulsive mechanism for bond-swap-like behavior.',
    whyItMatters:
      'The repository captures a very specific physical modeling need: dynamic associative bonding with controllable swap barriers. It is the kind of focused extension that often underpins an entire materials-simulation program.',
    features: [
      'Modified two-body binding potential',
      'Repulsive three-body term for swap-like dynamics',
      'Straightforward integration into LAMMPS source trees',
      'Coefficient examples for one-type and two-type reactive systems',
      'Parameterization compatible with familiar SW-style workflows'
    ],
    build: ['Place pair_swas.cpp / pair_swas.h inside the relevant LAMMPS package and compile with LAMMPS'],
    run: ['pair_style hybrid/overlay lj/expand 2.5 sw/as', 'pair_coeff * * sw/as coeff_two.swas A B'],
    architecture: [
      'LAMMPS plugin layer rather than a standalone executable',
      'Extends standard pair-style usage while adding vitrimer-specific physics',
      'Focused on associative bonding and bond-swap energetics'
    ],
    outputs: ['LAMMPS-compatible force and energy contributions'],
    connections: ['Supports vitrimer simulation workflows that motivate later analysis and interpretation'],
    quickLinks: [
      { label: 'Repository', href: 'https://github.com/haoyuwu97/pair_style-sw-as' }
    ]
  }
];

export const softwareGraph = [
  { from: 'pair_style-sw-as', to: 'pilots', label: 'simulate' },
  { from: 'gnm', to: 'pilots', label: 'analyze' },
  { from: 'pilots', to: 'channel', label: 'kernels' },
  { from: 'pilots', to: 'vela', label: 'stress data' },
  { from: 'pilots', to: 'impact', label: 'structure' }
];

export const leisureModes = [
  {
    id: 'bubble-drift',
    title: 'Bubble Drift',
    subtitle: 'Tap to release tension',
    description: 'Pop slow-floating bubbles. Every burst respawns new ones, so the canvas never ends.',
    instruction: 'Click or tap the bubbles. Hold and drag to stir the whole field.'
  },
  {
    id: 'orbit-garden',
    title: 'Orbit Garden',
    subtitle: 'Seed calm attractors',
    description: 'Place orbital centers and let particles spiral into smooth layered motion.',
    instruction: 'Click to place an attractor. Move the cursor to bend nearby trajectories.'
  },
  {
    id: 'sand-wave',
    title: 'Sand Wave',
    subtitle: 'Draw and let it settle',
    description: 'A minimalist zen field that remembers your gesture briefly, then relaxes.',
    instruction: 'Drag slowly to rake the field. Click to drop a stone and watch ripples spread.'
  },
  {
    id: 'ribbon-flow',
    title: 'Ribbon Flow',
    subtitle: 'Guide an endless filament',
    description: 'A soft elastic ribbon follows your motion with layered trailing echoes.',
    instruction: 'Move the cursor gently. Faster sweeps create tighter wave packets.'
  },
  {
    id: 'gravity-pebbles',
    title: 'Gravity Pebbles',
    subtitle: 'Build a relaxing field',
    description: 'Drop temporary gravity wells and watch dust drift into elegant patterns.',
    instruction: 'Click to drop a pebble. Add several to create a living force landscape.'
  }
];

export const pageMeta = {
  index: {
    title: 'Haoyu Wu | Molecular Simulation & Scientific Software',
    description:
      'Personal research homepage for Haoyu Wu, featuring publications, software, research wiki, and an interactive leisure mode.'
  },
  publications: {
    title: 'Publications | Haoyu Wu',
    description: 'Selected publications spanning polymer nanocomposites, vitrimers, rheology, percolation, and molecular simulation.'
  },
  wiki: {
    title: 'Research Wiki | Haoyu Wu',
    description: 'A code atlas for Haoyu Wu\'s software stack: PILOTS, CHANNEL, IMPACT, VELA, GNM, and pair_style-sw-as.'
  },
  leisure: {
    title: 'Rest Mode | Haoyu Wu',
    description: 'Minimal browser-based interactive relaxation modes with smooth animations and a random entry mechanic.'
  }
};
