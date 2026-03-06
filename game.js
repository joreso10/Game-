import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const SAVE_KEY = "star-miner-save-v2";

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060914, 0.0045);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

scene.add(new THREE.HemisphereLight(0x99d4ff, 0x121321, 1.2));
const sun = new THREE.DirectionalLight(0x9ac7ff, 1.1);
sun.position.set(20, 50, 10);
scene.add(sun);

const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(2800 * 3);
for (let i = 0; i < 2800; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 1800;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 900;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 1800;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd8eaff, size: 1.15, sizeAttenuation: true })));

const stationGroup = new THREE.Group();
scene.add(stationGroup);
const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);
const droneGroup = new THREE.Group();
scene.add(droneGroup);

const sectors = [
  { name: "Core Belt", min: 0, max: 180, fuelDrain: 1, hullDrain: 0, rarityBoost: 1 },
  { name: "Storm Expanse", min: 180, max: 330, fuelDrain: 1.4, hullDrain: 0.8, rarityBoost: 1.15 },
  { name: "Crystal Verge", min: 330, max: 520, fuelDrain: 1.7, hullDrain: 1.4, rarityBoost: 1.35 },
];

const stations = [];
function createStation(name, position, color) {
  const station = new THREE.Group();
  station.position.copy(position);
  station.userData.name = name;

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.6, 2.2, 28),
    new THREE.MeshStandardMaterial({ color: 0x293b5d, metalness: 0.8, roughness: 0.3, emissive: 0x131f35 })
  );
  station.add(core);

  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 13),
      new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.4 })
    );
    arm.position.y = 0.6;
    arm.rotation.y = (i / 6) * Math.PI * 2;
    station.add(arm);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x5fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.2;
  station.add(ring);
  station.userData.ring = ring;

  stations.push(station);
  stationGroup.add(station);
}

createStation("Cinder Ring", new THREE.Vector3(0, 0, 0), 0x4f77b3);
createStation("Hale Outpost", new THREE.Vector3(220, -10, 170), 0x6b6fd3);
createStation("Nadir Port", new THREE.Vector3(-260, 30, -190), 0x2b9a84);

const defaultPlayer = {
  position: { x: 0, y: 2.2, z: 20 },
  yaw: Math.PI,
  pitch: 0,
  speed: 28,
  fuel: 100,
  hull: 100,
  cargoCap: 100,
  credits: 250,
  reputation: 0,
  miningPower: 10,
  wave: 1,
  dronesDestroyed: 0,
  oreMined: 0,
};

const player = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  speed: 0,
  fuel: 100,
  hull: 100,
  cargoCap: 100,
  credits: 0,
  reputation: 0,
  miningPower: 10,
  wave: 1,
  dockedStation: null,
  skipNextWave: false,
  alive: true,
  dronesDestroyed: 0,
  oreMined: 0,
};

const cargo = { iron: 0, gold: 0, ice: 0, plasma: 0 };
const market = {
  iron: 12,
  gold: 23,
  ice: 10,
  plasma: 40,
};

let activeContracts = [];
let missionOffers = [];

const hud = {
  hull: document.getElementById("hull"),
  fuel: document.getElementById("fuel"),
  cargo: document.getElementById("cargo"),
  cargoCap: document.getElementById("cargoCap"),
  credits: document.getElementById("credits"),
  reputation: document.getElementById("reputation"),
  wave: document.getElementById("wave"),
  sector: document.getElementById("sector"),
  message: document.getElementById("message"),
  stationMenu: document.getElementById("stationMenu"),
  stationSummary: document.getElementById("stationSummary"),
  stationLog: document.getElementById("stationLog"),
  contractInfo: document.getElementById("contractInfo"),
  missionBoard: document.getElementById("missionBoard"),
  runSummary: document.getElementById("runSummary"),
  summaryStats: document.getElementById("summaryStats"),
};

const keys = {};
let pointerLocked = false;
let miningCooldown = 0;
let damageCooldown = 0;
let waveTimer = 30;
let marketTimer = 0;
let chatterTimer = 0;
const mouseSensitivity = 0.002;

const asteroidField = [];
const enemyDrones = [];
const raycaster = new THREE.Raycaster();
const centerScreen = new THREE.Vector2(0, 0);

