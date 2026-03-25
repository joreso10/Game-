const symbols = [
  "Aldebaran", "Anubis", "Apophis", "Aquila", "Aries",
  "Auriga", "Bastet", "Centauri", "Cetus", "Cronus",
  "Draco", "Erebus", "Heliopolis", "Hydra", "Orion",
  "Perseus", "Phoenix", "Serpens", "Taurus", "Vega"
];

const worlds = [
  {
    name: "Abydos",
    address: ["Aldebaran", "Bastet", "Orion", "Hydra", "Vega", "Draco", "Aries"],
    description: "A desert world with Ancient ruins and Naquadah traces beneath the dunes.",
    hazard: 30,
    reward: 75,
  },
  {
    name: "P3X-888",
    address: ["Anubis", "Cronus", "Cetus", "Serpens", "Orion", "Taurus", "Aquila"],
    description: "Dense jungle, unstable weather, and signs of hostile Goa'uld patrol activity.",
    hazard: 65,
    reward: 60,
  },
  {
    name: "PX7-941",
    address: ["Auriga", "Phoenix", "Centauri", "Perseus", "Hydra", "Aries", "Vega"],
    description: "Frozen moon with energy crystals and hidden Ancient devices.",
    hazard: 45,
    reward: 80,
  },
  {
    name: "M4C-862",
    address: ["Draco", "Erebus", "Aquila", "Heliopolis", "Cetus", "Bastet", "Taurus"],
    description: "Volcanic tectonic world rich in Trinium but prone to sudden quakes.",
    hazard: 75,
    reward: 90,
  },
  {
    name: "Niflheim Outpost",
    address: ["Vega", "Perseus", "Aldebaran", "Serpens", "Phoenix", "Cronus", "Hydra"],
    description: "Abandoned Asgard research station with encrypted archives.",
    hazard: 40,
    reward: 95,
  }
];

const state = {
  location: "Earth (SGC)",
  energy: 100,
  supplies: 50,
  artifacts: 0,
  selectedAddress: [],
  currentWorld: null,
};

const ui = {
  energy: document.getElementById("energy"),
  supplies: document.getElementById("supplies"),
  artifacts: document.getElementById("artifacts"),
  worldName: document.getElementById("world-name"),
  worldDescription: document.getElementById("world-description"),
  hazard: document.getElementById("hazard"),
  reward: document.getElementById("reward"),
  log: document.getElementById("log"),
  address: document.getElementById("address"),
  dhdGrid: document.getElementById("dhd-grid"),
  clear: document.getElementById("clear-address"),
  dial: document.getElementById("dial-address"),
  explore: document.getElementById("explore"),
  scavenge: document.getElementById("scavenge"),
  rest: document.getElementById("rest"),
  return: document.getElementById("return"),
};

function logEntry(message, isWarn = false) {
  const entry = document.createElement("p");
  entry.textContent = `• ${message}`;
  if (isWarn) entry.classList.add("warn");
  ui.log.prepend(entry);
}

function renderHUD() {
  ui.energy.textContent = state.energy;
  ui.supplies.textContent = state.supplies;
  ui.artifacts.textContent = state.artifacts;
}

function renderAddress() {
  ui.address.textContent = state.selectedAddress.length
    ? state.selectedAddress.join(" ➜ ")
    : "-";

  const buttons = ui.dhdGrid.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.classList.toggle("selected", state.selectedAddress.includes(btn.dataset.symbol));
  });
}

function updateWorldPanel() {
  if (!state.currentWorld) {
    ui.worldName.textContent = "Earth (SGC)";
    ui.worldDescription.textContent = "Dial a seven-symbol address from the DHD to explore.";
    ui.hazard.value = 0;
    ui.reward.value = 0;
    return;
  }

  ui.worldName.textContent = state.currentWorld.name;
  ui.worldDescription.textContent = state.currentWorld.description;
  ui.hazard.value = state.currentWorld.hazard;
  ui.reward.value = state.currentWorld.reward;
}

