const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  level: document.getElementById('levelLabel'),
  objective: document.getElementById('objective'),
  abilityStatus: document.getElementById('abilityStatus'),
  runStats: document.getElementById('runStats'),
};

const GRAVITY = 0.44;
const FRICTION = 0.84;
const PLAYER_W = 28;
const PLAYER_H = 42;

function makeLevel(name, objective, spawn, gate, platforms, enemies, traps, relics, checkpoints) {
  return { name, objective, spawn, gate, platforms, enemies, traps, relics, checkpoints };
}

const levels = [
  makeLevel('Temple Ruins', 'Practice wall jumps and gather all relics.', { x: 60, y: 560 }, { x: 1120, y: 560, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 220, y: 560, w: 180, h: 22 }, { x: 520, y: 490, w: 170, h: 22 }, { x: 800, y: 420, w: 180, h: 22 }, { x: 460, y: 330, w: 24, h: 220 }],
    [{ kind: 'patrol', x: 560, y: 454, minX: 500, maxX: 680, hp: 40, dir: 1 }, { kind: 'shooter', x: 860, y: 384, minX: 820, maxX: 960, hp: 38, dir: -1 }],
    [{ x: 430, y: 640, w: 70, h: 10 }], [{ x: 255, y: 524, taken: false }, { x: 860, y: 384, taken: false }], [{ x: 820, y: 390, w: 26, h: 45 }]),

  makeLevel('Moonlit Fortress', 'Cross spikes and defeat ranged defenders.', { x: 60, y: 560 }, { x: 1135, y: 490, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 120, y: 545, w: 140, h: 22 }, { x: 320, y: 470, w: 160, h: 22 }, { x: 560, y: 390, w: 160, h: 22 }, { x: 780, y: 320, w: 140, h: 22 }, { x: 960, y: 510, w: 200, h: 22 }, { x: 720, y: 240, w: 24, h: 180 }],
    [{ kind: 'patrol', x: 340, y: 434, minX: 320, maxX: 480, hp: 52, dir: 1 }, { kind: 'jumper', x: 600, y: 354, minX: 560, maxX: 720, hp: 58, dir: 1, vy: 0, jumpCd: 45 }, { kind: 'shooter', x: 1000, y: 474, minX: 960, maxX: 1140, hp: 62, dir: -1 }],
    [{ x: 265, y: 640, w: 100, h: 10 }, { x: 730, y: 640, w: 80, h: 10 }], [{ x: 360, y: 434, taken: false }, { x: 650, y: 350, taken: false }, { x: 1040, y: 474, taken: false }], [{ x: 960, y: 500, w: 24, h: 45 }]),

  makeLevel('Crimson Keep', 'Long climb with mixed enemy types and traps.', { x: 50, y: 560 }, { x: 1140, y: 260, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 130, y: 560, w: 170, h: 22 }, { x: 370, y: 485, w: 150, h: 22 }, { x: 600, y: 430, w: 150, h: 22 }, { x: 840, y: 350, w: 170, h: 22 }, { x: 1020, y: 260, w: 170, h: 22 }, { x: 545, y: 250, w: 24, h: 200 }],
    [{ kind: 'patrol', x: 390, y: 449, minX: 360, maxX: 530, hp: 65, dir: 1 }, { kind: 'shooter', x: 620, y: 394, minX: 580, maxX: 760, hp: 70, dir: -1 }, { kind: 'jumper', x: 900, y: 314, minX: 840, maxX: 1020, hp: 75, dir: 1, vy: 0, jumpCd: 60 }, { kind: 'patrol', x: 1080, y: 224, minX: 1020, maxX: 1180, hp: 80, dir: -1 }],
    [{ x: 300, y: 640, w: 70, h: 10 }, { x: 760, y: 640, w: 70, h: 10 }], [{ x: 180, y: 525, taken: false }, { x: 645, y: 390, taken: false }, { x: 1085, y: 220, taken: false }], [{ x: 840, y: 340, w: 24, h: 45 }]),

  makeLevel('Wind Cliffs', 'Use vertical walls and grapple routes.', { x: 40, y: 580 }, { x: 1130, y: 170, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 100, y: 560, w: 160, h: 22 }, { x: 270, y: 470, w: 140, h: 22 }, { x: 450, y: 380, w: 140, h: 22 }, { x: 640, y: 300, w: 140, h: 22 }, { x: 840, y: 230, w: 140, h: 22 }, { x: 1020, y: 170, w: 160, h: 22 }, { x: 405, y: 300, w: 20, h: 180 }, { x: 790, y: 170, w: 20, h: 180 }],
    [{ kind: 'shooter', x: 300, y: 434, minX: 270, maxX: 410, hp: 70, dir: 1 }, { kind: 'jumper', x: 680, y: 264, minX: 640, maxX: 780, hp: 82, dir: -1, vy: 0, jumpCd: 35 }, { kind: 'patrol', x: 1060, y: 134, minX: 1020, maxX: 1180, hp: 86, dir: -1 }],
    [{ x: 500, y: 640, w: 90, h: 10 }], [{ x: 150, y: 524, taken: false }, { x: 480, y: 344, taken: false }, { x: 890, y: 194, taken: false }], [{ x: 640, y: 290, w: 24, h: 45 }]),

  makeLevel('Night Citadel', 'Fast enemies with heavy projectile pressure.', { x: 50, y: 560 }, { x: 1130, y: 240, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 130, y: 560, w: 150, h: 22 }, { x: 330, y: 500, w: 120, h: 22 }, { x: 500, y: 440, w: 120, h: 22 }, { x: 670, y: 380, w: 120, h: 22 }, { x: 840, y: 320, w: 120, h: 22 }, { x: 990, y: 240, w: 190, h: 22 }, { x: 460, y: 280, w: 20, h: 180 }],
    [{ kind: 'shooter', x: 340, y: 464, minX: 330, maxX: 450, hp: 76, dir: 1 }, { kind: 'shooter', x: 690, y: 344, minX: 670, maxX: 790, hp: 82, dir: -1 }, { kind: 'jumper', x: 880, y: 284, minX: 840, maxX: 960, hp: 88, dir: 1, vy: 0, jumpCd: 25 }, { kind: 'patrol', x: 1080, y: 204, minX: 990, maxX: 1180, hp: 95, dir: -1 }],
    [{ x: 290, y: 640, w: 70, h: 10 }, { x: 620, y: 640, w: 70, h: 10 }, { x: 800, y: 640, w: 70, h: 10 }], [{ x: 350, y: 464, taken: false }, { x: 700, y: 344, taken: false }, { x: 1040, y: 204, taken: false }], [{ x: 840, y: 310, w: 24, h: 45 }]),

  makeLevel('Dragon Summit', 'Final gauntlet: clear all and escape.', { x: 40, y: 560 }, { x: 1135, y: 110, w: 42, h: 70 },
    [{ x: 0, y: 650, w: 1200, h: 50 }, { x: 100, y: 560, w: 140, h: 22 }, { x: 280, y: 500, w: 140, h: 22 }, { x: 460, y: 440, w: 140, h: 22 }, { x: 640, y: 370, w: 140, h: 22 }, { x: 820, y: 300, w: 140, h: 22 }, { x: 1000, y: 230, w: 180, h: 22 }, { x: 1060, y: 110, w: 130, h: 22 }, { x: 420, y: 300, w: 20, h: 220 }, { x: 780, y: 230, w: 20, h: 220 }],
    [{ kind: 'patrol', x: 300, y: 464, minX: 280, maxX: 420, hp: 85, dir: 1 }, { kind: 'jumper', x: 500, y: 404, minX: 460, maxX: 600, hp: 92, dir: -1, vy: 0, jumpCd: 20 }, { kind: 'shooter', x: 680, y: 334, minX: 640, maxX: 780, hp: 95, dir: 1 }, { kind: 'jumper', x: 860, y: 264, minX: 820, maxX: 960, hp: 100, dir: -1, vy: 0, jumpCd: 22 }, { kind: 'shooter', x: 1070, y: 194, minX: 1000, maxX: 1180, hp: 110, dir: 1 }],
    [{ x: 245, y: 640, w: 100, h: 10 }, { x: 605, y: 640, w: 100, h: 10 }, { x: 965, y: 640, w: 100, h: 10 }], [{ x: 170, y: 524, taken: false }, { x: 510, y: 404, taken: false }, { x: 890, y: 264, taken: false }, { x: 1090, y: 194, taken: false }], [{ x: 1000, y: 220, w: 24, h: 45 }]),
];

