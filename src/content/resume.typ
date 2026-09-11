#import "@preview/rendercv:0.3.0": *

#show: rendercv.with(
  name: "Hu Bowen",
  title: "Hu Bowen - CV",
  footer: context { [#emph[Hu Bowen -- #str(here().page())\/#str(counter(page).final().first())]] },
  top-note: [ #emph[Last updated in Aug 2026] ],
  locale-catalog-language: "en",
  text-direction: ltr,
  page-size: "us-letter",
  page-top-margin: 0.5in,
  page-bottom-margin: 0.5in,
  page-left-margin: 0.5in,
  page-right-margin: 0.5in,
  page-show-footer: true,
  page-show-top-note: false,
  colors-body: rgb(0, 0, 0),
  colors-name: rgb(0, 0, 0),
  colors-headline: rgb(0, 0, 0),
  colors-connections: rgb(0, 0, 0),
  colors-section-titles: rgb(0, 0, 0),
  colors-links: rgb(0, 0, 0),
  colors-footer: rgb(128, 128, 128),
  colors-top-note: rgb(128, 128, 128),
  typography-line-spacing: 0.6em,
  typography-alignment: "justified",
  typography-date-and-location-column-alignment: right,
  typography-font-family-body: "XCharter",
  typography-font-family-name: "XCharter",
  typography-font-family-headline: "XCharter",
  typography-font-family-connections: "XCharter",
  typography-font-family-section-titles: "XCharter",
  typography-font-size-body: 10pt,
  typography-font-size-name: 25pt,
  typography-font-size-headline: 10pt,
  typography-font-size-connections: 9pt,
  typography-font-size-section-titles: 1.3em,
  typography-small-caps-name: false,
  typography-small-caps-headline: false,
  typography-small-caps-connections: false,
  typography-small-caps-section-titles: false,
  typography-bold-name: true,
  typography-bold-headline: false,
  typography-bold-connections: false,
  typography-bold-section-titles: true,
  links-underline: false,
  links-show-external-link-icon: false,
  header-alignment: center,
  header-photo-width: 3.5cm,
  header-space-below-name: 0.5cm,
  header-space-below-headline: 0.5cm,
  header-space-below-connections: 0.5cm,
  header-connections-hyperlink: true,
  header-connections-show-icons: false,
  header-connections-display-urls-instead-of-usernames: false,
  header-connections-separator: "•",
  header-connections-space-between-connections: 0.4cm,
  section-titles-type: "with_full_line",
  section-titles-line-thickness: 0.5pt,
  section-titles-space-above: 0.5cm,
  section-titles-space-below: 0.2cm,
  sections-allow-page-break: true,
  sections-space-between-text-based-entries: 0.3em,
  sections-space-between-regular-entries: 1em,
  entries-date-and-location-width: 4.15cm,
  entries-side-space: 0.2cm,
  entries-space-between-columns: 0.1cm,
  entries-allow-page-break: false,
  entries-short-second-row: false,
  entries-degree-width: 1cm,
  entries-summary-space-left: 0cm,
  entries-summary-space-above: 0cm,
  entries-highlights-bullet: "•",
  entries-highlights-nested-bullet: "•",
  entries-highlights-space-left: 0.15cm,
  entries-highlights-space-above: 0cm,
  entries-highlights-space-between-items: 0cm,
  entries-highlights-space-between-bullet-and-text: 0.5em,
  date: datetime(
    year: 2026,
    month: 3,
    day: 20,
  ),
)


= Hu Bowen

#connections(
  [Singapore],
  [#link("mailto:contact@hubowen.dev", icon: false, if-underline: false, if-color: false)[contact\@hubowen.dev]],
  [#link("https://linkedin.com/in/hubowen", icon: false, if-underline: false, if-color: false)[in/hubowen]],
  [#link("https://github.com/notbowen", icon: false, if-underline: false, if-color: false)[github.com/notbowen]],
)


== Profile

Self-driven computer science student with interests spanning artificial intelligence, cybersecurity, programming languages, and computer systems. Strong academic record complemented by achievements in cybersecurity and artificial intelligence competitions. Interested in deepening my understanding of programming language theory, hardware design, artificial intelligence, and software exploitation.


== Education

#education-entry(
  [
    #strong[Ngee Ann Polytechnic], Cybersecurity \& Digital Forensics -- Singapore, SG

  ],
  [
    Apr 2023 – Apr 2026
  ],
  degree-column: [
    #strong[Dip.]
  ],
  main-column-second-row: [
    - GPA: 3.98/4.00

    - Diploma with Merit (7 module prizes; placed first for 3 modules)

    - DSTA Polytechnic Digital Scholar

    - Vice-President, NullSec (Cybersecurity Interest Group)
  ],
)

== Experience

#regular-entry(
  [
    #strong[Defence Science \& Technology Agency], Cybersecurity Intern -- Singapore, SG

  ],
  [
    Mar 2025 - Mar 2026
  ],
  main-column-second-row: [
    - Maintained an internal Large Language Model (LLM) safety evaluation tool

    - Researched and benchmarked adversarial attacks on systems using modern Natural Language Processing (NLP) techniques
  ],
)

== Projects

#regular-entry(
  [
    #strong[#link("https://github.com/notbowen/advent-of-fpga-2025")[Advent of FPGA 2025]]

  ],
  [
    Jan 2026
  ],
  main-column-second-row: [
    #summary[Implemented Advent of Code solutions on an FPGA with Jane Street's DSL]

    - Wrote logic similar to the Game of Life by using shift registers and line buffers to represent a convolution window

    - Achieved a 100x speedup relative to my naive solution in OCaml

  ],
)

#regular-entry(
  [
    #strong[#link("https://github.com/notbowen/SimpleOS")[SimpleOS]]

  ],
  [
    May 2022 - Jun 2022
  ],
  main-column-second-row: [
    #summary[Bare metal operating system from scratch]

    - Implemented a bootloader in x86 assembly to load a C kernel in 32 bit mode

    - Wrote a basic command parser and a text-based Snake game directly in the kernel

  ],
)

