const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  level: document.getElementById('levelLabel'),
  objective: document.getElementById('objective'),
  abilityStatus: document.getElementById('abilityStatus'),
  runStats: document.getElementById('runStats'),
  unlockStatus: document.getElementById('unlockStatus'),
  abilityList: document.getElementById('abilityList'),
  overlayTips: document.getElementById('overlayTips'),
};

const W = canvas.width;
const H = canvas.height;
const TOTAL_LEVELS = 40;
const PLAYER_W = 28;
const PLAYER_H = 44;
const GRAVITY = 0.46;
const FRICTION = 0.84;

const abilities = [
  { key: '1', name: 'Shuriken Burst', unlock: 1, cd: 'burst' },
  { key: '2', name: 'Dash Slash', unlock: 3, cd: 'dash' },
  { key: '3', name: 'Smoke Phase', unlock: 6, cd: 'smoke' },
  { key: '4', name: 'Grapple Pull', unlock: 9, cd: 'grapple' },
  { key: '5', name: 'Skyfall Rain', unlock: 12, cd: 'rain' },
  { key: '6', name: 'Blade Fury', unlock: 16, cd: 'fury' },
  { key: '7', name: 'Shadow Blink', unlock: 24, cd: 'blink' },
  { key: '8', name: 'Dragon Beam', unlock: 32, cd: 'beam' },
];

const state = {
  level: 1,
  worldWidth: 3600,
  mouse: { x: 0, y: 0 },
  keys: {},
  bullets: [],
  enemyBullets: [],
  particles: [],
  over: false,
  won: false,
  inShop: false,
  score: 0,
  coins: 0,
  relics: 0,
  startAt: performance.now(),
  damageMul: 1,
  cdMul: 1,
  speedMul: 1,
  camera: { x: 0, y: 0, shake: 0, breath: 0 },
};

const player = {
  x: 80, y: 600, vx: 0, vy: 0,
  hp: 120, maxHp: 120,
  onGround: false,
  touchingWall: 0,
  facing: 1,
  invuln: 0,
  anim: 0,
  cooldowns: { burst: 0, dash: 0, smoke: 0, grapple: 0, rain: 0, fury: 0, blink: 0, beam: 0 },
};

let lvl;
let enemies = [];
let checkpoint = { x: 80, y: 600 };
let beamTimer = 0;

const rect = (x, y, w, h) => ({ x, y, w, h });
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function rnd(min, max) { return min + Math.random() * (max - min); }

function emit(x, y, color, count = 8, s = 4) {
  for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: rnd(-s, s), vy: rnd(-s, s), life: rnd(14, 30), color });
}

function isUnlocked(key) {
  const a = abilities.find((i) => i.key === key);
  return a && state.level >= a.unlock;
}

function unlockedNames() {
  return abilities.filter((a) => state.level >= a.unlock).map((a) => a.name).join(', ');
}