const state = {
  levelIndex: 0,
  mouse: { x: 0, y: 0 },
  keys: {},
  bullets: [],
  enemyBullets: [],
  particles: [],
  over: false,
  won: false,
  score: 0,
  relicsCollected: 0,
  startAt: performance.now(),
};

const player = {
  x: 60, y: 560, vx: 0, vy: 0,
  hp: 120, maxHp: 120,
  onGround: false, touchingWall: 0,
  facing: 1, invuln: 0,
  cooldowns: { burst: 0, dash: 0, smoke: 0, grapple: 0, rain: 0 },
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

function resetLevel(index, preserveHP = true) {
  current = structuredClone(levels[index]);
  enemies = current.enemies.map((e) => ({ ...e, w: 28, h: 36, shootCd: 90 }));
  checkpoint = { ...current.spawn };
  player.x = current.spawn.x;
  player.y = current.spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 0;
  player.onGround = false;
  player.touchingWall = 0;
  if (!preserveHP) player.hp = player.maxHp;
  state.bullets = [];
  state.enemyBullets = [];
  ui.level.textContent = `Level ${index + 1}/${levels.length} — ${current.name}`;
  ui.objective.textContent = current.objective;
}

function firePlayerBullet(angle, dmg = 14, speed = 8) {
  const sx = player.x + PLAYER_W / 2;
  const sy = player.y + PLAYER_H / 2;
  state.bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg });
}

