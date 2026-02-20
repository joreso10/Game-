const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  level: document.getElementById('levelLabel'),
  objective: document.getElementById('objective'),
  abilityStatus: document.getElementById('abilityStatus'),
  runStats: document.getElementById('runStats'),
  unlockStatus: document.getElementById('unlockStatus'),
  abilityList: document.getElementById('abilityList'),
};

const TOTAL_LEVELS = 30;
const GRAVITY = 0.44;
const FRICTION = 0.84;
const PLAYER_W = 28;
const PLAYER_H = 42;

const abilityDefs = [
  { key: '1', name: 'Shuriken Burst', unlockLevel: 1, cooldownKey: 'burst' },
  { key: '2', name: 'Dash Slash', unlockLevel: 3, cooldownKey: 'dash' },
  { key: '3', name: 'Smoke Phase', unlockLevel: 6, cooldownKey: 'smoke' },
  { key: '4', name: 'Grapple Pull', unlockLevel: 9, cooldownKey: 'grapple' },
  { key: '5', name: 'Skyfall Rain', unlockLevel: 12, cooldownKey: 'rain' },
  { key: '6', name: 'Blade Fury', unlockLevel: 18, cooldownKey: 'fury' },
];

const state = {
  level: 1,
  mouse: { x: 0, y: 0 },
  keys: {},
  bullets: [],
  enemyBullets: [],
  particles: [],
  over: false,
  won: false,
  score: 0,
  coins: 0,
  relicsCollected: 0,
  inShop: false,
  startAt: performance.now(),
  damageMult: 1,
  cooldownMult: 1,
};

const player = {
  x: 60, y: 560, vx: 0, vy: 0,
  hp: 120, maxHp: 120,
  onGround: false, touchingWall: 0, facing: 1, invuln: 0,
  cooldowns: { burst: 0, dash: 0, smoke: 0, grapple: 0, rain: 0, fury: 0 },
};

let current;
let enemies = [];
let checkpoint = { x: 60, y: 560 };

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function emitParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 24, color });
}

function unlockedAbilities() {
  return abilityDefs.filter((a) => state.level >= a.unlockLevel);
}

function generateLevel(levelNum) {
  const shopLevel = levelNum % 10 === 0;
  const difficulty = Math.floor((levelNum - 1) / 3);
  const spawn = { x: 40, y: 560 };

  if (shopLevel) {
    return {
      name: `Sanctuary Shop ${levelNum}`,
      objective: 'Shop floor: buy upgrades and move to the gate.',
      spawn,
      gate: { x: 1120, y: 560, w: 42, h: 70 },
      platforms: [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 260, y: 520, w: 720, h: 22 }],
      enemies: [],
      traps: [],
      relics: [],
      checkpoints: [{ x: 240, y: 650, w: 24, h: 45 }],
      shopLevel: true,
    };
  }

  const platforms = [{ x: 0, y: 650, w: 1200, h: 50 }];
  for (let i = 0; i < 7; i++) {
    const x = 110 + i * 150;
    const y = 560 - ((i % 3) * 70) - Math.min(difficulty * 5, 70);
    platforms.push({ x, y, w: 120, h: 22 });
  }
  platforms.push({ x: 450, y: 300, w: 20, h: 220 });

  const enemiesOut = [];
  const enemyCount = 2 + Math.min(7, Math.floor(levelNum / 2));
  for (let i = 0; i < enemyCount; i++) {
    const kind = i % 3 === 0 ? 'shooter' : i % 3 === 1 ? 'patrol' : 'jumper';
    const baseHp = 36 + difficulty * 7;
    enemiesOut.push({
      kind,
      x: 260 + (i * 120) % 760,
      y: 520 - (i % 3) * 70,
      minX: 220 + (i * 120) % 760,
      maxX: 340 + (i * 120) % 760,
      hp: baseHp + (kind === 'jumper' ? 18 : kind === 'shooter' ? 8 : 0),
      dir: i % 2 ? 1 : -1,
      vy: 0,
      jumpCd: 40,
      shootCd: 100 - Math.min(40, difficulty * 3),
    });
  }

  const relics = [];
  const relicCount = Math.min(4, 1 + Math.floor(levelNum / 6));
  for (let i = 0; i < relicCount; i++) {
    relics.push({ x: 220 + i * 260, y: 500 - (i % 2) * 140, taken: false });
  }

  const traps = [{ x: 380, y: 640, w: 90, h: 10 }, { x: 810, y: 640, w: 90, h: 10 }];

  return {
    name: `Trial ${levelNum}`,
    objective: 'Clear enemies, collect relics, then reach gate.',
    spawn,
    gate: { x: 1120, y: 210, w: 42, h: 70 },
    platforms,
    enemies: enemiesOut,
    traps,
    relics,
    checkpoints: [{ x: 700, y: 440, w: 24, h: 45 }],
    shopLevel: false,
  };
}

