# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal portfolio site for Shaikh Ahmed, served via GitHub Pages from the `docs/` directory at https://shaikhahme.github.io/. There is no build step, package manager, or test suite — it's static HTML/CSS/JS plus a one-off Python data-prep script.

## Architecture

- `docs/index.html` — single-page site with anchor-linked sections (`#about`, `#knowledge`, `#project`, `#contact`). Loads jQuery, `script.js`, `styles.css`, Cytoscape.js, and `app.js` directly via `<script>`/`<link>` tags — no bundler.
- `docs/script.js` — jQuery behavior for the main page: fades sections into view on scroll (`in-view` class) and toggles "Read More/Less" text in the About section.
- `docs/app.js` — renders an interactive knowledge-graph visualization in the `#knowledge` section using Cytoscape.js, fetching `docs/data/graph.json`. Nodes are topics (sized/labeled by `size`/`label`), edges represent topic similarity. Hovering highlights connected edges/nodes; right-click (`cxttapstart`/`cxttapend`) swaps a node's label for its `desc` field.
- `docs/data/topics.json` — source list of knowledge-base topics, each with `label`, `desc` (short), `longDesc` (used for similarity), and `rank` (drives node size).
- `docs/data/graph.json` — generated Cytoscape elements (`nodes`/`edges`) consumed by `app.js`. Regenerate it from `topics.json` rather than hand-editing.
- `scripts/generate-gk-script.py` — builds `docs/data/graph.json` from `docs/data/topics.json`: TF-IDF vectorizes each topic's `longDesc`, computes pairwise cosine similarity, and adds an edge between two topics when similarity exceeds `0.2`. Requires `scikit-learn`. Run from the repo root:
  ```
  python scripts/generate-gk-script.py
  ```
- The "Project Description" section embeds an external Canva iframe; the "Contact Me" form POSTs to a Google Apps Script endpoint — both are external integrations, not part of this repo's code.

## Working in this repo

- Changes to `docs/` deploy automatically via GitHub Pages on push to `main` — there is no CI/build pipeline to run first.
- When editing knowledge-base topics, update `topics.json` and regenerate `graph.json` with the script above rather than editing the generated file directly.

# TASK
Help me rehaul the entire portfolio, i want to be heavily animated, proffesional but personal portfolio, it should have 4 Sections, About Me, Projects/Research, Knowldege, Contact Me.
The theme inspiration should be the vintage Vinyl with Black, Red Rings, etc. the cursor should be move like a spotlight. Feel free to use animations for online libraries of animations

1. About Me
scrollable animation. Scrolling (top view) Rotates a vinyl record with a animation in the midddle and the text surrounds the disc.
the centre animation shoudl go from a dot,to a line, triangle, pyramid, Cube,and so on with 3D Shapes.

The text here should be
Age 7: In India, Cousin taught me how to crack games
Age 9: In Dubai learnt how to brute force wifi networks unsuccesfully but still broke into my neighbours network to play adobe flash games
Age 13:  Installed KALI linux for the first time and took down my own internet try to configure port forwarding for a trojan
Age 13-16: Did CTFs for the first time, taught myself programming, became a script kiddie addict to get free minecraft accounts
Age 17: Moved to Germany and Started my Bachelors in Electrical and Electronics Engineering with a focus on Networks to formalise my education about networks and eventually Cybersecurity
Age 18: Recieved Deutschland Stipendium, Leadership position in the FSR and AStA motivating engineers and restarting the communicty for the university
Age 20:  Signed my contract with Cumulocity IoT, a SaaS company delivering IoT solutions where I worked as werkstudent in backend, product security, red teaming, devsecops and vulnerability management
Age 22: Moved to France, worked as a researcher and did my semester abroad focusing only on security subjects - published my first paper via an IEEE conference on Cyber Threat Intelligence for IoTs using NLP and ML filtering (CTIoT)
Age 23 - Present: Graduated from Electrical Engineering, Signed my Contract with NavVis as an Information Security Manager where I work on ISO 27001, SOC 2, Asset Management, Third Party Security, AI Governance. Started studying my MSc. in TUM focusing on AI Allginment, Security and Governance
Age 24: Conducted Trainigs on AI Automation, AI Security and Leading a team for AI Automation across the company

Under the Record should be this text but make it sound slightly better, do not lose the human touch, do not add any big words, or dashes, etfc.
A mentor i looked upto once asked me what is your virtue, what drives you when nothing does - and i replied learning, maybe too fast to be believable. I sat with that response for months before realising that it is true to my core. At the end of the day, the the things that bring me joy can be boiled down to learning new things, being in a community and helping that community. This paired with my affinity to tech and psychology led me to cybersecurity, specially cybersecurity's intersection with Artifical Intellignece. Today - AI Allignment and Safety, a space that is only becoming bigger of an issue to our society has caught my interest. 

Create the first section adn use placeholders for the others, Ask me any questions about the first section before moving on.


issues:
1. Nav Bar
   2. Centre the buttons
   3. About Section never gets the red underline, fix bug
2. About Me
   3. Whats your virtue, paragraphed better for readability
   4. make the buttons stacked below that para, rewrite the text to Contact me -> "Tell me about your virtue?"
   5. Increase the senstivity of the scoll, curerently it takes too long to get to the end of the scroll animation of the vinyl
   6. Rework the shape animation in the centree its not reveersable in the scroll, some shapes are not centred, weird dots on it after a certain number, use clean simple 3d shapes if that requires too much work, use clean simple 2d shapes
   7. The disc moves based on the size of the text make it stuck 
5. Projects
   6. Tiles instead of a list, tiles are side by side
   7. Each tile has an image, a name below it, some short description. should feel similar to vinyl albumbs
   7. button on the bottom that takkes them to my github
   8. Future work(if easy animate now): The tiles should feel like Vinyl Covers being pulled out of a box, horizontal scroll bar on the bottom to allow scrolling
9. Knolwedge Base
   10. Rework the python script 
       11. Python script should be reworked as an AI Agent called the Knowledge Agent. its Job is to 
       12. Read my knowledge sources (for now joplin and one github repo)
       13. Store it as a vector database locally
       13. Process it and store it in the format according to the data directory
       14. this agent also is based on the AA Protocol developed by google so it can be communicated with via other agents.
   15. Rework Graph visualtion
       16. Better melded with the website
       17. Use Front end libraries that are relevant to create a 3D Interactable Dynamic graph, cluster according to labels, see the graph.json to creata a accesbile graph.
   18. Create a small chatbot below the graph that allows you to talk to knowledge agent
19. About Me
    20. Fix bugs
    