function triggerAbility(key) {
  if (state.over) return;

  if (key === '1' && player.cooldowns.burst <= 0) {
    const angle = Math.atan2(state.mouse.y - (player.y + PLAYER_H / 2), state.mouse.x - (player.x + PLAYER_W / 2));
    [-0.2, 0, 0.2].forEach((off) => firePlayerBullet(angle + off, 20, 9));
    player.cooldowns.burst = 85;
  }
  if (key === '2' && player.cooldowns.dash <= 0) {
    player.vx = player.facing * 11;
    player.cooldowns.dash = 140;
  }
  if (key === '3' && player.cooldowns.smoke <= 0) {
    player.invuln = 110;
    player.cooldowns.smoke = 220;
    emitParticles(player.x + 12, player.y + 16, '#94a3b8', 16);
  }
  if (key === '4' && player.cooldowns.grapple <= 0) {
    const dx = state.mouse.x - (player.x + PLAYER_W / 2);
    const dy = state.mouse.y - (player.y + PLAYER_H / 2);
    const mag = Math.hypot(dx, dy) || 1;
    player.vx += (dx / mag) * 8;
    player.vy += (dy / mag) * 8;
    player.cooldowns.grapple = 150;
  }
  if (key === '5' && player.cooldowns.rain <= 0) {
    for (let i = 0; i < 10; i++) {
      const x = state.mouse.x - 100 + i * 20;
      state.bullets.push({ x, y: 0, vx: 0, vy: 8, dmg: 16 });
    }
    player.cooldowns.rain = 300;
  }
}

function solveMapCollision(box, vx, vy) {
  current.platforms.forEach((pl) => {
    if (!rectsOverlap(box, pl)) return;

    const prevX = box.x - vx;
    const prevY = box.y - vy;
    const fromTop = prevY + box.h <= pl.y;
    const fromBottom = prevY >= pl.y + pl.h;
    const fromLeft = prevX + box.w <= pl.x;
    const fromRight = prevX >= pl.x + pl.w;

    if (fromTop) { box.y = pl.y - box.h; box.vy = 0; box.onGround = true; }
    else if (fromBottom) { box.y = pl.y + pl.h; box.vy = Math.max(0, box.vy); }
    else if (fromLeft) { box.x = pl.x - box.w; box.vx = 0; box.touchingWall = 1; }
    else if (fromRight) { box.x = pl.x + pl.w; box.vx = 0; box.touchingWall = -1; }
  });
}