function makeLevel(n) {
  const shop = n % 10 === 0;
  const diff = Math.floor((n - 1) / 2);
  const width = state.worldWidth;

  if (shop) {
    return {
      shop, name: `Sanctuary Shop ${n}`,
      objective: 'Buy upgrades and head to the gate.',
      spawn: { x: 100, y: 590 },
      gate: rect(width - 120, 560, 50, 80),
      platforms: [rect(0, 680, width, 80), rect(520, 560, 600, 24), rect(1600, 560, 600, 24)],
      traps: [], relics: [], checkpoints: [rect(520, 535, 26, 45)], enemies: [],
    };
  }

  const platforms = [rect(0, 680, width, 80)];
  for (let i = 0; i < 20; i++) {
    const x = 160 + i * 165;
    const y = 590 - Math.sin(i * 0.9 + n * 0.35) * (80 + Math.min(diff * 3, 90));
    platforms.push(rect(x, y, 130, 22));
  }
  for (let i = 0; i < 4; i++) platforms.push(rect(700 + i * 700, 380 - (i % 2) * 100, 24, 250));

  const enemiesOut = [];
  const count = 4 + Math.min(16, n);
  for (let i = 0; i < count; i++) {
    const k = ['patrol', 'shooter', 'jumper', 'flyer'][i % 4];
    const hpBase = 32 + diff * 6;
    enemiesOut.push({
      kind: k,
      x: 350 + i * 160,
      y: k === 'flyer' ? 350 + (i % 2) * 60 : 540 - (i % 4) * 70,
      w: 30, h: 38,
      minX: 280 + i * 160,
      maxX: 420 + i * 160,
      hp: hpBase + (k === 'jumper' ? 25 : k === 'shooter' ? 15 : k === 'flyer' ? 10 : 0),
      dir: i % 2 ? 1 : -1,
      shootCd: 100 - Math.min(50, diff * 2),
      jumpCd: 42,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const relics = [];
  const relicCount = 2 + Math.min(4, Math.floor(n / 7));
  for (let i = 0; i < relicCount; i++) relics.push({ x: 600 + i * 550, y: 520 - (i % 3) * 140, taken: false });

  const traps = [rect(840, 670, 140, 10), rect(1770, 670, 120, 10), rect(2620, 670, 160, 10)];

  return {
    shop, name: `Trial ${n}`,
    objective: 'Defeat enemies, collect relics, reach the gate.',
    spawn: { x: 90, y: 590 },
    gate: rect(width - 140, 220, 50, 80),
    platforms, traps, relics,
    checkpoints: [rect(1280, 540, 28, 46), rect(2400, 460, 28, 46)],
    enemies: enemiesOut,
  };
}

function resetLevel(num, refill = false) {
  lvl = makeLevel(num);
  enemies = lvl.enemies.map((e) => ({ ...e }));
  checkpoint = { ...lvl.spawn };
  player.x = lvl.spawn.x; player.y = lvl.spawn.y;
  player.vx = 0; player.vy = 0;
  player.invuln = 0; player.onGround = false; player.touchingWall = 0;
  if (refill) player.hp = player.maxHp;
  state.bullets = []; state.enemyBullets = []; state.particles = [];
  state.inShop = lvl.shop;
  beamTimer = 0;
  ui.level.textContent = `Level ${num} / ${TOTAL_LEVELS} — ${lvl.name}`;
  ui.objective.textContent = lvl.objective;
  ui.overlayTips.textContent = lvl.shop ? 'SHOP FLOOR: use 1-4 to buy upgrades, then go to gate.' : 'Combat floor: wall jump, chain abilities, and clear objective.';
  ui.abilityList.innerHTML = abilities.map((a) => `<li>${a.key}: ${a.name} ${state.level >= a.unlock ? '✅' : `(L${a.unlock})`}</li>`).join('');
}

function shootFromPlayer(angle, dmg = 14, speed = 9) {
  state.bullets.push({ x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: dmg * state.damageMul });
}

function triggerAbility(key) {
  if (state.over) return;
  if (state.inShop) {
    const buys = {
      '1': () => { if (state.coins >= 160) { state.coins -= 160; player.maxHp += 25; player.hp += 25; } },
      '2': () => { if (state.coins >= 180) { state.coins -= 180; state.damageMul *= 1.12; } },
      '3': () => { if (state.coins >= 170) { state.coins -= 170; state.cdMul *= 0.9; } },
      '4': () => { if (state.coins >= 160) { state.coins -= 160; state.speedMul *= 1.08; } },
    };
    if (buys[key]) buys[key]();
    return;
  }
  if (!isUnlocked(key)) return;

  const aim = Math.atan2(state.mouse.y - (player.y - state.camera.y + PLAYER_H / 2), state.mouse.x - (player.x - state.camera.x + PLAYER_W / 2));

  if (key === '1' && player.cooldowns.burst <= 0) {
    [-0.24, 0, 0.24].forEach((o) => shootFromPlayer(aim + o, 20, 10));
    player.cooldowns.burst = 80 * state.cdMul;
  }
  if (key === '2' && player.cooldowns.dash <= 0) {
    player.vx = player.facing * 14;
    shootFromPlayer(player.facing > 0 ? 0 : Math.PI, 28, 11);
    emit(player.x + 14, player.y + 18, '#67e8f9', 12, 6);
    state.camera.shake = 10;
    player.cooldowns.dash = 120 * state.cdMul;
  }
  if (key === '3' && player.cooldowns.smoke <= 0) {
    player.invuln = 120;
    emit(player.x + 14, player.y + 18, '#94a3b8', 20, 5);
    player.cooldowns.smoke = 210 * state.cdMul;
  }
  if (key === '4' && player.cooldowns.grapple <= 0) {
    const dx = (state.mouse.x + state.camera.x) - (player.x + PLAYER_W / 2);
    const dy = (state.mouse.y + state.camera.y) - (player.y + PLAYER_H / 2);
    const m = Math.hypot(dx, dy) || 1;
    player.vx += (dx / m) * 9;
    player.vy += (dy / m) * 9;
    player.cooldowns.grapple = 145 * state.cdMul;
  }
  if (key === '5' && player.cooldowns.rain <= 0) {
    const cx = state.mouse.x + state.camera.x;
    for (let i = 0; i < 14; i++) state.bullets.push({ x: cx - 140 + i * 20, y: -20, vx: rnd(-0.5, 0.5), vy: rnd(7.5, 9), dmg: 18 * state.damageMul });
    player.cooldowns.rain = 300 * state.cdMul;
  }
  if (key === '6' && player.cooldowns.fury <= 0) {
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      state.bullets.push({ x: player.x + 14, y: player.y + 20, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: 12 * state.damageMul });
    }
    player.cooldowns.fury = 330 * state.cdMul;
  }
  if (key === '7' && player.cooldowns.blink <= 0) {
    player.x += player.facing * 220;
    player.invuln = 25;
    emit(player.x + 10, player.y + 20, '#a78bfa', 18, 6);
    player.cooldowns.blink = 180 * state.cdMul;
  }
  if (key === '8' && player.cooldowns.beam <= 0) {
    beamTimer = 40;
    player.cooldowns.beam = 420 * state.cdMul;
  }
}

function updatePlayer() {
  const accel = 0.78 * state.speedMul;
  if (state.keys.a) { player.vx -= accel; player.facing = -1; }
  if (state.keys.d) { player.vx += accel; player.facing = 1; }
  if (!state.keys.a && !state.keys.d) player.vx *= FRICTION;

  if ((state.keys.w || state.keys[' ']) && !state.keys._jump) {
    state.keys._jump = true;
    if (player.onGround) player.vy = -11;
    else if (player.touchingWall !== 0) {
      player.vy = -10.4;
      player.vx = -player.touchingWall * 9;
      emit(player.x, player.y, '#facc15', 8, 4);
    }
  }
  if (!state.keys.w && !state.keys[' ']) state.keys._jump = false;

  if (player.touchingWall && !player.onGround && player.vy > 2) player.vy = 2;

  player.vx = Math.max(-8.5 * state.speedMul, Math.min(8.5 * state.speedMul, player.vx));
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.anim += Math.abs(player.vx) * 0.08 + 0.06;

  player.onGround = false;
  player.touchingWall = 0;
  const b = rect(player.x, player.y, PLAYER_W, PLAYER_H);

  lvl.platforms.forEach((p) => {
    if (!overlap(b, p)) return;
    const px = b.x - player.vx;
    const py = b.y - player.vy;
    if (py + b.h <= p.y) { b.y = p.y - b.h; player.vy = 0; player.onGround = true; }
    else if (py >= p.y + p.h) { b.y = p.y + p.h; player.vy = Math.max(0, player.vy); }
    else if (px + b.w <= p.x) { b.x = p.x - b.w; player.vx = 0; player.touchingWall = 1; }
    else if (px >= p.x + p.w) { b.x = p.x + p.w; player.vx = 0; player.touchingWall = -1; }
  });

  player.x = Math.max(0, Math.min(state.worldWidth - PLAYER_W, b.x));
  player.y = b.y;

  lvl.checkpoints.forEach((c) => {
    if (overlap(rect(player.x, player.y, PLAYER_W, PLAYER_H), c)) checkpoint = { x: c.x, y: c.y - 18 };
  });

  lvl.traps.forEach((t) => {
    if (overlap(rect(player.x, player.y, PLAYER_W, PLAYER_H), t) && player.invuln <= 0) {
      player.hp -= 0.8;
      state.camera.shake = 6;
      emit(player.x + 10, player.y + 20, '#ef4444', 4, 3);
    }
  });

  lvl.relics.forEach((r) => {
    if (!r.taken && Math.hypot(player.x + 14 - r.x, player.y + 20 - r.y) < 22) {
      r.taken = true;
      state.relics += 1;
      state.coins += 55;
      state.score += 150;
      emit(r.x, r.y, '#fde047', 12, 5);
    }
  });

  if (player.y > H + 50) {
    player.hp -= 16;
    player.x = checkpoint.x; player.y = checkpoint.y; player.vx = 0; player.vy = 0;
  }

  player.invuln = Math.max(0, player.invuln - 1);
  Object.keys(player.cooldowns).forEach((k) => { player.cooldowns[k] = Math.max(0, player.cooldowns[k] - 1); });
  if (player.hp <= 0) { state.over = true; state.won = false; }
}

function updateEnemies() {
  const scalar = 1 + Math.floor(state.level / 8) * 0.12;

  enemies.forEach((e) => {
    if (e.kind === 'patrol') {
      e.x += e.dir * 1.6 * scalar;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
    }
    if (e.kind === 'jumper') {
      e.x += e.dir * 1.25 * scalar;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
      e.jumpCd -= 1;
      if (e.jumpCd <= 0) { e.vy = -8.4; e.jumpCd = 65; }
      e.vy += 0.42;
      e.y += e.vy;
      lvl.platforms.forEach((p) => {
        if (overlap(rect(e.x, e.y, e.w, e.h), p) && e.vy >= 0 && e.y + e.h <= p.y + 20) { e.y = p.y - e.h; e.vy = 0; }
      });
    }
    if (e.kind === 'flyer') {
      e.phase += 0.05;
      e.y += Math.sin(e.phase) * 1.4;
      e.x += e.dir * 1.1;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
    }
    if (e.kind === 'shooter') {
      e.shootCd -= 1;
      if (e.shootCd <= 0) {
        const sx = e.x + e.w / 2;
        const sy = e.y + e.h / 2;
        const a = Math.atan2(player.y + 20 - sy, player.x + 14 - sx);
        state.enemyBullets.push({ x: sx, y: sy, vx: Math.cos(a) * 5.8, vy: Math.sin(a) * 5.8, dmg: 10 + state.level * 0.2 });
        e.shootCd = Math.max(30, 100 - state.level * 1.4);
      }
    }

    if (overlap(rect(e.x, e.y, e.w, e.h), rect(player.x, player.y, PLAYER_W, PLAYER_H)) && player.invuln <= 0) {
      player.hp -= 0.55;
      state.camera.shake = 8;
    }
  });

  enemies = enemies.filter((e) => e.hp > 0);
}

function updateProjectiles() {
  if (beamTimer > 0) {
    beamTimer -= 1;
    const beamDir = player.facing;
    enemies.forEach((e) => {
      const inBeam = beamDir > 0 ? e.x > player.x && Math.abs(e.y - player.y) < 40 : e.x < player.x && Math.abs(e.y - player.y) < 40;
      if (inBeam) e.hp -= 2.5 * state.damageMul;
    });
    if (beamTimer % 4 === 0) emit(player.x + (beamDir > 0 ? 40 : -10), player.y + 20, '#f97316', 5, 4);
  }

  state.bullets = state.bullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < -40 || b.x > state.worldWidth + 40 || b.y < -80 || b.y > H + 80) return false;

    for (const p of lvl.platforms) if (overlap(rect(b.x - 2, b.y - 2, 4, 4), p)) return false;

    for (const e of enemies) {
      if (overlap(rect(b.x - 3, b.y - 3, 6, 6), rect(e.x, e.y, e.w, e.h))) {
        e.hp -= b.dmg;
        state.score += 10;
        emit(b.x, b.y, '#67e8f9', 6, 3);
        if (e.hp <= 0) { state.coins += 22; state.score += 70; }
        return false;
      }
    }
    return true;
  });

  state.enemyBullets = state.enemyBullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < -20 || b.x > state.worldWidth + 20 || b.y < -50 || b.y > H + 50) return false;
    if (overlap(rect(b.x - 3, b.y - 3, 6, 6), rect(player.x, player.y, PLAYER_W, PLAYER_H))) {
      if (player.invuln <= 0) { player.hp -= b.dmg * 0.1; state.camera.shake = 6; }
      return false;
    }
    return true;
  });
}

