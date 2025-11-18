const LEVELS_RABBIT = [
  // === 1–5: only exit ===
  {
    size: 5,
    grid: [
      "..W..",
      "....E",
      ".W.W.",
      "..R.W",
      ".W.WW"
    ],
    goal: "Llega al 🚪 en 4 pasos.",
    maxBlocks: 15,
    needCarrots: false,
    hint: "Baja y gira a la derecha."
  },
  {
    size: 5,
    grid: [
      "R....",
      ".WWWW",
      "...WW",
      ".WEW.",
      "WWWWW"
    ],
    goal: "Alcanza el 🚪 mientras evitas las paredes.",
    maxBlocks: 15,
    needCarrots: false,
    hint: "Muévete en zigzag alrededor de las paredes."
  },
  {
    size: 5,
    grid: [
      "R....",
      "WW.W.",
      ".....",
      ".W.W.",
      "....E"
    ],
    goal: "Llega al 🚪 a través del laberinto.",
    maxBlocks: 15,
    needCarrots: false,
    hint: "Baja y luego gira a la derecha."
  },
  {
    size: 5,
    grid: [
      "R.W..",
      ".W.W.",
      "...W.",
      ".W...",
      "...E."
    ],
    goal: "Encuentra un camino hacia el 🚪.",
    maxBlocks: 15,
    needCarrots: false,
    hint: "Busca una ruta a través de las celdas libres."
  },
  {
    size: 5,
    grid: [
      "R...W",
      ".W.W.",
      ".....",
      "W.W.W",
      "E...."
    ],
    goal: "Una ruta complicada hacia el 🚪.",
    maxBlocks: 15,
    needCarrots: false,
    hint: "Muévase en zigzag hacia abajo y hacia la izquierda."
  },

  // === 6–10: carrots + exit ===
  {
    size: 5,
    grid: [
      "R.CWW",
      ".W..W",
      "..CW.",
      ".W...",
      "..WWE"
    ],
    goal: "Recoge el 🥕 y llega al 🚪",
    maxBlocks: 15,
    needCarrots: true,
    hint: "¡No te pierdas la zanahoria!"
  },
  {
    size: 5,
    grid: [
      "....R",
      "WW.C.",
      "..C.W",
      ".W.W.",
      "....E"
    ],
    goal: "Recoge todos los 🥕 y ve al 🚪.",
    maxBlocks: 15,
    needCarrots: true,
    hint: "Rodea las murallas."
  },
  {
    size: 5,
    grid: [
      "R...C",
      ".W.W.",
      "C...C",
      ".W.W.",
      "E...."
    ],
    goal: "¡Hay que recoger todos los tomates!",
    maxBlocks: 15,
    needCarrots: true,
    hint: "Primero las zanahorias, luego la puerta."
  },
  {
    size: 5,
    grid: [
      "R.C.W",
      "W..C.",
      "...C.",
      "W.W..",
      "..E.."
    ],
    goal: "Recoge 🥕 y llega al 🚪.",
    maxBlocks: 15,
    needCarrots: true,
    hint: "Encuentra el camino más corto hasta las zanahorias."
  },
  {
    size: 5,
    grid: [
      "R.W..",
      ".C..W",
      ".C...",
      ".W.C.",
      "E...."
    ],
    goal: "Tarea final: recoger todos los 🥕 y llegar al 🚪.",
    maxBlocks: 15,
    needCarrots: true,
    hint: "Tendrás que moverte en zigzag."
  }
];