function buildDHD() {
  symbols.forEach((symbol) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-btn";
    button.textContent = symbol;
    button.dataset.symbol = symbol;
    button.addEventListener("click", () => {
      if (state.selectedAddress.includes(symbol)) {
        state.selectedAddress = state.selectedAddress.filter((item) => item !== symbol);
      } else if (state.selectedAddress.length < 7) {
        state.selectedAddress.push(symbol);
      } else {
        logEntry("Address can only contain seven symbols.", true);
      }
      renderAddress();
    });
    ui.dhdGrid.appendChild(button);
  });
}

function consumeResources(energyCost, suppliesCost) {
  if (state.energy < energyCost || state.supplies < suppliesCost) {
    logEntry("Insufficient energy or supplies for that action.", true);
    return false;
  }

  state.energy -= energyCost;
  state.supplies -= suppliesCost;
  renderHUD();
  return true;
}

function dialAddress() {
  if (state.selectedAddress.length !== 7) {
    logEntry("You need exactly seven symbols to engage the gate.", true);
    return;
  }

  if (!consumeResources(10, 4)) return;

  const match = worlds.find((world) => world.address.join("|") === state.selectedAddress.join("|"));
  if (!match) {
    state.currentWorld = null;
    logEntry("Chevron lock failed. Unknown destination. Wormhole collapse.", true);
    updateWorldPanel();
    return;
  }

  state.currentWorld = match;
  state.location = match.name;
  logEntry(`Wormhole established. Team arrives at ${match.name}.`);
  updateWorldPanel();
}

function exploreWorld() {
  if (!state.currentWorld) {
    logEntry("Dial a valid world before attempting exploration.", true);
    return;
  }
  if (!consumeResources(8, 6)) return;

  const roll = Math.random() * 100;
  const chance = state.currentWorld.reward - state.currentWorld.hazard / 2;

  if (roll <= chance) {
    const found = 1 + Math.floor(Math.random() * 3);
    state.artifacts += found;
    logEntry(`Exploration success. Recovered ${found} Ancient artifact(s).`);
  } else {
    const damage = 5 + Math.floor(Math.random() * 8);
    state.energy = Math.max(0, state.energy - damage);
    logEntry(`Ambushed by hazards. You lose ${damage} extra energy.`, true);
  }

  renderHUD();
}

function scavenge() {
  if (!state.currentWorld) {
    logEntry("Scavenge operations require an off-world location.", true);
    return;
  }
  if (!consumeResources(6, 2)) return;

  const suppliesFound = 2 + Math.floor(Math.random() * 7);
  state.supplies += suppliesFound;
  logEntry(`Scavenge mission complete. Gained ${suppliesFound} supplies.`);
  renderHUD();
}

function rest() {
  const energyGain = state.currentWorld ? 10 : 14;
  const suppliesCost = state.currentWorld ? 5 : 2;
  if (!consumeResources(0, suppliesCost)) return;

  state.energy = Math.min(100, state.energy + energyGain);
  logEntry(`Team regrouped. Restored ${energyGain} energy.`);
  renderHUD();
}

function returnToEarth() {
  if (!state.currentWorld) {
    logEntry("You are already at Earth command.");
    return;
  }
  if (!consumeResources(7, 3)) return;

  state.currentWorld = null;
  state.location = "Earth (SGC)";
  logEntry("Gate connection established to Earth. Team safely returned.");
  updateWorldPanel();
}

ui.clear.addEventListener("click", () => {
  state.selectedAddress = [];
  renderAddress();
});

ui.dial.addEventListener("click", dialAddress);
ui.explore.addEventListener("click", exploreWorld);
ui.scavenge.addEventListener("click", scavenge);
ui.rest.addEventListener("click", rest);
ui.return.addEventListener("click", returnToEarth);

buildDHD();
renderHUD();
renderAddress();
updateWorldPanel();
logEntry("Welcome Commander. DHD link online.");
logEntry("Tip: Abydos address begins with Aldebaran ➜ Bastet ➜ Orion...");
