export const profile = {
  name: 'Haoyu Wu',
  headline: 'Soft Matter Simulation · Polymer Physics · Scientific Software',
  shortTitle: 'PhD Student in Chemical & Biomolecular Engineering',
  affiliation: 'University of Notre Dame',
  location: 'South Bend, Indiana, USA',
  heroKicker: 'Coarse-grained molecular simulation · polymer physics · multiscale transport',
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
    'I study polymeric soft matter, vitrimer mechanics, and multiscale transport with simulation-first workflows that turn trajectories into observables, software, and device-relevant models.',
  bio: [
    'I am a PhD student at the University of Notre Dame in the Whitmer group. My workflow is simulation-first and physics-first: generate trajectories, formalize the observable, and turn the analysis into code that is reusable rather than one-off.',
    'Before Notre Dame, I completed both my B.E. and M.S. at Beijing University of Chemical Technology. Earlier work centered on polymers and polymer nanocomposites, especially percolation, rheology, thermal transport, glass transition, fracture, and vitrimer self-healing.'
  ],
  focusAreas: [
    'Soft-matter simulation',
    'Polymer nanocomposites',
    'Vitrimers & fracture',
    'Rheology',
    'Scientific software',
    'Transport modeling'
  ],
  quickFacts: [
    { label: 'Current home', value: 'Notre Dame' },
    { label: 'Training', value: 'B.E. 2020 + M.S. 2023, BUCT' },
    { label: 'Paper window', value: '2020–2026 on this site' },
    { label: 'Code style', value: 'Trajectory → observable → model' }
  ]
};

export const researchPillars = [
  {
    id: 'soft-materials',
    title: 'Polymer microstructure and emergent properties',
    body:
      'Coarse-grained and molecular-dynamics studies of percolation, rheology, fracture, vitrimer healing, and transport in filled and cross-linked polymer systems.'
  },
  {
    id: 'analysis-systems',
    title: 'Reusable analysis systems',
    body:
      'Trajectory parsing, structural observables, crystallization analysis, modulus extraction, and other analysis routines organized as durable software instead of one-off scripts.'
  },
  {
    id: 'multiscale-transport',
    title: 'Microscopic kernels to continuum response',
    body:
      'A current direction connects molecular observables to mesoscale and device-scale transport, especially electrochemical and mixed ionic/electronic systems.'
  }
];

export const homeSpotlights = [
  {
    title: 'Polymer nanocomposites',
    text:
      'Microstructure–property analysis across filler size, shape, percolation, thermal transport, and rheology.'
  },
  {
    title: 'Fracture and vitrimer physics',
    text:
      'Failure pathways, bond exchange, topological transition, and self-healing in dynamic polymer networks.'
  },
  {
    title: 'Scientific software',
    text:
      'From trajectory analysis to continuum solvers, the code stack is designed as a connected research system.'
  }
];