function updatePlayer() {
  if (state.keys.a) { player.vx -= 0.75; player.facing = -1; }
  if (state.keys.d) { player.vx += 0.75; player.facing = 1; }
  if (!state.keys.a && !state.keys.d) player.vx *= FRICTION;

  if ((state.keys.w || state.keys[' ']) && !state.keys._jumpLock) {
    state.keys._jumpLock = true;
    if (player.onGround) {
      player.vy = -10.8;
      player.onGround = false;
    } else if (player.touchingWall !== 0) {
      player.vy = -10.2;
      player.vx = -player.touchingWall * 8;
      player.touchingWall = 0;
    }
  }
  if (!state.keys.w && !state.keys[' ']) state.keys._jumpLock = false;

  if (player.touchingWall && !player.onGround && player.vy > 2) player.vy = 2;

  player.vx = Math.max(-7.5, Math.min(7.5, player.vx));
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;
  player.touchingWall = 0;

  const box = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H, vx: player.vx, vy: player.vy, onGround: false, touchingWall: 0 };
  solveMapCollision(box, player.vx, player.vy);
  Object.assign(player, { x: box.x, y: box.y, vx: box.vx, vy: box.vy, onGround: box.onGround, touchingWall: box.touchingWall });

  player.x = Math.max(0, Math.min(canvas.width - PLAYER_W, player.x));

  for (const cp of current.checkpoints) {
    if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, cp)) checkpoint = { x: cp.x, y: cp.y - 10 };
  }

  current.traps.forEach((trap) => {
    if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, trap) && player.invuln <= 0) {
      player.hp -= 0.7;
      emitParticles(player.x + 10, player.y + 20, '#ef4444', 5);
    }
  });

  current.relics.forEach((r) => {
    if (!r.taken && Math.hypot((player.x + PLAYER_W / 2) - r.x, (player.y + PLAYER_H / 2) - r.y) < 20) {
      r.taken = true;
      state.relicsCollected += 1;
      state.score += 150;
      player.hp = Math.min(player.maxHp, player.hp + 8);
      emitParticles(r.x, r.y, '#fde047', 10);
    }
  });

  if (player.y > canvas.height + 40) {
    player.hp -= 18;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.vx = 0; player.vy = 0;
  }

  player.invuln = Math.max(0, player.invuln - 1);
  Object.keys(player.cooldowns).forEach((k) => { player.cooldowns[k] = Math.max(0, player.cooldowns[k] - 1); });

  if (player.hp <= 0) { state.over = true; state.won = false; }
}

function updateEnemies() {
  enemies.forEach((e) => {
    if (e.kind === 'patrol') {
      e.x += e.dir * 1.5;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
    }

    if (e.kind === 'jumper') {
      e.x += e.dir * 1.2;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;
      e.jumpCd -= 1;
      if (e.jumpCd <= 0) { e.vy = -8; e.jumpCd = 65; }
      e.vy += 0.4;
      e.y += e.vy;
      for (const pl of current.platforms) {
        if (rectsOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, pl) && e.vy >= 0 && e.y + e.h <= pl.y + 20) {
          e.y = pl.y - e.h;
          e.vy = 0;
        }
      }
    }

    if (e.kind === 'shooter') {
      e.shootCd -= 1;
      if (e.shootCd <= 0) {
        const sx = e.x + e.w / 2;
        const sy = e.y + e.h / 2;
        const a = Math.atan2((player.y + PLAYER_H / 2) - sy, (player.x + PLAYER_W / 2) - sx);
        state.enemyBullets.push({ x: sx, y: sy, vx: Math.cos(a) * 5.2, vy: Math.sin(a) * 5.2, dmg: 8 });
        e.shootCd = 90;
      }
    }

    if (rectsOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }) && player.invuln <= 0) {
      player.hp -= 0.45;
      emitParticles(player.x + 12, player.y + 20, '#fb7185', 4);
    }
  });

  enemies = enemies.filter((e) => e.hp > 0);
}