function resetLevel(levelNum, refill = false) {
  current = generateLevel(levelNum);
  enemies = current.enemies.map((e) => ({ ...e, w: 28, h: 36 }));
  checkpoint = { ...current.spawn };
  player.x = current.spawn.x; player.y = current.spawn.y; player.vx = 0; player.vy = 0;
  player.onGround = false; player.touchingWall = 0; player.invuln = 0;
  if (refill) player.hp = player.maxHp;
  state.bullets = []; state.enemyBullets = [];
  state.inShop = current.shopLevel;
  ui.level.textContent = `Level ${levelNum}/${TOTAL_LEVELS} — ${current.name}`;
  ui.objective.textContent = current.objective;
  renderAbilityList();
}

function renderAbilityList() {
  ui.abilityList.innerHTML = abilityDefs.map((a) => {
    const unlocked = state.level >= a.unlockLevel;
    return `<li>${a.key} - ${a.name} ${unlocked ? '✅' : `(Unlocks at L${a.unlockLevel})`}</li>`;
  }).join('');
}

function firePlayerBullet(angle, dmg = 14, speed = 8) {
  const sx = player.x + PLAYER_W / 2;
  const sy = player.y + PLAYER_H / 2;
  state.bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: dmg * state.damageMult });
}

function canUseAbility(key) {
  const def = abilityDefs.find((a) => a.key === key);
  return def && state.level >= def.unlockLevel;
}

function triggerAbility(key) {
  if (state.over) return;
  if (state.inShop) {
    const buy = {
      '1': () => { if (state.coins >= 120) { state.coins -= 120; player.maxHp += 20; player.hp += 20; } },
      '2': () => { if (state.coins >= 150) { state.coins -= 150; state.damageMult *= 1.15; } },
      '3': () => { if (state.coins >= 140) { state.coins -= 140; state.cooldownMult *= 0.9; } },
    };
    if (buy[key]) buy[key]();
    return;
  }
  if (!canUseAbility(key)) return;

  if (key === '1' && player.cooldowns.burst <= 0) {
    const angle = Math.atan2(state.mouse.y - (player.y + PLAYER_H / 2), state.mouse.x - (player.x + PLAYER_W / 2));
    [-0.2, 0, 0.2].forEach((off) => firePlayerBullet(angle + off, 20, 9));
    player.cooldowns.burst = 85 * state.cooldownMult;
  }
  if (key === '2' && player.cooldowns.dash <= 0) {
    player.vx = player.facing * 12; firePlayerBullet(player.facing === 1 ? 0 : Math.PI, 28, 10);
    player.cooldowns.dash = 140 * state.cooldownMult;
  }
  if (key === '3' && player.cooldowns.smoke <= 0) {
    player.invuln = 115; emitParticles(player.x, player.y, '#94a3b8', 18);
    player.cooldowns.smoke = 220 * state.cooldownMult;
  }
  if (key === '4' && player.cooldowns.grapple <= 0) {
    const dx = state.mouse.x - (player.x + PLAYER_W / 2);
    const dy = state.mouse.y - (player.y + PLAYER_H / 2);
    const mag = Math.hypot(dx, dy) || 1;
    player.vx += (dx / mag) * 8.5; player.vy += (dy / mag) * 8.5;
    player.cooldowns.grapple = 150 * state.cooldownMult;
  }
  if (key === '5' && player.cooldowns.rain <= 0) {
    for (let i = 0; i < 12; i++) state.bullets.push({ x: state.mouse.x - 110 + i * 20, y: -10, vx: 0, vy: 8.2, dmg: 18 * state.damageMult });
    player.cooldowns.rain = 290 * state.cooldownMult;
  }
  if (key === '6' && player.cooldowns.fury <= 0) {
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      state.bullets.push({ x: player.x + 14, y: player.y + 18, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: 12 * state.damageMult });
    }
    player.cooldowns.fury = 360 * state.cooldownMult;
  }
}