function updateParticles() {
  state.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life -= 1; p.vx *= 0.97; p.vy *= 0.97; });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function updateProgress() {
  const relicsLeft = lvl.relics.filter((r) => !r.taken).length;
  const gateOpen = enemies.length === 0 && relicsLeft === 0;
  if (gateOpen && overlap(rect(player.x, player.y, PLAYER_W, PLAYER_H), lvl.gate)) {
    state.score += 250;
    if (state.level >= TOTAL_LEVELS) {
      state.over = true;
      state.won = true;
      return;
    }
    state.level += 1;
    resetLevel(state.level, false);
  }

  const secs = ((performance.now() - state.startAt) / 1000).toFixed(1);
  ui.abilityStatus.textContent = state.inShop
    ? 'Shop: press 1-4 to buy upgrades, then go to gate.'
    : `CD B:${Math.ceil(player.cooldowns.burst)} D:${Math.ceil(player.cooldowns.dash)} S:${Math.ceil(player.cooldowns.smoke)} G:${Math.ceil(player.cooldowns.grapple)} R:${Math.ceil(player.cooldowns.rain)} F:${Math.ceil(player.cooldowns.fury)} BL:${Math.ceil(player.cooldowns.blink)} DB:${Math.ceil(player.cooldowns.beam)} | Gate ${gateOpen ? 'OPEN' : 'LOCKED'}`;
  ui.runStats.textContent = `HP ${Math.max(0, player.hp).toFixed(0)} · Coins ${state.coins} · Score ${state.score} · Relics ${state.relics} · Time ${secs}s`;
  ui.unlockStatus.textContent = `Unlocked: ${unlockedNames()}`;
}