export const publications = [
  {
    id: 'ml-tg-sbr-2026',
    year: 2026,
    title: 'Machine Learning-Driven Prediction of the Glass Transition Temperature of Styrene-Butadiene Rubber',
    authors: 'Zhanglei Wang, Shuo Yan, Jingyu Gao, Haoyu Wu, Baili Wang, Xiuying Zhao, Shikai Hu',
    venue: 'Computers, Materials & Continua',
    citation: '87(1), Article 17',
    doi: '10.32604/cmc.2025.075667',
    url: 'https://doi.org/10.32604/cmc.2025.075667',
    figure: { src: 'assets/img/publications/ml-tg-sbr-2026.png', alt: 'ml-tg-sbr-2026 figure', caption: 'Model-performance figure and feature summary for Tg prediction.' },
    tags: ['Machine learning', 'Glass transition', 'Styrene-butadiene rubber', 'Prediction'],
    blurb:
      'Builds a machine-learning route for predicting Tg in styrene-butadiene rubber, extending the research arc from molecular simulation to data-driven materials inference.'
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
    figure: { src: 'assets/img/publications/vitrimer-topological-transition-2024.png', alt: 'vitrimer-topological-transition-2024 figure', caption: 'Schematic of topological transition, fracture, and healing in vitrimer composites.' },
    tags: ['Vitrimers', 'Self-healing', 'Fracture', 'Exchangeable interfaces'],
    blurb:
      'Probes how exchangeable interfaces govern topological transition, damage evolution, and healing in vitrimer composites.'
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
    figure: { src: 'assets/img/publications/glass-transition-polyisoprene-pressure-2022.jpg', alt: 'glass-transition-polyisoprene-pressure-2022 figure', caption: 'Representative structure/dynamics view around the pressure-dependent glass transition of polyisoprene.' },
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
    figure: { src: 'assets/img/publications/shape-size-viscoelasticity-2022.jpg', alt: 'shape-size-viscoelasticity-2022 figure', caption: 'Representative comparison of filler geometry effects on viscoelastic response.' },
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
    figure: { src: 'assets/img/publications/nanorods-nanospheres-2022.jpg', alt: 'nanorods-nanospheres-2022 figure', caption: 'Schematic of nanorod network manipulation by added nanospheres.' },
    tags: ['Nanorods', 'Nanospheres', 'Percolated networks', 'Molecular dynamics'],
    blurb:
      'Demonstrates that non-conductive additives can redirect nanorod network formation and alter effective transport pathways in polymer matrices.'
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
    figure: { src: 'assets/img/publications/mixed-nanoparticles-percolated-network-2021.png', alt: 'mixed-nanoparticles-percolated-network-2021 figure', caption: 'Representative mixed-filler percolation schematic.' },
    tags: ['Coarse-grained MD', 'Percolation', 'Mixed fillers', 'Nanocomposites'],
    blurb:
      'Quantifies how particle-size heterogeneity reshapes filler networks in polymer nanocomposites and highlights a route to tuning percolation by size mixing.'
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
    figure: { src: 'assets/img/publications/rheological-mechanism-spherical-np-2021.jpg', alt: 'rheological-mechanism-spherical-np-2021 figure', caption: 'Representative rheology mechanism figure for spherical nanoparticles in polymer matrices.' },
    tags: ['Rheology', 'Spherical nanoparticles', 'Nanocomposites', 'Molecular dynamics'],
    blurb:
      'Connects nanoparticle-induced structural changes to rheological response and gives a simulation-based mechanism for reinforcement in filled polymers.'
  },
  {
    id: 'thermal-conductivity-hbn-pdms-2021',
    year: 2021,
    title: 'Influence of Surface Defects on the Thermal Conductivity of Hexagonal Boron Nitride/Poly(dimethylsiloxane) Nanocomposites: A Molecular Dynamics Simulation',
    authors: 'Wenfeng Zhang, Haoxiang Li, Hanyu Jiang, Haoyu Wu, Yonglai Lu, Xiuying Zhao, Li Liu, Yangyang Gao, Liqun Zhang',
    venue: 'Langmuir',
    citation: '37(41), 12038–12048',
    doi: '10.1021/acs.langmuir.1c01697',
    url: 'https://doi.org/10.1021/acs.langmuir.1c01697',
    figure: { src: 'assets/img/publications/thermal-conductivity-hbn-pdms-2021.png', alt: 'thermal-conductivity-hbn-pdms-2021 figure', caption: 'Representative defect/thermal-transport schematic for hBN/PDMS nanocomposites.' },
    tags: ['Thermal transport', 'Boron nitride', 'PDMS', 'Molecular dynamics'],
    blurb:
      'Uses molecular simulation to connect defect structure and interfacial organization to thermal transport in boron-nitride/PDMS nanocomposites.'
  },
  {
    id: 'percolation-polydisperse-nanorods-2020',
    year: 2020,
    title: 'Percolation of polydisperse nanorods in polymer nanocomposites: Insights from molecular dynamics simulation',
    authors: 'Haoyu Wu, Haoxiang Li, Wenfeng Zhang, Fanzhu Li, Bin Li, Yangyang Gao, Xiuying Zhao, Liqun Zhang',
    venue: 'Composites Science and Technology',
    citation: '196, 108208',
    doi: '10.1016/j.compscitech.2020.108208',
    url: 'https://doi.org/10.1016/j.compscitech.2020.108208',
    figure: { src: 'assets/img/publications/percolation-polydisperse-nanorods-2020.jpg', alt: 'percolation-polydisperse-nanorods-2020 figure', caption: 'Representative graphical abstract for polydisperse nanorod percolation.' },
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
    figure: { src: 'assets/img/publications/double-interpenetrated-fracture-2020.jpg', alt: 'double-interpenetrated-fracture-2020 figure', caption: 'Representative fracture-mechanism schematic for double interpenetrated polymer networks.' },
    tags: ['Fracture', 'Double networks', 'Cross-linked polymers', 'Molecular dynamics'],
    blurb:
      'Studies how dual-network architecture and cross-link density influence fracture energy and failure pathways in interpenetrated polymer networks.'
  },
  {
    id: 'fracture-crosslinking-points-2020',
    year: 2020,
    title: 'Improving the fracture property of polymer nanocomposites by employing nanoparticles as cross-linking points',
    authors: 'Guangyao Mu, Haoxiang Li, Wei Sun, Haoyu Wu, Yanlong Luo, Yangyang Gao, Xiuying Zhao, Liqun Zhang',
    venue: 'Engineering Fracture Mechanics',
    citation: '237, 107229',
    doi: '10.1016/j.engfracmech.2020.107229',
    url: 'https://doi.org/10.1016/j.engfracmech.2020.107229',
    figure: { src: 'assets/img/publications/fracture-crosslinking-points-2020.jpg', alt: 'fracture-crosslinking-points-2020 figure', caption: 'Representative fracture/reinforcement figure using nanoparticles as cross-linking points.' },
    tags: ['Fracture', 'Grafted nanoparticles', 'Reinforcement', 'Polymer nanocomposites'],
    blurb:
      'Shows how using nanoparticles as effective cross-linking points can toughen polymer nanocomposites and redirect void nucleation and failure.'
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
    logo: 'assets/img/logos/pilots.svg',
    logoAlt: 'PILOTS logo',
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
    logo: 'assets/img/logos/channel.svg',
    logoAlt: 'CHANNEL logo',
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
    outputs: ['results.json', 'profile datasets such as psi.dat and c_*.dat', 'optional dynamic / time-series directory'],
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
    logo: 'assets/img/logos/impact.svg',
    logoAlt: 'IMPACT logo',
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
      'Supports both batch analysis and streaming / follow analysis',
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
    logo: 'assets/img/logos/vela.svg',
    logoAlt: 'VELA logo',
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
      'Stress timeseries → centered correlators → transform route → time / frequency outputs',
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
    logo: 'assets/img/logos/gnm.svg',
    logoAlt: 'GNM logo',
    cardSummary:
      'MC / GCMC package for simple Lennard–Jones particle systems with an input-driven setup similar to classical simulators.',
    headline:
      'Grand-canonical N-particle Monte Carlo simulation',
    overview:
      'GNM is a compact MC / GCMC engine for simple Lennard–Jones particle systems. It is designed both as a practical starting point for small-scale simulation work and as a teaching-friendly codebase.',
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
  { from: 'pair-style-swas', to: 'pilots', label: 'simulate' },
  { from: 'gnm', to: 'pilots', label: 'analyze' },
  { from: 'pilots', to: 'channel', label: 'kernels' },
  { from: 'pilots', to: 'vela', label: 'stress data' },
  { from: 'pilots', to: 'impact', label: 'structure' }
];


export const leisureModes = [
  {
    id: 'chain-growth-runner',
    title: 'Living Chain Growth',
    subtitle: 'Endless chain-growth polymerization',
    description:
      'Guide one active chain end through a reactor, capture monomers, lengthen the polymer, and keep inhibitors from cutting the backbone faster than you can grow it.',
    instruction:
      'Mouse / touch / WASD / arrows to steer. Monomer capture extends the chain; inhibitor collisions cut beads from the tail instead of causing an instant failure.',
    concept:
      'This is a gentle cartoon of chain-growth polymerization: local addition at one reactive end changes the global geometry and collision probability of the entire chain.',
    learning: [
      'Monomer addition is localized at the active end, but the growing tail changes crowding everywhere.',
      'Chain scission shortens the backbone instead of simply ending the process, which makes the growth–damage competition visible.',
      'Longer chains occupy more space and become more difficult to steer through the same reactor volume.'
    ]
  },
  {
    id: 'brush-channel',
    title: 'Brush Channel Transport',
    subtitle: 'Tracer transport through grafted polymer brushes',
    description:
      'Carry a tracer bead through a slowly scrolling channel whose walls are lined with swaying grafted chains. The gap opens and closes as the brushes breathe.',
    instruction:
      'Mouse / touch / WASD / arrows to steer. Stay inside the moving free-volume window and collect bright transport markers while avoiding repeated brush collisions.',
    concept:
      'The mode emphasizes steric transport: confinement and fluctuating free volume can matter as much as the mean driving force.',
    learning: [
      'Dense brushes reduce accessible free volume and create fluctuating bottlenecks.',
      'Transport is easiest when the particle motion is synchronized with local brush motion.',
      'Residence time and steric hindrance can dominate even in a simple one-particle cartoon.'
    ]
  },
  {
    id: 'bond-repair',
    title: 'Scission & Repair Sweep',
    subtitle: 'Bond scission versus dynamic healing',
    description:
      'Sweep a repair catalyst through an endless field of broken bond pairs. Reconnect cuts before reactive hot spots generate new damage and fragment the network.',
    instruction:
      'Mouse / touch / WASD / arrows to move. Touch split bond pairs to heal them; avoid red hot spots that trigger new scission events and reduce network integrity.',
    concept:
      'The loop frames network lifetime as a competition between bond scission and local repair kinetics.',
    learning: [
      'Damage is spatially localized, but enough local scission events disconnect macroscopic pathways.',
      'Repair is useful only when it reaches newly broken pairs before additional damage accumulates nearby.',
      'Dynamic networks survive by maintaining connectivity, not by preventing every bond from ever breaking.'
    ]
  },
  {
    id: 'reaction-match',
    title: 'Organic Reaction Match',
    subtitle: 'A chemistry-pair board inspired by mahjong / match play',
    description:
      'Choose compatible reagent tiles—such as diol with diacid chloride or epoxide with amine—to build an endless stream of polymer-forming reaction pairs.',
    instruction:
      'Click or tap one tile, then a compatible partner anywhere on the board. Correct pairs react, score, and are replaced by fresh reagents.',
    concept:
      'It is not a literal synthesis simulator; it is a compact way to rehearse which functional groups commonly pair to form major polymer classes or dynamic linkages.',
    learning: [
      'Different functional-group pairs map to different polymerization chemistries.',
      'Recognizing compatible partners quickly is a useful intuition-building exercise.',
      'The board stays endless by replenishing reacted pairs with new reagent opportunities.'
    ]
  },
  {
    id: 'charge-tactics',
    title: 'Charge-Hopping Tactics',
    subtitle: 'A small board game for disordered transport',
    description:
      'Move a charge packet across a lattice of conducting, doped, blocked, and trap-rich sites. Reach the collector, reroll the field, and keep the transport pathway alive.',
    instruction:
      'Click an adjacent site or use WASD / arrows. Blue sites conduct, gold sites boost score, gray sites block, and red sites trap and drain mobility.',
    concept:
      'This mode is deliberately more strategic and board-like: transport is framed as path planning through energetic disorder rather than as arcade reflexes.',
    learning: [
      'Percolation requires a connected pathway, not just a large number of sites.',
      'Dopants can stabilize high-value routes, whereas trap states reduce useful mobility.',
      'The transport problem becomes tactical when disorder and connectivity compete at each move.'
    ]
  }
];

export const pageMeta = {
  index: {
    title: 'Haoyu Wu | Soft Matter Simulation & Scientific Software',
    description:
      'Personal research homepage for Haoyu Wu: soft-matter simulation, polymer nanocomposites, multiscale transport, publications, software, and a playable rest mode.'
  },
  publications: {
    title: 'Publications | Haoyu Wu',
    description: 'Publications spanning polymer nanocomposites, thermal transport, rheology, glass transition, fracture, vitrimers, and molecular simulation.'
  },
  wiki: {
    title: 'Research Wiki | Haoyu Wu',
    description: 'A code atlas for Haoyu Wu\'s simulation and analysis stack: PILOTS, CHANNEL, IMPACT, VELA, GNM, and pair_style-sw-as.'
  },
  leisure: {
    title: 'Rest Mode | Haoyu Wu',
    description: 'Five endless browser sketches for polymerization, catalytic transport, charge hopping, vitrimer healing, and wormlike chain motion.'
  }
};