function updatePlayer() {
  if (state.keys.a) { player.vx -= 0.75; player.facing = -1; }
  if (state.keys.d) { player.vx += 0.75; player.facing = 1; }
  if (!state.keys.a && !state.keys.d) player.vx *= FRICTION;

  if ((state.keys.w || state.keys[' ']) && !state.keys._jumpLock) {
    state.keys._jumpLock = true;
    if (player.onGround) player.vy = -10.8;
    else if (player.touchingWall !== 0) { player.vy = -10.2; player.vx = -player.touchingWall * 8.2; }
  }
  if (!state.keys.w && !state.keys[' ']) state.keys._jumpLock = false;

  if (player.touchingWall && !player.onGround && player.vy > 2) player.vy = 2;

  player.vx = Math.max(-7.8, Math.min(7.8, player.vx));
  player.vy += GRAVITY;
  player.x += player.vx; player.y += player.vy;

  player.onGround = false;
  player.touchingWall = 0;
  const box = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
  current.platforms.forEach((pl) => {
    if (!rectsOverlap(box, pl)) return;
    const prevX = box.x - player.vx; const prevY = box.y - player.vy;
    if (prevY + box.h <= pl.y) { box.y = pl.y - box.h; player.vy = 0; player.onGround = true; }
    else if (prevY >= pl.y + pl.h) { box.y = pl.y + pl.h; player.vy = Math.max(0, player.vy); }
    else if (prevX + box.w <= pl.x) { box.x = pl.x - box.w; player.vx = 0; player.touchingWall = 1; }
    else if (prevX >= pl.x + pl.w) { box.x = pl.x + pl.w; player.vx = 0; player.touchingWall = -1; }
  });
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_W, box.x));
  player.y = box.y;

  current.checkpoints.forEach((cp) => {
    if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, cp)) checkpoint = { x: cp.x, y: cp.y - 14 };
  });

  current.traps.forEach((trap) => {
    if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, trap) && player.invuln <= 0) player.hp -= 0.7;
  });

  current.relics.forEach((r) => {
    if (!r.taken && Math.hypot((player.x + PLAYER_W / 2) - r.x, (player.y + PLAYER_H / 2) - r.y) < 20) {
      r.taken = true;
      state.relicsCollected += 1;
      state.score += 120;
      state.coins += 45;
      emitParticles(r.x, r.y, '#fde047', 10);
    }
  });

  if (player.y > canvas.height + 30) {
    player.hp -= 15;
    player.x = checkpoint.x; player.y = checkpoint.y; player.vx = 0; player.vy = 0;
  }

  player.invuln = Math.max(0, player.invuln - 1);
  Object.keys(player.cooldowns).forEach((k) => { player.cooldowns[k] = Math.max(0, player.cooldowns[k] - 1); });
  if (player.hp <= 0) { state.over = true; state.won = false; }
}

