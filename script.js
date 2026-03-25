const symbols = [
  "Aldebaran", "Anubis", "Apophis", "Aquila", "Aries",
  "Auriga", "Bastet", "Centauri", "Cetus", "Cronus",
  "Draco", "Erebus", "Heliopolis", "Hydra", "Orion",
  "Perseus", "Phoenix", "Serpens", "Taurus", "Vega"
];

const baseRooms = {
  "SGC - Gateroom": {
    description: "The Stargate stands silent. Tech teams monitor power couplings and gate diagnostics.",
    threat: 5,
    opportunity: 20,
    paths: ["SGC Control Room", "Armory", "Mess Hall"]
  },
  "SGC Control Room": {
    description: "Banks of Ancient and Tau'ri hardware line the walls. This is where you dial outbound addresses.",
    threat: 8,
    opportunity: 35,
    paths: ["SGC - Gateroom", "Briefing Room"]
  },
  "Briefing Room": {
    description: "Mission plans and MALP recon reports are spread across digital tables.",
    threat: 3,
    opportunity: 30,
    paths: ["SGC Control Room", "Infirmary"]
  },
  "Armory": {
    description: "Locked racks of tactical gear, rail weapons, and standard off-world kits.",
    threat: 2,
    opportunity: 40,
    paths: ["SGC - Gateroom", "Infirmary"]
  },
  "Infirmary": {
    description: "Medical scanners hum quietly while medics stand by for returning gate teams.",
    threat: 1,
    opportunity: 28,
    paths: ["Armory", "Briefing Room", "Mess Hall"]
  },
  "Mess Hall": {
    description: "A rare calm zone in the mountain base. Teams eat, recover, and trade stories.",
    threat: 1,
    opportunity: 22,
    paths: ["SGC - Gateroom", "Infirmary"]
  }
};

const worlds = [
  {
    name: "Atlantis",
    address: ["Auriga", "Phoenix", "Centauri", "Perseus", "Hydra", "Aries", "Vega"],
    description: "The city of the Ancients rises over ocean shallows. High tech, high value, hidden dangers.",
    threat: 40,
    opportunity: 92,
    zones: ["Main Pier", "Control Tower", "Ancient Lab", "East Balcony"]
  },
  {
    name: "Midway Station",
    address: ["Anubis", "Cronus", "Cetus", "Serpens", "Orion", "Taurus", "Aquila"],
    description: "Bridge station between galaxies. Systems are partly unstable but packed with navigational archives.",
    threat: 55,
    opportunity: 84,
    zones: ["Docking Ring", "Node Core", "Transit Deck", "Shield Spine"]
  },
  {
    name: "PR-233",
    address: ["Aldebaran", "Bastet", "Orion", "Hydra", "Vega", "Draco", "Aries"],
    description: "Rocky research world with buried ruins and intermittent Wraith-signature readings.",
    threat: 63,
    opportunity: 78,
    zones: ["Gate Ridge", "Crystal Valley", "Subsurface Vault", "Canyon Relay"]
  }
];

const state = {
  energy: 100,
  supplies: 45,
  intel: 0,
  selectedAddress: [],
  location: "SGC - Gateroom",
  currentWorld: null,
  currentZone: null,
};

const ui = {
  location: document.getElementById("location"),
  energy: document.getElementById("energy"),
  supplies: document.getElementById("supplies"),
  intel: document.getElementById("intel"),
  areaDescription: document.getElementById("area-description"),
  threat: document.getElementById("threat"),
  opportunity: document.getElementById("opportunity"),
  moveOptions: document.getElementById("move-options"),
  log: document.getElementById("log"),
  address: document.getElementById("address"),
  dhdGrid: document.getElementById("dhd-grid"),
  clear: document.getElementById("clear-address"),
  dial: document.getElementById("dial-address"),
  explore: document.getElementById("explore"),
  resupply: document.getElementById("resupply"),
  rest: document.getElementById("rest"),
  return: document.getElementById("return"),
};

function logEntry(message, isWarn = false) {
  const entry = document.createElement("p");
  entry.textContent = `• ${message}`;
  if (isWarn) entry.classList.add("warn");
  ui.log.prepend(entry);
}

function renderHud() {
  ui.location.textContent = state.currentWorld
    ? `${state.currentWorld.name} - ${state.currentZone}`
    : state.location;
  ui.energy.textContent = state.energy;
  ui.supplies.textContent = state.supplies;
  ui.intel.textContent = state.intel;
}

function renderAddress() {
  ui.address.textContent = state.selectedAddress.length
    ? state.selectedAddress.join(" ➜ ")
    : "-";

  ui.dhdGrid.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", state.selectedAddress.includes(button.dataset.symbol));
  });
}

function buildDhd() {
  symbols.forEach((symbol) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-btn";
    button.dataset.symbol = symbol;
    button.textContent = symbol;
    button.addEventListener("click", () => {
      if (state.selectedAddress.includes(symbol)) {
        state.selectedAddress = state.selectedAddress.filter((s) => s !== symbol);
      } else if (state.selectedAddress.length < 7) {
        state.selectedAddress.push(symbol);
      } else {
        logEntry("Address limit reached. Seven chevrons maximum.", true);
      }
      renderAddress();
    });

    ui.dhdGrid.appendChild(button);
  });
}