function updateCamera() {
  state.camera.breath += 0.02;
  const lookAhead = player.facing * 120 + Math.sin(state.camera.breath) * 20;
  const targetX = Math.max(0, Math.min(state.worldWidth - W, player.x - W / 2 + lookAhead));
  state.camera.x += (targetX - state.camera.x) * 0.08;
  state.camera.y += ((Math.sin(state.camera.breath * 0.8) * 6) - state.camera.y) * 0.05;
  state.camera.shake *= 0.88;
}

function worldToScreenX(x) {
  return x - state.camera.x + rnd(-state.camera.shake, state.camera.shake);
}

function drawPlayer() {
  const sx = worldToScreenX(player.x);
  const sy = player.y - state.camera.y;
  const walk = Math.sin(player.anim) * 6;

  if (player.invuln > 0) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(sx - 3, sy - 3, PLAYER_W + 6, PLAYER_H + 6);
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(sx, sy, PLAYER_W, PLAYER_H);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(sx + (player.facing > 0 ? 18 : 4), sy + 10, 6, 6);

  // simple limb animation
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(sx + 7, sy + PLAYER_H);
  ctx.lineTo(sx + 7 + walk * 0.5, sy + PLAYER_H + 10);
  ctx.moveTo(sx + 21, sy + PLAYER_H);
  ctx.lineTo(sx + 21 - walk * 0.5, sy + PLAYER_H + 10);
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, W, H);

  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, state.inShop ? '#173534' : '#14233a');
  g.addColorStop(1, '#0a1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // parallax mountains
  for (let layer = 1; layer <= 3; layer++) {
    const speed = layer * 0.15;
    ctx.fillStyle = layer === 1 ? '#1e293b' : layer === 2 ? '#1b2540' : '#111827';
    for (let i = 0; i < 8; i++) {
      const x = (i * 500) - (state.camera.x * speed % 500);
      const h = 120 + layer * 50 + (i % 2) * 40;
      ctx.beginPath();
      ctx.moveTo(x, H - 120);
      ctx.lineTo(x + 220, H - h);
      ctx.lineTo(x + 440, H - 120);
      ctx.closePath();
      ctx.fill();
    }
  }

  lvl.platforms.forEach((p) => {
    const x = worldToScreenX(p.x);
    const y = p.y - state.camera.y;
    const pg = ctx.createLinearGradient(0, y, 0, y + p.h);
    pg.addColorStop(0, '#475569');
    pg.addColorStop(1, '#334155');
    ctx.fillStyle = pg;
    ctx.fillRect(x, y, p.w, p.h);
  });

  lvl.traps.forEach((t) => {
    const x = worldToScreenX(t.x);
    const y = t.y - state.camera.y;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, y, t.w, t.h);
    for (let i = 0; i < t.w; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + 5, y - 8);
      ctx.lineTo(x + i + 10, y);
      ctx.fill();
    }
  });

  lvl.checkpoints.forEach((c) => {
    const x = worldToScreenX(c.x);
    const y = c.y - state.camera.y;
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x + 6, y - 22, 4, 22);
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 22);
    ctx.lineTo(x + 24, y - 16 + Math.sin(performance.now() * 0.01) * 2);
    ctx.lineTo(x + 10, y - 10);
    ctx.fill();
  });

  lvl.relics.forEach((r) => {
    if (r.taken) return;
    const x = worldToScreenX(r.x);
    const y = r.y - state.camera.y + Math.sin(performance.now() * 0.006 + r.x) * 4;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();
  });

  const relicsLeft = lvl.relics.filter((r) => !r.taken).length;
  const gateOpen = enemies.length === 0 && relicsLeft === 0;
  const gx = worldToScreenX(lvl.gate.x);
  const gy = lvl.gate.y - state.camera.y;
  ctx.fillStyle = gateOpen ? '#22c55e' : '#6b7280';
  ctx.fillRect(gx, gy, lvl.gate.w, lvl.gate.h);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(gateOpen ? 'EXIT' : `LOCK ${relicsLeft}`, gx - 4, gy - 8);

  enemies.forEach((e) => {
    const x = worldToScreenX(e.x);
    const y = e.y - state.camera.y;
    const pulse = 1 + Math.sin(performance.now() * 0.01 + e.x) * 0.06;

    ctx.save();
    ctx.translate(x + e.w / 2, y + e.h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-e.w / 2, -e.h / 2);
    ctx.fillStyle = e.kind === 'shooter' ? '#f97316' : e.kind === 'jumper' ? '#a78bfa' : e.kind === 'flyer' ? '#22d3ee' : '#fb7185';
    ctx.fillRect(0, 0, e.w, e.h);
    ctx.restore();

    ctx.fillStyle = '#111827';
    ctx.fillRect(x, y - 8, e.w, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y - 8, e.w * Math.max(0, e.hp / (120 + state.level * 2)), 4);
  });

  state.bullets.forEach((b) => {
    const x = worldToScreenX(b.x);
    const y = b.y - state.camera.y;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });
  state.enemyBullets.forEach((b) => {
    const x = worldToScreenX(b.x);
    const y = b.y - state.camera.y;
    ctx.fillStyle = '#fb7185';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });

  if (beamTimer > 0) {
    const x1 = worldToScreenX(player.x + 14);
    const y1 = player.y + 20 - state.camera.y;
    const x2 = x1 + player.facing * 800;
    ctx.strokeStyle = `rgba(249,115,22,${0.45 + beamTimer / 80})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y1 + Math.sin(performance.now() * 0.02) * 3);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  state.particles.forEach((p) => {
    const x = worldToScreenX(p.x);
    const y = p.y - state.camera.y;
    ctx.globalAlpha = Math.max(0.2, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  drawPlayer();

  // HP bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 20, 280, 24);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(20, 20, 280 * Math.max(0, player.hp / player.maxHp), 24);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(20, 20, 280, 24);

  if (state.inShop) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(420, 180, 560, 220);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText('SANCTUARY SHOP', 610, 225);
    ctx.font = '16px sans-serif';
    ctx.fillText('[1] +25 Max HP (160)', 500, 270);
    ctx.fillText('[2] +12% Damage (180)', 500, 300);
    ctx.fillText('[3] -10% Cooldown (170)', 500, 330);
    ctx.fillText('[4] +8% Move Speed (160)', 500, 360);
  }

  if (state.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '42px sans-serif';
    ctx.fillText(state.won ? 'Mythic Ninja - Campaign Cleared!' : 'Defeated... Train and Retry', 360, 340);
  }
}

function update() {
  if (state.over) return;
  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updateParticles();
  updateProgress();
  updateCamera();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  state.keys[key] = true;
  if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) triggerAbility(e.key);
});
window.addEventListener('keyup', (e) => { state.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - r.left;
  state.mouse.y = e.clientY - r.top;
});
canvas.addEventListener('click', () => {
  if (state.inShop) return;
  const angle = Math.atan2(state.mouse.y - (player.y - state.camera.y + PLAYER_H / 2), state.mouse.x - (player.x - state.camera.x + PLAYER_W / 2));
  shootFromPlayer(angle, 14, 9);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  state.level = 1;
  state.score = 0;
  state.coins = 0;
  state.relics = 0;
  state.over = false;
  state.won = false;
  state.damageMul = 1;
  state.cdMul = 1;
  state.speedMul = 1;
  state.startAt = performance.now();
  player.maxHp = 120;
  player.hp = 120;
  resetLevel(1, true);
});

resetLevel(1, true);
loop();