function updateEnemies() {
  const levelSpeed = 1 + Math.floor(state.level / 8) * 0.1;
  enemies.forEach((e) => {
    if (e.kind === 'patrol') {
      e.x += e.dir * 1.5 * levelSpeed;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
    }
    if (e.kind === 'jumper') {
      e.x += e.dir * 1.2 * levelSpeed;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
      e.jumpCd -= 1;
      if (e.jumpCd <= 0) { e.vy = -8.5; e.jumpCd = 68; }
      e.vy += 0.4; e.y += e.vy;
      for (const pl of current.platforms) {
        if (rectsOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, pl) && e.vy >= 0 && e.y + e.h <= pl.y + 20) { e.y = pl.y - e.h; e.vy = 0; }
      }
    }
    if (e.kind === 'shooter') {
      e.shootCd -= 1;
      if (e.shootCd <= 0) {
        const sx = e.x + e.w / 2; const sy = e.y + e.h / 2;
        const a = Math.atan2((player.y + PLAYER_H / 2) - sy, (player.x + PLAYER_W / 2) - sx);
        state.enemyBullets.push({ x: sx, y: sy, vx: Math.cos(a) * 5.4, vy: Math.sin(a) * 5.4, dmg: 10 });
        e.shootCd = Math.max(42, 100 - state.level * 2);
      }
    }

    if (rectsOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }) && player.invuln <= 0) player.hp -= 0.45;
  });
  enemies = enemies.filter((e) => e.hp > 0);
}

function updateProjectiles() {
  state.bullets = state.bullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) return false;
    for (const pl of current.platforms) if (rectsOverlap({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 }, pl)) return false;
    for (const e of enemies) {
      if (rectsOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        e.hp -= b.dmg;
        state.score += 8;
        if (e.hp <= 0) { state.score += 60; state.coins += 20; }
        return false;
      }
    }
    return true;
  });

  state.enemyBullets = state.enemyBullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) return false;
    if (rectsOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H })) {
      if (player.invuln <= 0) player.hp -= b.dmg * 0.1;
      return false;
    }
    return true;
  });
}

function updateProgression() {
  const relicsLeft = current.relics.filter((r) => !r.taken).length;
  const gateOpen = enemies.length === 0 && relicsLeft === 0;
  const touchingGate = rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, current.gate);

  if (gateOpen && touchingGate) {
    state.score += 220;
    if (state.level >= TOTAL_LEVELS) {
      state.over = true; state.won = true;
      return;
    }
    state.level += 1;
    resetLevel(state.level, false);
  }

  const elapsedSec = ((performance.now() - state.startAt) / 1000).toFixed(1);
  ui.abilityStatus.textContent = state.inShop
    ? 'Shop open: [1] HP [2] Damage [3] Cooldown. Reach gate when done.'
    : `CD B:${Math.ceil(player.cooldowns.burst)} D:${Math.ceil(player.cooldowns.dash)} S:${Math.ceil(player.cooldowns.smoke)} G:${Math.ceil(player.cooldowns.grapple)} R:${Math.ceil(player.cooldowns.rain)} F:${Math.ceil(player.cooldowns.fury)} | Gate:${gateOpen ? 'OPEN' : 'LOCKED'}`;
  ui.runStats.textContent = `HP ${Math.max(0, player.hp).toFixed(0)} · Coins ${state.coins} · Score ${state.score} · Time ${elapsedSec}s`;
  ui.unlockStatus.textContent = `Unlocked: ${unlockedAbilities().map((a) => a.name).join(', ')}`;
}

