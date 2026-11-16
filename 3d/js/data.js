/* Project content of the immersive version, extracted from the classic index.html (same wording). */
window.ND_PROJECTS = [
 {
  "id": "ligue1",
  "demo": "ligue1",
  "cat": [
   "ai"
  ],
  "color": "#FFCC00",
  "file": "ligue1_model.ipynb",
  "title": "Ligue 1 Match Predictor",
  "tag": "MACHINE LEARNING",
  "text": "Can a model call a French football match before kick-off? I merged 8 data files (more than 10 seasons of matches, player market values, lineups, cards) into one clean table, built new features such as the budget gap and each team's recent form, and trained three classifiers to predict home win, draw or away win for the 2025 season.",
  "facts": [
   "Rolling \"last 5 matches\" features, shifted by one game so the model never sees the result it predicts",
   "Split by time: trained up to 2022, tested on 2023–24",
   "52% accuracy vs a 44% baseline; feature selection kept almost the same score with only 3 variables"
  ],
  "stack": [
   "Python",
   "pandas",
   "scikit-learn",
   "seaborn"
  ],
  "foot": "Group project · predictions for 233 matches",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"random\" style=\"background:#FFCC00\" type=\"button\">Random match <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><button class=\"pill-btn ghost\" data-act=\"mode\" data-out=\"mode\" type=\"button\">Model scores</button><span class=\"pip-note\" data-out=\"note\">drag the sliders</span>"
 },
 {
  "id": "siem",
  "demo": "siem",
  "cat": [
   "ai"
  ],
  "color": "#fb7185",
  "file": "soc_dashboard",
  "title": "Security Dashboards (Cyber Internship)",
  "tag": "DATA · CYBERSECURITY",
  "text": "In the cybersecurity team of a large company, analysts were spending a lot of time reading raw logs by hand. I built dashboards in CrowdStrike Next-Gen SIEM that turn logs from the EDR (Falcon) and the web proxy (Netskope) into clear views, so the team can spot data leaks and suspicious behaviour much faster.",
  "facts": [
   "Defined the key investigation scenarios with the team, then wrote and optimised the queries",
   "Dashboards: files leaked by a given user, suspicious SharePoint activity, map of USB exfiltration events",
   "Hourly scheduled searches that alert the team when a massive data exfiltration is likely"
  ],
  "stack": [
   "CrowdStrike NG-SIEM",
   "Falcon EDR",
   "Netskope",
   "Log queries"
  ],
  "foot": "Internship · summer 2025",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"exfil\" style=\"background:#fb7185\" type=\"button\">Simulate a data leak</button><span class=\"pip-note\" data-out=\"note\">simulated USB activity · no real data</span>"
 },
 {
  "id": "mit",
  "demo": "mit",
  "cat": [
   "more"
  ],
  "color": "#38bdf8",
  "file": "rlnc_simulation.ipynb",
  "title": "Network Coding Research (MIT)",
  "tag": "RESEARCH · NETWORKS",
  "text": "Six-week research internship in Muriel Médard's Network Coding and Reliable Communications Group at MIT, with three classmates. After simulating noisy channels in Python, I worked on Random Linear Network Coding for the SNOB 5G project: packets are mixed with random coefficients, sent over a lossy channel, and rebuilt by inverting a matrix as soon as enough of them arrive.",
  "facts": [
   "Added retransmissions, then measured throughput and delay over 40,000 generations for different loss rates",
   "Derived the theoretical delay with binomial probabilities: it matched our simulations",
   "Presented our results to Prof. Médard"
  ],
  "stack": [
   "Python",
   "NumPy",
   "Matplotlib",
   "Probability"
  ],
  "foot": "Research internship · Boston · summer 2022",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"p\" style=\"background:#38bdf8\" type=\"button\"><span data-out=\"p\">loss 20%</span> <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><button class=\"pill-btn ghost\" data-act=\"mode\" type=\"button\"><span data-out=\"mode\">Research result</span></button>"
 },
 {
  "id": "uttt",
  "demo": "uttt",
  "cat": [
   "ai",
   "sw"
  ],
  "color": "#a78bfa",
  "file": "ultimate_tictactoe.py",
  "title": "Ultimate Tic-Tac-Toe AI",
  "tag": "GAME AI",
  "text": "An AI for Ultimate Tic-Tac-Toe, a 9×9 version where each move decides which small board your opponent has to play in next. It uses minimax with alpha-beta pruning and iterative deepening: it searches deeper and deeper until its time is up, and keeps the best move found so far. The demo is a JavaScript port of my Python code.",
  "facts": [
   "Transposition table so positions already analysed are never searched twice",
   "Killer-move and history heuristics to try the most promising moves first",
   "Hand-tuned evaluation: won boards, two-in-a-rows, control of the centre"
  ],
  "stack": [
   "Python",
   "Minimax",
   "Alpha-beta",
   "Heuristics"
  ],
  "foot": "Search algorithms · personal project",
  "run": "Play the AI",
  "ctrl": "<button class=\"pill-btn\" data-act=\"new\" style=\"background:#a78bfa\" type=\"button\">New game <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><button class=\"pill-btn ghost\" data-act=\"watch\" data-out=\"mode\" type=\"button\">Watch AI vs AI</button><span class=\"pip-note\" data-out=\"note\">you are X · click a cell</span>"
 },
 {
  "id": "fabrique",
  "demo": "fabrique",
  "cat": [
   "sw"
  ],
  "color": "#818cf8",
  "file": "la_fabrique.py",
  "title": "La Fabrique",
  "tag": "STARTUP · WEB APP",
  "text": "Winner of the <strong>Prix Esprit Start-up</strong> at the ESILV P2IP showroom (about 140 teams). La Fabrique helps people turn old clothes into new objects: you take a photo of a garment, the app estimates its material and usable fabric, suggests sewing patterns that fit, checks that the pieces can be cut from it, and shows the water and CO₂ saved.",
  "facts": [
   "Months of work as a startup team: user needs, specifications, business model, working prototype",
   "Mobile-first web app with step-by-step guides, printable PDF patterns and a \"circular passport\" with QR code",
   "Gamified community: share your creations, earn coins and badges"
  ],
  "stack": [
   "Django",
   "PostgreSQL",
   "Product design",
   "Business model"
  ],
  "foot": "P2IP team project · 2025–2026",
  "link": {
   "href": "https://la-fabrique.onrender.com/",
   "label": "Open the app",
   "icon": "arrow-up-right"
  },
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"restart\" style=\"background:#818cf8\" type=\"button\">Restart demo <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><a class=\"pill-btn ghost\" href=\"https://la-fabrique.onrender.com/\" rel=\"noopener\" target=\"_blank\">Real app <svg class=\"ic\"><use href=\"#i-arrow-up-right\"></use></svg></a><span class=\"pip-note\" data-out=\"note\">simplified demo · not the real app</span>"
 },
 {
  "id": "livin",
  "demo": "livin",
  "cat": [
   "sw"
  ],
  "color": "#fbbf24",
  "file": "Graphe.cs",
  "title": "Liv'in Paris",
  "tag": "GRAPHS · DATABASES",
  "text": "A C# platform where home cooks sell meals to people in Paris, with a MySQL database for users, dishes and orders. Deliveries follow the real metro network: we modelled every station as a graph and implemented Dijkstra, Bellman-Ford and Floyd-Warshall to find the fastest route between cook and customer.",
  "facts": [
   "Graph tools: connectivity, cycle detection, Welsh-Powell colouring",
   "Statistics: best customers, deliveries per cook, average order price",
   "WinForms visualisation, JSON/XML export, unit tests with MSTest"
  ],
  "stack": [
   "C#",
   ".NET",
   "MySQL",
   "Graph algorithms"
  ],
  "foot": "Team of 3 · 2025",
  "link": {
   "href": "https://github.com/nils-demougeot/livin_paris",
   "label": "View on GitHub",
   "icon": "github"
  },
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"random\" style=\"background:#fbbf24\" type=\"button\">Random trip <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><button class=\"pill-btn ghost\" data-act=\"algo\" type=\"button\"><span data-out=\"algo\">Dijkstra</span></button><span class=\"pip-note\" data-out=\"note\">click two stations</span>"
 },
 {
  "id": "tips",
  "demo": "tips",
  "cat": [
   "ai"
  ],
  "color": "#2dd4bf",
  "file": "tipping_norway.ipynb",
  "title": "Tipping Behaviour Analysis",
  "tag": "STATISTICS",
  "text": "Descriptive statistics on a survey of 709 people in Norway about restaurant tips. With two classmates, I studied one variable of each type (binary, ordinal, discrete, continuous): frequency tables, quartiles, variance, box plots, ECDF, and outlier detection with the IQR rule. The demo uses our real results.",
  "facts": [
   "Response time: mean 148 s but median 105 s, a strongly skewed variable",
   "48 outliers found with the 1.5 × IQR rule, shown on a log scale"
  ],
  "stack": [
   "Python",
   "pandas",
   "NumPy",
   "Matplotlib"
  ],
  "foot": "Team of 3 · statistics course",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn ghost on\" data-act=\"rt\" type=\"button\">Response time</button><button class=\"pill-btn ghost\" data-act=\"fin\" type=\"button\">Finances</button><button class=\"pill-btn ghost\" data-act=\"age\" type=\"button\">Age</button><button class=\"pill-btn ghost\" data-act=\"svc\" type=\"button\">Service</button>"
 },
 {
  "id": "boggle",
  "demo": "boggle",
  "cat": [
   "sw"
  ],
  "color": "#fb923c",
  "file": "Plateau.cs",
  "title": "Boggle with AI",
  "tag": "ALGORITHMS",
  "text": "A console Boggle game in C#, in French or English, with a custom board size and round time, and an AI opponent with three difficulty levels. Dice letters follow real frequency weights, the dictionary is sorted with merge sort and searched by binary search, and a recursive search checks that each word really exists on the board.",
  "facts": [
   "Recursive depth-first search through the 8 neighbours of each letter",
   "A word cloud image of every word found is generated at the end of the game"
  ],
  "stack": [
   "C#",
   ".NET",
   "Recursion",
   "OOP"
  ],
  "foot": "School project · 2025",
  "link": {
   "href": "https://github.com/nils-demougeot/boggle",
   "label": "View on GitHub",
   "icon": "github"
  },
  "run": "Play",
  "ctrl": "<button class=\"pill-btn\" data-act=\"shuffle\" style=\"background:#fb923c\" type=\"button\">New board <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><button class=\"pill-btn ghost\" data-act=\"size\" type=\"button\"><span data-out=\"size\">4×4</span></button><button class=\"pill-btn ghost\" data-act=\"ai\" type=\"button\">Let the AI play</button>"
 },
 {
  "id": "quake",
  "demo": "quake",
  "cat": [
   "hw"
  ],
  "color": "#34d399",
  "file": "stabilizer.ino",
  "title": "Earthquake-Resistant Platform",
  "tag": "EMBEDDED",
  "text": "Year-long project in a team of six: a model building that stays level during an earthquake. A laser-cut box holds the Arduino and the batteries; above it, two servo motors stacked at 90° correct the pitch and the roll measured by an MPU6050 gyroscope, keeping the LED panel and the 3D-printed tower level. Parts are wood and recycled plastic.",
  "facts": [
   "Sensor reading and real-time correction loop programmed on the Arduino",
   "CAD, machining, electronics and 3D printing, all done by the team"
  ],
  "stack": [
   "Arduino",
   "C++",
   "MPU6050",
   "CAD"
  ],
  "foot": "PIX 2 · team of 6 · 2024–2025",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"quake\" style=\"background:#34d399\" type=\"button\">Trigger quake</button><button class=\"pill-btn ghost\" data-act=\"stab\" type=\"button\"><i class=\"stab-dot\" id=\"stabDot\"></i><span id=\"stabLabel\">Stabilizer ON</span></button><span class=\"pip-note\"><b class=\"amber\">pitch <span id=\"pitch\">0.0</span>°</b> · <b class=\"indigo\">roll <span id=\"roll\">0.0</span>°</b></span>"
 },
 {
  "id": "rpg",
  "demo": "rpg",
  "cat": [
   "sw"
  ],
  "color": "#f472b6",
  "file": "jeu.cpp",
  "title": "Alterdune, a C++ RPG",
  "tag": "C++ · OOP",
  "text": "A turn-based console RPG in C++, inspired by Undertale: in each fight you can attack, use an item, or calm the monster down with actions until you are allowed to spare it. Monsters and items are loaded from CSV files, and the code is built around classes and inheritance (normal monsters, mini-bosses, bosses) with manual memory management.",
  "facts": [
   "Damage = attack + random bonus − defence, with 10% critical hits",
   "Loot by rarity (60% common, 30% rare, 10% epic) and a pacifist ending after 10 wins"
  ],
  "stack": [
   "C++",
   "OOP",
   "Inheritance",
   "CSV"
  ],
  "foot": "School project · 2026",
  "link": {
   "href": "https://github.com/nils-demougeot/RPG-game",
   "label": "View on GitHub",
   "icon": "github"
  },
  "run": "Play",
  "ctrl": "<div class=\"rpg-menu\" data-out=\"menu\"></div>"
 },
 {
  "id": "distraction",
  "demo": null,
  "cat": [
   "more"
  ],
  "color": "#4ade80",
  "file": "distraction_guard.pdf",
  "title": "DistractionGuard",
  "tag": "HACKATHON",
  "text": "Inter-school hackathon on hyperconnectivity: how can we limit phone distractions so students focus better? Our team designed DistractionGuard, a low-tech bracelet that vibrates when you reach for your phone out of habit, with an app that shows a daily distraction report so you can see your own habits in numbers.",
  "facts": [
   "Starting point: 43% of French students feel nervous when their phone is out of reach",
   "Low-tech on purpose: cheap, light, small environmental footprint",
   "Full pitch: stakeholders, QQOQCP analysis, business model, app mock-up and prototype"
  ],
  "stack": [
   "Product design",
   "Business model",
   "Pitch"
  ],
  "foot": "ESILV · EMLV · IIM hackathon"
 },
 {
  "id": "sport",
  "demo": null,
  "cat": [
   "more"
  ],
  "color": "#38bdf8",
  "file": "sport_hackathon.pdf",
  "title": "Inclusive Sport Hackathon",
  "tag": "HACKATHON",
  "text": "A 3-day hackathon with 1,300 first-year students from three schools (engineering, management, digital design) on making sport more sustainable and inclusive, using the UN Sustainable Development Goals. Our mixed team worked on gender equality at the Olympics and proposed inter-school tournaments mixing sport and intellectual challenges for teenagers in the Hauts-de-Seine.",
  "facts": [
   "Work phases with and without generative AI, to keep our own critical thinking",
   "Final pitch in front of a jury"
  ],
  "stack": [
   "Teamwork",
   "Design thinking",
   "UN SDGs",
   "Pitch"
  ],
  "foot": "Pôle Léonard de Vinci · March 2024"
 },
 {
  "id": "hexapod",
  "demo": "hexapod",
  "cat": [
   "hw"
  ],
  "color": "#fb923c",
  "file": "hexapod.SLDASM",
  "title": "Hexapod Robot",
  "tag": "ROBOTICS",
  "text": "Year-long project in a team of six: a six-legged robot inspired by insects, driven by only two electric motors. We designed the whole robot in SolidWorks, worked out the gear ratios to get the right balance between speed and torque, and cut every wooden part with a laser cutter.",
  "facts": [
   "Each leg is moved by a crank and slides in a slot, so a simple rotation becomes a walking step",
   "Legs move in two groups of three (tripod gait), so the robot always stands on three feet"
  ],
  "stack": [
   "SolidWorks",
   "Gear design",
   "Laser cutting",
   "Electronics"
  ],
  "foot": "PIX 1 · team of 6 · 2023–2024",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"ratio\" style=\"background:#fb923c\" type=\"button\">Gear ratio <span data-out=\"ratio\">1:5</span> <svg class=\"ic\"><use href=\"#i-refresh\"></use></svg></button><span class=\"pip-note\" data-out=\"note\">legs balanced · torque ×5</span>"
 },
 {
  "id": "h160",
  "demo": "h160",
  "cat": [
   "hw"
  ],
  "color": "#818cf8",
  "file": "H160.SLDASM",
  "title": "Airbus H160 in 3D",
  "tag": "CAD",
  "text": "Group project: a detailed 3D model of the Airbus H160 helicopter in SolidWorks, reproducing its structure and design details as accurately as possible, from the five-blade rotor to the fenestron tail. Good training in complex assemblies and in splitting a large model across a team.",
  "facts": [],
  "stack": [
   "SolidWorks",
   "3D modelling",
   "Assemblies"
  ],
  "foot": "Group project · ESILV",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"explode\" style=\"background:#818cf8\" type=\"button\"><span data-out=\"explode\">Exploded view</span></button><button class=\"pill-btn ghost\" data-act=\"rotor\" type=\"button\"><span data-out=\"rotor\">Rotor ON</span></button><span class=\"pip-note\">drag to orbit</span>"
 },
 {
  "id": "doovoirs",
  "demo": null,
  "cat": [
   "sw"
  ],
  "color": "#fbbf24",
  "file": "index.php",
  "title": "Doovoirs",
  "tag": "WEB APP",
  "text": "A homework-help forum where students help each other. I first pitched the idea at a contest; it was turned down, so I built it myself. Students post a question with its subject and deadline, others answer, and posts can be liked, searched and filtered by subject. My first dynamic website with PHP and a SQL database.",
  "facts": [],
  "stack": [
   "PHP",
   "MySQL",
   "HTML / CSS",
   "JavaScript"
  ],
  "foot": "Personal project · 2023",
  "link": {
   "href": "https://github.com/nils-demougeot/doovoirs",
   "label": "View on GitHub",
   "icon": "github"
  }
 },
 {
  "id": "vivesmap",
  "demo": null,
  "cat": [
   "sw"
  ],
  "color": "#2dd4bf",
  "file": "autocomplete.php",
  "title": "Vives Map",
  "tag": "WEB APP",
  "text": "In my high school, classrooms were named after famous people (Newton, Molière…) with no logic, so nobody knew where to go. I built an interactive map: type a room name, autocomplete finds it among 60 rooms, and the app shows its floor on a 3D map I modelled in Blender. It was shared with the whole school.",
  "facts": [],
  "stack": [
   "PHP",
   "JavaScript",
   "Blender",
   "Adobe XD"
  ],
  "foot": "Personal project · 2021",
  "link": {
   "href": "https://github.com/nils-demougeot/vivesmap",
   "label": "View on GitHub",
   "icon": "github"
  }
 },
 {
  "id": "boudoubox",
  "demo": null,
  "cat": [
   "sw"
  ],
  "color": "#FFCC00",
  "file": "boudoubox.com",
  "title": "BoudouBox Website",
  "tag": "WEBSITE · SEO",
  "text": "Website for BoudouBox, a self-storage company in Agde renting boxes from 1 to 10 m². I handled the full process: design in Figma, build in Webflow, responsive layout for phones, and SEO work so the business shows up in local searches as it grows.",
  "facts": [],
  "stack": [
   "Figma",
   "Webflow",
   "SEO",
   "Responsive design"
  ],
  "foot": "Client project",
  "link": {
   "href": "https://www.boudoubox.com/",
   "label": "Visit the site",
   "icon": "arrow-up-right"
  }
 },
 {
  "id": "seechy",
  "demo": null,
  "cat": [
   "more"
  ],
  "color": "#fb7185",
  "file": "@seechyTech",
  "title": "Seechy, a Tech YouTube Channel",
  "tag": "YOUTUBE",
  "text": "A YouTube channel where I explain computer science ideas in simple terms. Each video means finding the right words and the right visuals to make a technical topic easy to follow. It takes a lot of time, so there are only a few videos, but it taught me how to explain complex things clearly.",
  "facts": [],
  "stack": [
   "Script writing",
   "Video editing",
   "Explaining tech"
  ],
  "foot": "Personal project",
  "link": {
   "href": "https://www.youtube.com/@seechyTech",
   "label": "Watch on YouTube",
   "icon": "play"
  }
 },
 {
  "id": "rocket",
  "demo": "rocket",
  "cat": [
   "hw"
  ],
  "color": "#a78bfa",
  "file": "rocket.nc",
  "title": "Wooden Rocket Puzzle",
  "tag": "CAD · CNC",
  "text": "Our first CAD project: a 3D rocket puzzle of about 30 wooden pieces, made only from small pre-cut boards. We modelled every piece in SolidWorks, then generated the G-code to cut them on a CNC machine. Stacked slices slot onto two crossed spines, and two crossed arches make the fins.",
  "facts": [],
  "stack": [
   "SolidWorks",
   "G-code",
   "CNC machining"
  ],
  "foot": "Academic project · ESILV",
  "run": "Run demo",
  "ctrl": "<button class=\"pill-btn\" data-act=\"step\" style=\"background:#a78bfa\" type=\"button\"><span data-out=\"step\">CNC cut</span> <svg class=\"ic\"><use href=\"#i-chevron-right\"></use></svg></button><span class=\"pip-note\" data-out=\"note\">the finished puzzle · drag to orbit</span>"
 }
];