function setMessage(text, color = "#8ae9ff") {
  hud.message.textContent = text;
  hud.message.style.color = color;
}
function stationLog(text) {
  hud.stationLog.textContent = `Station log: ${text}`;
}
function cargoTotal() {
  return cargo.iron + cargo.gold + cargo.ice + cargo.plasma;
}

function currentSector() {
  const d = player.position.length();
  return sectors.find((s) => d >= s.min && d < s.max) || sectors.at(-1);
}

function randomMineral(rarityBoost = 1) {
  const roll = Math.random();
  if (roll < 0.58 / rarityBoost) return { key: "iron", name: "iron", base: 12, color: 0x8f9cb8, hp: 24 };
  if (roll < 0.86 / rarityBoost) return { key: "gold", name: "gold", base: 20, color: 0xe8c65f, hp: 30 };
  if (roll < 0.97 / rarityBoost) return { key: "ice", name: "ice", base: 11, color: 0xbbe8ff, hp: 20 };
  return { key: "plasma", name: "plasma", base: 35, color: 0x6df2ff, hp: 40 };
}

function spawnAsteroid(radius = 520) {
  const mineral = randomMineral(currentSector().rarityBoost);
  const size = THREE.MathUtils.randFloat(1.2, 4.7);
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 1),
    new THREE.MeshStandardMaterial({
      color: mineral.color,
      roughness: 0.9,
      metalness: 0.2,
      emissive: new THREE.Color(mineral.color).multiplyScalar(0.1),
    })
  );
  const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.4, Math.random() - 0.5).normalize();
  mesh.position.copy(dir.multiplyScalar(THREE.MathUtils.randFloat(45, radius)));
  asteroidGroup.add(mesh);
  asteroidField.push({
    mesh,
    mineral,
    hp: mineral.hp + size * 2,
    value: Math.max(1, Math.round((mineral.base / 8) * size)),
    spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.2),
  });
}

function spawnDrone(distance = 120) {
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.2, 0),
    new THREE.MeshStandardMaterial({ color: 0xff6f8d, emissive: 0x290511, metalness: 0.65, roughness: 0.32 })
  );
  const pos = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5)
    .normalize()
    .multiplyScalar(distance + Math.random() * 60);
  body.position.copy(pos);
  droneGroup.add(body);
  enemyDrones.push({ mesh: body, hp: 24 + player.wave * 5, speed: 8 + player.wave * 0.7, phase: Math.random() * 10 });
}

function missionDescription(m) {
  if (m.type === "delivery") return `Deliver ${m.amount} ${m.mineral} ore → ${m.reward}cr/${m.rep}rep`;
  if (m.type === "bounty") return `Destroy ${m.amount} drones → ${m.reward}cr/${m.rep}rep`;
  return `Salvage run: survive ${m.amount}s in outer sectors → ${m.reward}cr/${m.rep}rep`;
}

function buildMissionOffers() {
  const minerals = ["iron", "gold", "ice", "plasma"];
  missionOffers = [
    {
      id: `d-${Date.now()}`,
      type: "delivery",
      mineral: minerals[Math.floor(Math.random() * minerals.length)],
      amount: 30 + Math.round(Math.random() * 35),
      progress: 0,
      reward: 420 + Math.round(Math.random() * 250),
      rep: 2,
    },
    {
      id: `b-${Date.now()}`,
      type: "bounty",
      amount: 5 + Math.round(Math.random() * 4),
      progress: 0,
      reward: 500 + Math.round(Math.random() * 300),
      rep: 3,
    },
    {
      id: `s-${Date.now()}`,
      type: "salvage",
      amount: 50 + Math.round(Math.random() * 30),
      progress: 0,
      reward: 530 + Math.round(Math.random() * 220),
      rep: 3,
    },
  ];
}

function renderMissionBoard() {
  const offers = missionOffers
    .map((m, i) => `<p><strong>${i + 5}</strong> ${missionDescription(m)}</p>`)
    .join("");
  const prices = `<p>Market: Fe ${market.iron} | Au ${market.gold} | Ice ${market.ice} | Pl ${market.plasma}</p>`;
  hud.missionBoard.innerHTML = `<h3>MISSION BOARD</h3>${offers}${prices}`;
}