function updateParticles() {
  state.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life -= 1; });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function update() {
  if (state.over) return;
  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updateParticles();
  updateProgression();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.inShop ? '#132022' : '#111b2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#24364f';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    const drift = (performance.now() * 0.03) % 85;
    ctx.moveTo(i * 85 + drift, 0);
    ctx.lineTo(i * 85 - 120 + drift, canvas.height);
    ctx.stroke();
  }

  current.platforms.forEach((pl) => { ctx.fillStyle = '#334155'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); });
  current.traps.forEach((t) => {
    ctx.fillStyle = '#ef4444'; ctx.fillRect(t.x, t.y, t.w, t.h);
    for (let x = t.x; x < t.x + t.w; x += 10) { ctx.beginPath(); ctx.moveTo(x, t.y); ctx.lineTo(x + 5, t.y - 8); ctx.lineTo(x + 10, t.y); ctx.fill(); }
  });

  current.checkpoints.forEach((cp) => {
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(cp.x + 6, cp.y - 20, 4, 20);
    ctx.beginPath(); ctx.moveTo(cp.x + 10, cp.y - 20); ctx.lineTo(cp.x + 24, cp.y - 14); ctx.lineTo(cp.x + 10, cp.y - 8); ctx.fill();
  });

  current.relics.forEach((r) => {
    if (r.taken) return;
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(r.x, r.y, 8, 0, Math.PI * 2); ctx.fill();
  });

  const relicsLeft = current.relics.filter((r) => !r.taken).length;
  const gateOpen = enemies.length === 0 && relicsLeft === 0;
  ctx.fillStyle = gateOpen ? '#22c55e' : '#6b7280';
  ctx.fillRect(current.gate.x, current.gate.y, current.gate.w, current.gate.h);
  ctx.fillStyle = '#e5e7eb'; ctx.fillText(gateOpen ? 'EXIT' : `LOCK ${relicsLeft}`, current.gate.x - 6, current.gate.y - 8);

  enemies.forEach((e) => {
    ctx.fillStyle = e.kind === 'shooter' ? '#f97316' : e.kind === 'jumper' ? '#a78bfa' : '#fb7185';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#111827'; ctx.fillRect(e.x, e.y - 8, e.w, 4);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x, e.y - 8, e.w * Math.max(0, e.hp / (70 + state.level * 3)), 4);
  });

  state.bullets.forEach((b) => { ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
  state.enemyBullets.forEach((b) => { ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });

  state.particles.forEach((p) => {
    ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0.2, p.life / 24);
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  });

  ctx.fillStyle = player.invuln > 0 ? '#cbd5e1' : '#f8fafc';
  ctx.fillRect(player.x, player.y, PLAYER_W, PLAYER_H);
  if (player.touchingWall && !player.onGround) { ctx.strokeStyle = '#facc15'; ctx.strokeRect(player.x - 2, player.y - 2, PLAYER_W + 4, PLAYER_H + 4); }

  ctx.fillStyle = '#111827'; ctx.fillRect(20, 20, 260, 24);
  ctx.fillStyle = '#22c55e'; ctx.fillRect(20, 20, 260 * Math.max(0, player.hp / player.maxHp), 24);
  ctx.strokeStyle = '#e5e7eb'; ctx.strokeRect(20, 20, 260, 24);
  ctx.fillStyle = '#fff'; ctx.fillText(`HP ${Math.max(0, player.hp).toFixed(0)}`, 26, 37);

  if (state.inShop) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(350, 200, 500, 200);
    ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif'; ctx.fillText('SHOP FLOOR', 540, 245);
    ctx.font = '16px sans-serif';
    ctx.fillText('[1] +20 Max HP (120 coins)', 420, 290);
    ctx.fillText('[2] +15% Damage (150 coins)', 420, 320);
    ctx.fillText('[3] -10% Cooldowns (140 coins)', 420, 350);
  }

  if (state.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = '38px sans-serif';
    const msg = state.won ? 'Master Ninja! 30 Levels Cleared.' : 'Defeated - Restart and Train More';
    ctx.fillText(msg, 300, 320);
  }
}

function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  state.keys[key] = true;
  if (['1', '2', '3', '4', '5', '6'].includes(e.key)) triggerAbility(e.key);
});
window.addEventListener('keyup', (e) => { state.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - r.left;
  state.mouse.y = e.clientY - r.top;
});
canvas.addEventListener('click', () => {
  if (state.inShop) return;
  const angle = Math.atan2(state.mouse.y - (player.y + PLAYER_H / 2), state.mouse.x - (player.x + PLAYER_W / 2));
  firePlayerBullet(angle, 14, 8);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  state.level = 1; state.over = false; state.won = false;
  state.score = 0; state.coins = 0; state.relicsCollected = 0; state.startAt = performance.now();
  state.damageMult = 1; state.cooldownMult = 1;
  player.maxHp = 120; player.hp = 120;
  resetLevel(1, true);
});

resetLevel(1, true);
gameLoop();