function updateProjectiles() {
  state.bullets = state.bullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) return false;

    for (const pl of current.platforms) {
      if (rectsOverlap({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 }, pl)) return false;
    }

    for (const e of enemies) {
      if (rectsOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        e.hp -= b.dmg;
        state.score += 10;
        emitParticles(b.x, b.y, '#67e8f9', 6);
        if (e.hp <= 0) state.score += 80;
        return false;
      }
    }
    return true;
  });

  state.enemyBullets = state.enemyBullets.filter((b) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) return false;
    if (rectsOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H })) {
      if (player.invuln <= 0) player.hp -= b.dmg * 0.12;
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
    state.score += 300;
    if (state.levelIndex === levels.length - 1) {
      state.over = true;
      state.won = true;
      return;
    }
    state.levelIndex += 1;
    resetLevel(state.levelIndex);
  }

  const elapsedSec = ((performance.now() - state.startAt) / 1000).toFixed(1);
  ui.abilityStatus.textContent = `CD Burst:${player.cooldowns.burst} Dash:${player.cooldowns.dash} Smoke:${player.cooldowns.smoke} Grapple:${player.cooldowns.grapple} Rain:${player.cooldowns.rain} | Gate:${gateOpen ? 'OPEN' : 'LOCKED'} | Time:${elapsedSec}s`;
  ui.runStats.textContent = `HP ${Math.max(0, player.hp).toFixed(0)} · Relics ${state.relicsCollected} · Score ${state.score}`;
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
  ctx.fillStyle = '#111b2e';
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
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(t.x, t.y, t.w, t.h);
    for (let x = t.x; x < t.x + t.w; x += 10) { ctx.beginPath(); ctx.moveTo(x, t.y); ctx.lineTo(x + 5, t.y - 8); ctx.lineTo(x + 10, t.y); ctx.fill(); }
  });

  current.checkpoints.forEach((cp) => {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(cp.x + 6, cp.y - 20, 4, 20);
    ctx.beginPath();
    ctx.moveTo(cp.x + 10, cp.y - 20);
    ctx.lineTo(cp.x + 24, cp.y - 14);
    ctx.lineTo(cp.x + 10, cp.y - 8);
    ctx.fill();
  });

  current.relics.forEach((r) => {
    if (r.taken) return;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(r.x, r.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  const relicsLeft = current.relics.filter((r) => !r.taken).length;
  const gateOpen = enemies.length === 0 && relicsLeft === 0;
  ctx.fillStyle = gateOpen ? '#22c55e' : '#6b7280';
  ctx.fillRect(current.gate.x, current.gate.y, current.gate.w, current.gate.h);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(gateOpen ? 'EXIT' : `LOCK ${relicsLeft}`, current.gate.x - 6, current.gate.y - 8);

  enemies.forEach((e) => {
    ctx.fillStyle = e.kind === 'shooter' ? '#f97316' : e.kind === 'jumper' ? '#a78bfa' : '#fb7185';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#111827'; ctx.fillRect(e.x, e.y - 8, e.w, 4);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x, e.y - 8, e.w * Math.max(0, e.hp / 110), 4);
  });

  [...state.bullets, ...state.enemyBullets].forEach((b) => {
    ctx.fillStyle = state.enemyBullets.includes(b) ? '#fb7185' : '#67e8f9';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  });

  state.particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0.2, p.life / 24);
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = player.invuln > 0 ? '#cbd5e1' : '#f8fafc';
  ctx.fillRect(player.x, player.y, PLAYER_W, PLAYER_H);
  if (player.touchingWall && !player.onGround) { ctx.strokeStyle = '#facc15'; ctx.strokeRect(player.x - 2, player.y - 2, PLAYER_W + 4, PLAYER_H + 4); }

  ctx.fillStyle = '#111827'; ctx.fillRect(20, 20, 260, 24);
  ctx.fillStyle = '#22c55e'; ctx.fillRect(20, 20, 260 * Math.max(0, player.hp / player.maxHp), 24);
  ctx.strokeStyle = '#e5e7eb'; ctx.strokeRect(20, 20, 260, 24);
  ctx.fillStyle = '#fff'; ctx.fillText(`HP ${Math.max(0, player.hp).toFixed(0)}`, 26, 37);

  if (state.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = '38px sans-serif';
    const msg = state.won ? 'Legendary Victory - Campaign Cleared!' : 'Defeated - Restart and Try Again';
    ctx.fillText(msg, 250, 320);
  }
}

function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  state.keys[key] = true;
  if (['1', '2', '3', '4', '5'].includes(e.key)) triggerAbility(e.key);
});
window.addEventListener('keyup', (e) => { state.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - r.left;
  state.mouse.y = e.clientY - r.top;
});
canvas.addEventListener('click', () => {
  const angle = Math.atan2(state.mouse.y - (player.y + PLAYER_H / 2), state.mouse.x - (player.x + PLAYER_W / 2));
  firePlayerBullet(angle, 14, 8);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  state.levelIndex = 0; state.over = false; state.won = false;
  state.score = 0; state.relicsCollected = 0; state.startAt = performance.now();
  resetLevel(0, false);
});

resetLevel(0, false);
gameLoop();