function refreshContractsText() {
  if (!activeContracts.length) {
    hud.contractInfo.textContent = "Active contracts: none";
    return;
  }
  hud.contractInfo.textContent =
    "Active: " +
    activeContracts
      .map((c) => {
        if (c.type === "delivery") return `${c.mineral} ${c.progress}/${c.amount}`;
        return `${c.type} ${c.progress}/${c.amount}`;
      })
      .join(" • ");
}

function saveGame() {
  const payload = {
    player: {
      ...defaultPlayer,
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      yaw: player.yaw,
      pitch: player.pitch,
      speed: player.speed,
      fuel: player.fuel,
      hull: player.hull,
      cargoCap: player.cargoCap,
      credits: player.credits,
      reputation: player.reputation,
      miningPower: player.miningPower,
      wave: player.wave,
      dronesDestroyed: player.dronesDestroyed,
      oreMined: player.oreMined,
    },
    cargo,
    activeContracts,
    market,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const p = { ...defaultPlayer, ...(data.player || {}) };
    player.position.set(p.position.x, p.position.y, p.position.z);
    player.yaw = p.yaw;
    player.pitch = p.pitch;
    player.speed = p.speed;
    player.fuel = p.fuel;
    player.hull = p.hull;
    player.cargoCap = p.cargoCap;
    player.credits = p.credits;
    player.reputation = p.reputation;
    player.miningPower = p.miningPower;
    player.wave = p.wave;
    player.dronesDestroyed = p.dronesDestroyed;
    player.oreMined = p.oreMined;
    Object.assign(cargo, data.cargo || {});
    Object.assign(market, data.market || {});
    activeContracts = data.activeContracts || [];
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
}

function nearestStation() {
  let best = null;
  let bestDist = Infinity;
  for (const st of stations) {
    const d = player.position.distanceTo(st.position);
    if (d < bestDist) {
      best = st;
      bestDist = d;
    }
  }
  return { station: best, dist: bestDist };
}

function completeContract(contract) {
  player.credits += contract.reward;
  player.reputation += contract.rep;
  setMessage(`Contract complete +${contract.reward} credits +${contract.rep} rep`, "#98ffcb");
}

function evaluateContracts() {
  activeContracts = activeContracts.filter((c) => {
    const done = c.progress >= c.amount;
    if (done) completeContract(c);
    return !done;
  });
}

function sellCargoAndContracts() {
  if (!player.dockedStation) return;
  let payout = 0;
  for (const key of Object.keys(cargo)) {
    payout += cargo[key] * market[key];
    activeContracts
      .filter((c) => c.type === "delivery" && c.mineral === key)
      .forEach((c) => {
        c.progress += cargo[key];
      });
    cargo[key] = 0;
  }
  player.credits += payout;
  evaluateContracts();
  stationLog("Cargo manifest transferred to station brokers.");
  setMessage(`Cargo sold for ${Math.round(payout)} credits`, "#98ffcb");
}

function serviceRepairRefuel() {
  if (!player.dockedStation) return;
  const cost = Math.round((100 - player.fuel) * 1.3 + (100 - player.hull) * 2.2);
  if (cost <= 0) return setMessage("Ship already fully serviced", "#98ffcb");
  if (player.credits < cost) return setMessage(`Need ${cost} credits for full service`, "#ffdf7d");
  player.credits -= cost;
  player.fuel = 100;
  player.hull = 100;
  stationLog("Full service complete.");
  setMessage(`Service done (-${cost} credits)`, "#98ffcb");
}

function serviceUpgradeCargo() {
  if (!player.dockedStation) return;
  const cost = 520 + Math.round((player.cargoCap - 100) * 6);
  if (player.credits < cost) return setMessage(`Need ${cost} credits for upgrade`, "#ffdf7d");
  player.credits -= cost;
  player.cargoCap += 25;
  player.miningPower += 1;
  player.reputation += 1;
  stationLog("New cargo modules welded to hull.");
  setMessage(`Cargo bay now ${player.cargoCap}. Mining power +1.`, "#98ffcb");
}

function serviceCrewRest() {
  if (!player.dockedStation) return;
  if (player.credits < 180) return setMessage("Need 180 credits for crew rest", "#ffdf7d");
  player.credits -= 180;
  player.skipNextWave = true;
  player.hull = Math.min(100, player.hull + 20);
  stationLog("Crew rested and morale improved.");
  setMessage("Crew rest complete. Next wave delayed.", "#98ffcb");
}

function acceptMission(index) {
  if (!player.dockedStation) return;
  const m = missionOffers[index];
  if (!m) return;
  if (activeContracts.find((c) => c.id === m.id)) {
    setMessage("Mission already accepted", "#ffdf7d");
    return;
  }
  activeContracts.push({ ...m });
  stationLog(`Accepted ${m.type} contract.`);
  setMessage(`Accepted: ${missionDescription(m)}`, "#98ffcb");
}

function quickRepair() {
  if (player.credits < 120) return setMessage("Need 120 credits for quick repair", "#ffdf7d");
  player.credits -= 120;
  player.hull = Math.min(100, player.hull + 30);
  setMessage("Quick repair complete +30 hull", "#98ffcb");
}

function dockOrUndock() {
  if (player.dockedStation) {
    player.dockedStation = null;
    hud.stationMenu.classList.add("hidden");
    stationLog("Undocked. Clear skies.");
    return setMessage("Undocked", "#8ae9ff");
  }
  const { station, dist } = nearestStation();
  if (!station || dist > 20) return setMessage("Move closer to station to dock", "#ffdf7d");
  player.dockedStation = station;
  player.velocity.set(0, 0, 0);
  hud.stationMenu.classList.remove("hidden");
  hud.stationSummary.textContent = `Docked at ${station.userData.name}`;
  buildMissionOffers();
  renderMissionBoard();
  stationLog("Dock complete. Mission board updated.");
  setMessage(`Docked at ${station.userData.name}`, "#98ffcb");
}

function resetRun() {
  Object.assign(player, {
    velocity: new THREE.Vector3(),
    yaw: defaultPlayer.yaw,
    pitch: defaultPlayer.pitch,
    speed: defaultPlayer.speed,
    fuel: defaultPlayer.fuel,
    hull: defaultPlayer.hull,
    cargoCap: defaultPlayer.cargoCap,
    credits: defaultPlayer.credits,
    reputation: defaultPlayer.reputation,
    miningPower: defaultPlayer.miningPower,
    wave: 1,
    dockedStation: null,
    skipNextWave: false,
    alive: true,
    dronesDestroyed: 0,
    oreMined: 0,
  });
  player.position.set(defaultPlayer.position.x, defaultPlayer.position.y, defaultPlayer.position.z);
  Object.keys(cargo).forEach((k) => (cargo[k] = 0));
  activeContracts = [];
  waveTimer = 30;
  hud.runSummary.classList.add("hidden");
  hud.stationMenu.classList.add("hidden");
  setMessage("New run started.", "#8ae9ff");
}

function mineOrShoot() {
  if (!player.alive || player.dockedStation || miningCooldown > 0) return;
  miningCooldown = 0.16;
  raycaster.setFromCamera(centerScreen, camera);

  const droneHit = raycaster.intersectObjects(enemyDrones.map((d) => d.mesh), false)[0];
  if (droneHit && droneHit.distance < 95) {
    const target = enemyDrones.find((d) => d.mesh === droneHit.object);
    if (!target) return;
    target.hp -= 12 + player.reputation * 0.35;
    target.mesh.material.color.set(0xffb1c3);
    setTimeout(() => target.mesh.material.color.set(0xff6f8d), 70);
    if (target.hp <= 0) {
      droneGroup.remove(target.mesh);
      enemyDrones.splice(enemyDrones.indexOf(target), 1);
      player.credits += 56;
      player.dronesDestroyed += 1;
      activeContracts.filter((c) => c.type === "bounty").forEach((c) => (c.progress += 1));
      evaluateContracts();
      setMessage("Drone destroyed +56 credits", "#98ffcb");
    }
    return;
  }

  const hit = raycaster.intersectObjects(asteroidField.map((a) => a.mesh), false)[0];
  if (!hit || hit.distance > 75) return setMessage("No mineable target in range", "#ffdf7d");
  const target = asteroidField.find((a) => a.mesh === hit.object);
  if (!target) return;
  target.hp -= player.miningPower;
  target.mesh.material.emissiveIntensity = 0.38;
  setTimeout(() => {
    if (target.mesh?.material) target.mesh.material.emissiveIntensity = 0.1;
  }, 90);
  if (target.hp <= 0) {
    const free = player.cargoCap - cargoTotal();
    const collected = Math.min(free, target.value);
    cargo[target.mineral.key] += collected;
    player.oreMined += collected;
    activeContracts.filter((c) => c.type === "delivery" && c.mineral === target.mineral.key).forEach((c) => (c.progress += collected * 0.25));
    setMessage(`Mined ${collected} ${target.mineral.name}`, "#98ffcb");
    asteroidGroup.remove(target.mesh);
    asteroidField.splice(asteroidField.indexOf(target), 1);
    spawnAsteroid();
  }
}

function applyInput(dt) {
  if (player.dockedStation) {
    const p = player.dockedStation.position.clone().add(new THREE.Vector3(0, 2.3, 14));
    player.position.lerp(p, 0.13);
    camera.position.copy(player.position);
    camera.lookAt(player.dockedStation.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    return;
  }

  const forward = new THREE.Vector3(Math.sin(player.yaw), Math.sin(player.pitch), Math.cos(player.yaw)).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  const accel = new THREE.Vector3();
  if (keys.w) accel.add(forward);
  if (keys.s) accel.sub(forward);
  if (keys.a) accel.add(right);
  if (keys.d) accel.sub(right);
  if (keys[" "]) accel.add(up);
  if (keys.Shift) accel.sub(up);

  const sector = currentSector();
  if (accel.lengthSq() > 0 && player.fuel > 0) {
    accel.normalize().multiplyScalar(player.speed * dt * 1.85);
    player.velocity.add(accel);
    player.fuel = Math.max(0, player.fuel - dt * 3.5 * sector.fuelDrain);
  } else {
    player.fuel = Math.min(100, player.fuel + dt * 1.55);
  }

  if (sector.hullDrain > 0 && player.position.length() > 220 && !player.dockedStation) {
    player.hull = Math.max(0, player.hull - dt * 0.18 * sector.hullDrain);
    activeContracts.filter((c) => c.type === "salvage").forEach((c) => (c.progress += dt));
  }

  player.velocity.multiplyScalar(0.92);
  player.position.addScaledVector(player.velocity, dt * 8.4);

  if (player.position.length() > 680) {
    player.position.clampLength(0, 680);
    player.velocity.multiplyScalar(0.3);
  }

  camera.position.copy(player.position);
  const lookDir = new THREE.Vector3(
    Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  camera.lookAt(player.position.clone().add(lookDir));
}

function updateDrones(dt) {
  for (const drone of enemyDrones) {
    const toPlayer = player.position.clone().sub(drone.mesh.position);
    const dist = toPlayer.length();
    const dir = toPlayer.normalize();
    drone.mesh.position.addScaledVector(dir, drone.speed * dt);
    drone.mesh.position.y += Math.sin(performance.now() * 0.001 + drone.phase) * dt * 2;
    drone.mesh.rotation.x += dt;
    drone.mesh.rotation.y += dt * 1.3;

    if (!player.dockedStation && dist < 8 && damageCooldown <= 0) {
      player.hull = Math.max(0, player.hull - (6 + player.wave * 0.42));
      damageCooldown = 0.8;
      setMessage("Drone impact!", "#ff8f8f");
    }
  }
}

function updateMarket(dt) {
  marketTimer += dt;
  if (marketTimer < 6) return;
  marketTimer = 0;
  for (const key of Object.keys(market)) {
    market[key] = Math.max(5, Math.round(market[key] + (Math.random() - 0.5) * 3));
  }
  if (player.dockedStation) renderMissionBoard();
}

function updateStationChatter(dt) {
  if (!player.dockedStation) return;
  chatterTimer += dt;
  if (chatterTimer < 9) return;
  chatterTimer = 0;
  const lines = [
    "Cantina shifts changed; miners swapping stories.",
    "Fuel convoy just arrived from inner worlds.",
    "Dockmaster warns about storms in outer sectors.",
    "Freelance guild requests extra plasma samples.",
  ];
  stationLog(lines[Math.floor(Math.random() * lines.length)]);
}

function updateHud() {
  const sector = currentSector();
  hud.hull.textContent = player.hull.toFixed(0);
  hud.fuel.textContent = player.fuel.toFixed(0);
  hud.cargo.textContent = cargoTotal().toFixed(0);
  hud.cargoCap.textContent = player.cargoCap.toFixed(0);
  hud.credits.textContent = player.credits.toFixed(0);
  hud.reputation.textContent = player.reputation.toFixed(0);
  hud.wave.textContent = player.wave;
  hud.sector.textContent = sector.name;
  refreshContractsText();
}

for (let i = 0; i < 150; i++) spawnAsteroid();
for (let i = 0; i < 4; i++) spawnDrone(120);
loadGame();
buildMissionOffers();
renderMissionBoard();

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(0.033, clock.getDelta());
  miningCooldown = Math.max(0, miningCooldown - dt);
  damageCooldown = Math.max(0, damageCooldown - dt);

  if (player.alive && !player.dockedStation) {
    waveTimer -= dt;
    if (waveTimer <= 0) {
      if (player.skipNextWave) {
        player.skipNextWave = false;
        waveTimer = 22;
        setMessage("Crew rest bonus consumed. Wave delayed.", "#98ffcb");
      } else {
        player.wave += 1;
        waveTimer = Math.max(11, 25 - player.wave);
        for (let i = 0; i < Math.min(6, 1 + Math.floor(player.wave / 2)); i++) spawnDrone(130 + i * 20);
        setMessage(`Threat wave ${player.wave} incoming`, "#ffad7d");
      }
    }
  }

  applyInput(dt);
  updateDrones(dt);
  updateMarket(dt);
  updateStationChatter(dt);

  for (const asteroid of asteroidField) {
    asteroid.mesh.rotation.x += asteroid.spin.x * dt;
    asteroid.mesh.rotation.y += asteroid.spin.y * dt;
    asteroid.mesh.rotation.z += asteroid.spin.z * dt;
  }
  for (const st of stations) {
    st.rotation.y += dt * 0.14;
    st.userData.ring.material.opacity = 0.45 + Math.sin(performance.now() * 0.002) * 0.2;
  }

  const { station, dist } = nearestStation();
  if (!player.dockedStation && station && dist < 17 && player.alive) {
    setMessage(`Docking range: press E for ${station.userData.name}`, "#98ffcb");
  }

  evaluateContracts();

  if (player.hull <= 0 && player.alive) {
    player.alive = false;
    hud.runSummary.classList.remove("hidden");
    hud.summaryStats.textContent = `Wave ${player.wave} • Ore ${Math.round(player.oreMined)} • Drones ${player.dronesDestroyed} • Credits ${Math.round(player.credits)}`;
    setMessage("Ship destroyed. Press R to restart run.", "#ff6f8d");
  }

  if (Math.random() < 0.0025) saveGame();

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === "e" || e.key === "E") dockOrUndock();
  if (e.key === "f" || e.key === "F") quickRepair();
  if (e.key === "r" || e.key === "R") {
    resetRun();
    saveGame();
  }
  if (player.dockedStation) {
    if (e.key === "1") sellCargoAndContracts();
    if (e.key === "2") serviceRepairRefuel();
    if (e.key === "3") serviceUpgradeCargo();
    if (e.key === "4") serviceCrewRest();
    if (e.key === "5") acceptMission(0);
    if (e.key === "6") acceptMission(1);
    if (e.key === "7") acceptMission(2);
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
window.addEventListener("mousedown", () => {
  if (!pointerLocked) canvas.requestPointerLock();
  mineOrShoot();
});
document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (!pointerLocked || player.dockedStation) return;
  player.yaw -= e.movementX * mouseSensitivity;
  player.pitch -= e.movementY * mouseSensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.2, 1.2);
});
window.addEventListener("beforeunload", saveGame);

stationLog("Welcome pilot. Build your career between stations.");
setMessage("Click to lock cursor. Mine, trade, accept missions, and survive.");
updateHud();
animate();