function renderAreaPanel() {
  if (state.currentWorld) {
    ui.areaDescription.textContent = `${state.currentWorld.description} Current zone: ${state.currentZone}.`;
    ui.threat.value = state.currentWorld.threat;
    ui.opportunity.value = state.currentWorld.opportunity;
    renderMoveOptions(state.currentWorld.zones, true);
    return;
  }

  const room = baseRooms[state.location];
  ui.areaDescription.textContent = room.description;
  ui.threat.value = room.threat;
  ui.opportunity.value = room.opportunity;
  renderMoveOptions(room.paths, false);
}

function renderMoveOptions(destinations, worldMode) {
  ui.moveOptions.innerHTML = "";

  destinations.forEach((destination) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = destination;
    button.addEventListener("click", () => {
      if (worldMode) {
        state.currentZone = destination;
        logEntry(`You move through ${state.currentWorld.name} and arrive at ${destination}.`);
      } else {
        state.location = destination;
        logEntry(`You move to ${destination} inside SGC.`);
      }

      renderHud();
      renderAreaPanel();
    });
    ui.moveOptions.appendChild(button);
  });
}

function spendResources(energyCost, suppliesCost) {
  if (state.energy < energyCost || state.supplies < suppliesCost) {
    logEntry("Insufficient resources for that action.", true);
    return false;
  }

  state.energy -= energyCost;
  state.supplies -= suppliesCost;
  renderHud();
  return true;
}

function dialGate() {
  if (state.location !== "SGC Control Room" || state.currentWorld) {
    logEntry("You must be in the SGC Control Room (and not already off-world) to dial.", true);
    return;
  }

  if (state.selectedAddress.length !== 7) {
    logEntry("Dialing failed. You need exactly seven symbols.", true);
    return;
  }

  if (!spendResources(10, 4)) return;

  const match = worlds.find((world) => world.address.join("|") === state.selectedAddress.join("|"));

  if (!match) {
    logEntry("No valid lock. Stargate disengages.", true);
    return;
  }

  state.currentWorld = match;
  state.currentZone = match.zones[0];
  logEntry(`Chevron lock complete. You step through to ${match.name}.`);
  renderHud();
  renderAreaPanel();
}

function exploreArea() {
  if (!spendResources(6, 3)) return;

  if (!state.currentWorld) {
    const energyGain = 2 + Math.floor(Math.random() * 6);
    state.energy = Math.min(100, state.energy + energyGain);
    logEntry(`Base sweep complete. Efficient routing restores ${energyGain} energy.`);
    renderHud();
    return;
  }

  const roll = Math.random() * 100;
  const threshold = state.currentWorld.opportunity - state.currentWorld.threat / 2;

  if (roll <= threshold) {
    const intelGain = 1 + Math.floor(Math.random() * 3);
    state.intel += intelGain;
    logEntry(`Off-world exploration success in ${state.currentZone}. Intel +${intelGain}.`);
  } else {
    const penalty = 4 + Math.floor(Math.random() * 6);
    state.energy = Math.max(0, state.energy - penalty);
    logEntry(`Hostile conditions hit the team. Additional energy loss: ${penalty}.`, true);
  }

  renderHud();
}

function resupply() {
  if (!spendResources(4, 0)) return;

  const gain = state.currentWorld ? 4 + Math.floor(Math.random() * 5) : 7 + Math.floor(Math.random() * 6);
  state.supplies += gain;
  logEntry(`Supply operation successful. Supplies +${gain}.`);
  renderHud();
}

function rest() {
  const supplyCost = state.currentWorld ? 5 : 2;
  if (!spendResources(0, supplyCost)) return;

  const restore = state.currentWorld ? 12 : 18;
  state.energy = Math.min(100, state.energy + restore);
  logEntry(`Recovery cycle complete. Energy +${restore}.`);
  renderHud();
}

function returnToSgc() {
  if (!state.currentWorld) {
    logEntry("You are already in SGC.");
    return;
  }

  if (!spendResources(8, 3)) return;

  const departed = state.currentWorld.name;
  state.currentWorld = null;
  state.currentZone = null;
  state.location = "SGC - Gateroom";
  logEntry(`Return wormhole from ${departed} complete. You are back in the SGC Gateroom.`);
  renderHud();
  renderAreaPanel();
}

ui.clear.addEventListener("click", () => {
  state.selectedAddress = [];
  renderAddress();
});

ui.dial.addEventListener("click", dialGate);
ui.explore.addEventListener("click", exploreArea);
ui.resupply.addEventListener("click", resupply);
ui.rest.addEventListener("click", rest);
ui.return.addEventListener("click", returnToSgc);

buildDhd();
renderHud();
renderAddress();
renderAreaPanel();
logEntry("Welcome, Tau'ri explorer. Move through SGC, reach the Control Room, and dial out.");
logEntry("Known addresses include Atlantis, Midway Station, and PR-233.");