== Competitions

#regular-entry(
  strong[DSTA Brainhack TIL-AI 2026 – Finalist],
  [Jun 2026],
  main-column-second-row: [
    #summary[AI competition testing across ASR, CV, NLP and RL]

    - Placed 1#super[st] in the novice category during qualifiers

    - Fine-tuned multiple RT-DETR models for CV and routed images depending on model confidence
    
    - Implemented Proximal Policy Optimization (PPO) with Prioritized Fictitious Self-Play (PFSP) for RL

    - Ported the entire RL environment onto the GPU by rewriting it in JAX, achieving a 1000x speedup in raw FPS
  ],
)

#regular-entry(
  strong[National Olympiad in Artificial Intelligence 2026 -- Gold],
  [Mar 2026],
  main-column-second-row: [
    #summary[Only Polytechnic student to attain Gold in NOAI 2026]

    - Answered 20 in-depth MCQs on various technical aspects of AI

    - Wrote a gradient boosting regressor in Python; debugged and completed a PyTorch U-NET implementation

    - Implemented multi-head scaled dot product attention with PyTorch

  ],
)

#regular-entry(
  strong[WorldSkills Singapore 2025 (Cyber Security) -- Bronze],
  [Apr 2025],
  main-column-second-row: [
    #summary[National cybersecurity competition held over 3 days]

    - Configured Cisco firewalls to isolate a cloud environment from the internet

    - Only competitor to successfully exploit a vulnerable web application, placing us in first place for that component

  ],
)

== Notable Achievements

#grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  row-gutter: 0.65em,
  align: (left, right),

  [The InfoSecurity Challenge \@ DEFCON SG *(2026)*], [Finalist],
  [The InfoSecurity Challenge *(2023, 2025)*], [Top 5%],
  [Singapore AI CTF *(2025)*], [Pre-U -- 2#super[nd] Place],
  [NiCE Hack *(2025)*], [2#super[nd] Place],
  [DSTA Brainhack CDDC *(2023)*], [Poly -- Bronze],
)
