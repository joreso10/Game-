const STORAGE_KEY = "cosmicCoreClickerSave";

const planets = [
  { name: "Asterion", hue: "#1b8ed1", ore: 1, research: 1 },
  { name: "Vulcanis", hue: "#d95d39", ore: 8, research: 4 },
  { name: "Cryora", hue: "#72e3ff", ore: 55, research: 18 },
  { name: "Verdantia", hue: "#4fe087", ore: 410, research: 90 },
  { name: "Umbriel-9", hue: "#9d5cff", ore: 3400, research: 560 },
  { name: "Heliox Prime", hue: "#ffd166", ore: 31000, research: 4200 }
];

const upgrades = [
  {
    id: "drill",
    icon: "⛏️",
    name: "Core Drill",
    description: "+Ore/sec. Cost and output grow exponentially.",
    baseCost: { ore: 25, research: 0 },
    growth: 1.18,
    effect: level => level * Math.pow(1.12, level - 1)
  },
  {
    id: "elevator",
    icon: "🛰️",
    name: "Space Elevator",
    description: "Boosts ore/sec and shows cargo lifts hauling ore to orbit.",
    baseCost: { ore: 180, research: 12 },
    growth: 1.26,
    effect: level => level * 7 * Math.pow(1.16, level - 1)
  },
  {
    id: "station",
    icon: "🔬",
    name: "Research Station",
    description: "+Research/sec for advanced planetary expansion.",
    baseCost: { ore: 550, research: 50 },
    growth: 1.31,
    effect: level => level * Math.pow(1.18, level - 1)
  },
  {
    id: "shipyard",
    icon: "🚀",
    name: "Shipyard Fleet",
    description: "Adds fleet power, multiplying every mining operation.",
    baseCost: { ore: 1650, research: 120 },
    growth: 1.38,
    effect: level => level * 0.14 * Math.pow(1.08, level - 1)
  },
  {
    id: "ai",
    icon: "🧠",
    name: "Quantum AI Lab",
    description: "Exponential research and click amplification.",
    baseCost: { ore: 8500, research: 950 },
    growth: 1.46,
    effect: level => level * 0.22 * Math.pow(1.11, level - 1)
  }
];

const defaultState = {
  ore: 0,
  research: 0,
  planetIndex: 0,
  totalClicks: 0,
  upgrades: Object.fromEntries(upgrades.map(upgrade => [upgrade.id, 0])),
  lastTick: Date.now()
};

let state = loadGame();
let lastFrame = performance.now();

const elements = {
  oreCount: document.querySelector("#oreCount"),
  researchCount: document.querySelector("#researchCount"),
  orePerSecond: document.querySelector("#orePerSecond"),
  researchPerSecond: document.querySelector("#researchPerSecond"),
  fleetPower: document.querySelector("#fleetPower"),
  planetName: document.querySelector("#planetName"),
  planetTier: document.querySelector("#planetTier"),
  mineTitle: document.querySelector("#mineTitle"),
  mineDescription: document.querySelector("#mineDescription"),
  mineButton: document.querySelector("#mineButton"),
  planetButton: document.querySelector("#planetButton"),
  upgradeList: document.querySelector("#upgradeList"),
  upgradeTemplate: document.querySelector("#upgradeTemplate"),
  expansionText: document.querySelector("#expansionText"),
  expansionCost: document.querySelector("#expansionCost"),
  expansionProgress: document.querySelector("#expansionProgress"),
  expandBtn: document.querySelector("#expandBtn"),
  clickBurstLayer: document.querySelector("#clickBurstLayer"),
  saveBtn: document.querySelector("#saveBtn"),
  resetBtn: document.querySelector("#resetBtn")
};

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      upgrades: { ...defaultState.upgrades, ...saved.upgrades }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveGame() {
  state.lastTick = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentPlanet() {
  return planets[state.planetIndex % planets.length];
}

function prestigeLoop() {
  return Math.floor(state.planetIndex / planets.length);
}

function planetMultiplier() {
  return Math.pow(7.5, state.planetIndex) * Math.pow(2.5, prestigeLoop());
}

function fleetMultiplier() {
  return 1 + upgrades.find(upgrade => upgrade.id === "shipyard").effect(state.upgrades.shipyard) + upgrades.find(upgrade => upgrade.id === "ai").effect(state.upgrades.ai);
}

function clickValue() {
  const aiBoost = 1 + state.upgrades.ai * 0.45;
  return currentPlanet().ore * planetMultiplier() * fleetMultiplier() * aiBoost;
}

function orePerSecond() {
  const drill = upgrades.find(upgrade => upgrade.id === "drill").effect(state.upgrades.drill);
  const elevator = upgrades.find(upgrade => upgrade.id === "elevator").effect(state.upgrades.elevator);
  return (drill + elevator) * currentPlanet().ore * planetMultiplier() * fleetMultiplier();
}

function researchPerSecond() {
  const station = upgrades.find(upgrade => upgrade.id === "station").effect(state.upgrades.station);
  const ai = upgrades.find(upgrade => upgrade.id === "ai").effect(state.upgrades.ai) * 3;
  return (station + ai) * currentPlanet().research * Math.pow(3.25, state.planetIndex);
}

function upgradeCost(upgrade) {
  const owned = state.upgrades[upgrade.id];
  const planetScale = Math.pow(1.08, state.planetIndex);
  return {
    ore: upgrade.baseCost.ore * Math.pow(upgrade.growth, owned) * planetScale,
    research: upgrade.baseCost.research * Math.pow(upgrade.growth, owned) * planetScale
  };
}

function expansionCost() {
  return {
    ore: 2500 * Math.pow(10.5, state.planetIndex),
    research: 250 * Math.pow(6.8, state.planetIndex)
  };
}

function canAfford(cost) {
  return state.ore >= cost.ore && state.research >= cost.research;
}

function spend(cost) {
  state.ore -= cost.ore;
  state.research -= cost.research;
}

function mine() {
  const gained = clickValue();
  state.ore += gained;
  state.totalClicks += 1;
  showBurst(`+${formatNumber(gained)} ore`);
  render();
}

function buyUpgrade(upgrade) {
  const cost = upgradeCost(upgrade);
  if (!canAfford(cost)) return;
  spend(cost);
  state.upgrades[upgrade.id] += 1;
  render();
}

function expand() {
  const cost = expansionCost();
  if (!canAfford(cost)) return;
  spend(cost);
  state.planetIndex += 1;
  state.ore += clickValue() * 25;
  const planet = currentPlanet();
  showBurst(`Discovered ${planet.name}!`);
  render();
}

function renderUpgrades() {
  elements.upgradeList.innerHTML = "";
  upgrades.forEach(upgrade => {
    const cost = upgradeCost(upgrade);
    const node = elements.upgradeTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".upgrade-icon").textContent = upgrade.icon;
    node.querySelector(".upgrade-name").textContent = upgrade.name;
    node.querySelector(".upgrade-description").textContent = upgrade.description;
    node.querySelector(".upgrade-owned").textContent = `Owned: ${state.upgrades[upgrade.id]}`;
    node.querySelector(".upgrade-cost").textContent = costLabel(cost);
    node.disabled = !canAfford(cost);
    node.addEventListener("click", () => buyUpgrade(upgrade));
    elements.upgradeList.appendChild(node);
  });
}

function render() {
  const planet = currentPlanet();
  const expansion = expansionCost();
  const expansionRatio = Math.min(1, Math.min(state.ore / expansion.ore, state.research / expansion.research));

  elements.oreCount.textContent = formatNumber(state.ore);
  elements.researchCount.textContent = formatNumber(state.research);
  elements.orePerSecond.textContent = `${formatNumber(orePerSecond())} / sec`;
  elements.researchPerSecond.textContent = `${formatNumber(researchPerSecond())} / sec`;
  elements.fleetPower.textContent = `${formatNumber((fleetMultiplier() - 1) * 100)}%`;
  elements.planetName.textContent = planet.name;
  elements.planetTier.textContent = `Tier ${state.planetIndex + 1}`;
  elements.mineTitle.textContent = `Mine ${planet.name}`;
  elements.mineDescription.textContent = `Click yield: ${formatNumber(clickValue())} ore. Planet multiplier: x${formatNumber(planetMultiplier())}. Total clicks: ${formatNumber(state.totalClicks)}.`;
  elements.expansionCost.textContent = `Cost: ${formatNumber(expansion.ore)} ore + ${formatNumber(expansion.research)} research`;
  elements.expansionText.textContent = `Prepare a colony fleet for tier ${state.planetIndex + 2}. Each planet compounds production, unlocks richer ore, and makes the next leap dramatically larger.`;
  elements.expansionProgress.style.width = `${expansionRatio * 100}%`;
  elements.expandBtn.disabled = !canAfford(expansion);
  document.documentElement.style.setProperty("--planet-hue", planet.hue);
  elements.planetButton.style.background = `radial-gradient(circle at 30% 26%, #fff4a8 0 2%, #66f0c7 13%, ${planet.hue} 34%, #2441a4 58%, #19144f 100%)`;
  renderUpgrades();
}

function tick(now) {
  const delta = Math.min(1, (now - lastFrame) / 1000);
  lastFrame = now;
  state.ore += orePerSecond() * delta;
  state.research += researchPerSecond() * delta;
  render();
  requestAnimationFrame(tick);
}

function applyOfflineProgress() {
  const elapsed = Math.min(60 * 60 * 4, Math.max(0, (Date.now() - state.lastTick) / 1000));
  if (elapsed > 5) {
    state.ore += orePerSecond() * elapsed;
    state.research += researchPerSecond() * elapsed;
  }
}

function showBurst(text) {
  const burst = document.createElement("span");
  burst.className = "burst";
  burst.textContent = text;
  burst.style.left = `${35 + Math.random() * 30}%`;
  burst.style.top = `${25 + Math.random() * 35}%`;
  elements.clickBurstLayer.appendChild(burst);
  window.setTimeout(() => burst.remove(), 900);
}

function costLabel(cost) {
  const ore = `${formatNumber(cost.ore)} ore`;
  const research = cost.research > 0 ? ` + ${formatNumber(cost.research)} research` : "";
  return ore + research;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "∞";
  if (value < 1000) return value.toFixed(value < 10 ? 1 : 0);
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const tier = Math.min(units.length - 1, Math.floor(Math.log10(value) / 3) - 1);
  const scaled = value / Math.pow(1000, tier + 1);
  return `${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)}${units[tier]}`;
}

elements.mineButton.addEventListener("click", mine);
elements.planetButton.addEventListener("click", mine);
elements.expandBtn.addEventListener("click", expand);
elements.saveBtn.addEventListener("click", () => {
  saveGame();
  showBurst("Saved");
});
elements.resetBtn.addEventListener("click", () => {
  if (!confirm("Reset your cosmic mining empire?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  lastFrame = performance.now();
  render();
});

window.addEventListener("beforeunload", saveGame);
window.setInterval(saveGame, 10000);

applyOfflineProgress();
render();
requestAnimationFrame(tick);
