const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  level: document.getElementById('levelLabel'),
  objective: document.getElementById('objective'),
  abilityStatus: document.getElementById('abilityStatus'),
};

const GRAVITY = 0.45;
const FRICTION = 0.84;
const PLAYER_W = 28;
const PLAYER_H = 42;

const levels = [
  {
    name: 'Temple Ruins',
    objective: 'Learn movement, wall jump, and reach the gate.',
    spawn: { x: 60, y: 560 },
    gate: { x: 1120, y: 560, w: 40, h: 70 },
    platforms: [
      { x: 0, y: 650, w: 1200, h: 50 },
      { x: 220, y: 560, w: 180, h: 22 },
      { x: 520, y: 490, w: 170, h: 22 },
      { x: 800, y: 420, w: 180, h: 22 },
      { x: 1020, y: 560, w: 130, h: 22 },
      { x: 460, y: 350, w: 24, h: 210 },
    ],
    enemies: [
      { x: 580, y: 450, minX: 520, maxX: 680, hp: 40, dir: 1 },
      { x: 870, y: 380, minX: 810, maxX: 980, hp: 50, dir: -1 },
    ],
    traps: [{ x: 430, y: 640, w: 70, h: 10 }],
  },
  {
    name: 'Moonlit Fortress',
    objective: 'Use wall jumps and abilities to cross deadly spikes.',
    spawn: { x: 50, y: 560 },
    gate: { x: 1140, y: 510, w: 40, h: 70 },
    platforms: [
      { x: 0, y: 650, w: 1200, h: 50 },
      { x: 120, y: 545, w: 140, h: 22 },
      { x: 320, y: 470, w: 160, h: 22 },
      { x: 560, y: 390, w: 160, h: 22 },
      { x: 780, y: 320, w: 140, h: 22 },
      { x: 970, y: 510, w: 190, h: 22 },
      { x: 720, y: 240, w: 24, h: 170 },
    ],
    enemies: [
      { x: 340, y: 430, minX: 320, maxX: 480, hp: 55, dir: 1 },
      { x: 990, y: 470, minX: 960, maxX: 1140, hp: 60, dir: -1 },
      { x: 600, y: 350, minX: 560, maxX: 720, hp: 60, dir: 1 },
    ],
    traps: [
      { x: 265, y: 640, w: 100, h: 10 },
      { x: 730, y: 640, w: 80, h: 10 },
    ],
  },
  {
    name: 'Crimson Keep',
    objective: 'Defeat elite guards and reach the final gate.',
    spawn: { x: 40, y: 560 },
    gate: { x: 1140, y: 260, w: 40, h: 70 },
    platforms: [
      { x: 0, y: 650, w: 1200, h: 50 },
      { x: 130, y: 560, w: 170, h: 22 },
      { x: 370, y: 485, w: 150, h: 22 },
      { x: 600, y: 430, w: 150, h: 22 },
      { x: 840, y: 350, w: 170, h: 22 },
      { x: 1020, y: 260, w: 170, h: 22 },
      { x: 545, y: 250, w: 24, h: 200 },
    ],
    enemies: [
      { x: 390, y: 445, minX: 360, maxX: 530, hp: 70, dir: 1 },
      { x: 620, y: 390, minX: 580, maxX: 760, hp: 75, dir: -1 },
      { x: 900, y: 310, minX: 840, maxX: 1020, hp: 85, dir: 1 },
      { x: 1060, y: 220, minX: 1020, maxX: 1180, hp: 95, dir: -1 },
    ],
    traps: [{ x: 300, y: 640, w: 70, h: 10 }, { x: 760, y: 640, w: 70, h: 10 }],
  },
];

const state = {
  levelIndex: 0,
  mouse: { x: 0, y: 0 },
  keys: {},
  bullets: [],
  particles: [],
  over: false,
  won: false,
};

const player = {
  x: 60,
  y: 560,
  vx: 0,
  vy: 0,
  hp: 120,
  maxHp: 120,
  onGround: false,
  touchingWall: 0,
  facing: 1,
  invuln: 0,
  dash: 0,
  cooldowns: { burst: 0, dash: 0, smoke: 0, grapple: 0 },
};

let current = null;
let enemies = [];

function resetLevel(index) {
  current = levels[index];
  enemies = current.enemies.map((e) => ({ ...e, w: 28, h: 36 }));
  Object.assign(player, {
    x: current.spawn.x,
    y: current.spawn.y,
    vx: 0,
    vy: 0,
    hp: Math.min(player.hp + 20, player.maxHp),
    onGround: false,
    touchingWall: 0,
    invuln: 0,
  });
  state.bullets = [];
  ui.level.textContent = `Level ${index + 1} / ${levels.length} — ${current.name}`;
  ui.objective.textContent = current.objective;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hitParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    state.particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 25, color });
  }
}

function triggerAbility(key) {
  if (state.over) return;
  if (key === '1' && player.cooldowns.burst <= 0) {
    const sx = player.x + PLAYER_W / 2;
    const sy = player.y + PLAYER_H / 2;
    [-0.18, 0, 0.18].forEach((offset) => {
      const angle = Math.atan2(state.mouse.y - sy, state.mouse.x - sx) + offset;
      state.bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9, fromPlayer: true, dmg: 18 });
    });
    player.cooldowns.burst = 90;
  }

  if (key === '2' && player.cooldowns.dash <= 0) {
    player.dash = 14;
    player.vx = player.facing * 10;
    player.cooldowns.dash = 130;
  }

  if (key === '3' && player.cooldowns.smoke <= 0) {
    player.invuln = 110;
    player.cooldowns.smoke = 220;
    hitParticles(player.x + 12, player.y + 20, '#94a3b8');
  }

  if (key === '4' && player.cooldowns.grapple <= 0) {
    const dx = state.mouse.x - (player.x + PLAYER_W / 2);
    const dy = state.mouse.y - (player.y + PLAYER_H / 2);
    const mag = Math.hypot(dx, dy) || 1;
    player.vx += (dx / mag) * 9;
    player.vy += (dy / mag) * 9;
    player.cooldowns.grapple = 150;
  }
}

function updatePlayer() {
  const speed = 0.75;
  if (state.keys.a) {
    player.vx -= speed;
    player.facing = -1;
  }
  if (state.keys.d) {
    player.vx += speed;
    player.facing = 1;
  }

  if (!state.keys.a && !state.keys.d) player.vx *= FRICTION;

  if (state.keys.w || state.keys[' ']) {
    if (player.onGround) {
      player.vy = -10.6;
      player.onGround = false;
    } else if (player.touchingWall !== 0) {
      // Wall jump
      player.vy = -10.2;
      player.vx = -player.touchingWall * 7.8;
      player.touchingWall = 0;
    }
  }

  if (player.touchingWall !== 0 && !player.onGround && player.vy > 2) player.vy = 2; // wall slide

  player.vx = Math.max(-7.5, Math.min(7.5, player.vx));
  player.vy += GRAVITY;

  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  player.touchingWall = 0;

  const pRect = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };

  current.platforms.forEach((pl) => {
    if (!rectsOverlap(pRect, pl)) return;

    const prevX = player.x - player.vx;
    const prevY = player.y - player.vy;

    const fromTop = prevY + PLAYER_H <= pl.y;
    const fromBottom = prevY >= pl.y + pl.h;
    const fromLeft = prevX + PLAYER_W <= pl.x;
    const fromRight = prevX >= pl.x + pl.w;

    if (fromTop) {
      player.y = pl.y - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    } else if (fromBottom) {
      player.y = pl.y + pl.h;
      player.vy = Math.max(0, player.vy);
    } else if (fromLeft) {
      player.x = pl.x - PLAYER_W;
      player.vx = 0;
      player.touchingWall = 1;
    } else if (fromRight) {
      player.x = pl.x + pl.w;
      player.vx = 0;
      player.touchingWall = -1;
    }

    pRect.x = player.x;
    pRect.y = player.y;
  });

  player.x = Math.max(0, Math.min(canvas.width - PLAYER_W, player.x));
  if (player.y > canvas.height + 60) {
    player.hp -= 30;
    player.x = current.spawn.x;
    player.y = current.spawn.y;
    player.vx = 0;
    player.vy = 0;
  }

  current.traps.forEach((trap) => {
    if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, trap) && player.invuln <= 0) {
      player.hp -= 0.7;
      hitParticles(player.x + 10, player.y + 20, '#ef4444');
    }
  });

  player.invuln = Math.max(0, player.invuln - 1);
  player.dash = Math.max(0, player.dash - 1);
  Object.keys(player.cooldowns).forEach((k) => {
    player.cooldowns[k] = Math.max(0, player.cooldowns[k] - 1);
  });

  if (player.hp <= 0) {
    state.over = true;
    state.won = false;
  }
}

function updateEnemies() {
  enemies.forEach((e) => {
    e.x += e.dir * 1.5;
    if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;

    const touchingPlayer = rectsOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H });
    if (touchingPlayer && player.invuln <= 0) {
      player.hp -= 0.4;
      hitParticles(player.x + 10, player.y + 20, '#fb7185');
    }
  });

  enemies = enemies.filter((e) => e.hp > 0);
}

function updateBullets() {
  state.bullets = state.bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) return false;

    if (b.fromPlayer) {
      for (const e of enemies) {
        if (rectsOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
          e.hp -= b.dmg;
          hitParticles(b.x, b.y, '#67e8f9');
          return false;
        }
      }
    }

    for (const pl of current.platforms) {
      if (rectsOverlap({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 }, pl)) return false;
    }

    return true;
  });
}

function checkLevelProgress() {
  const gateOpen = enemies.length === 0;
  const touchingGate = rectsOverlap(
    { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H },
    current.gate,
  );

  if (gateOpen && touchingGate) {
    if (state.levelIndex === levels.length - 1) {
      state.over = true;
      state.won = true;
      return;
    }
    state.levelIndex += 1;
    resetLevel(state.levelIndex);
  }
}

function updateParticles() {
  state.particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function update() {
  if (state.over) return;
  updatePlayer();
  updateEnemies();
  updateBullets();
  updateParticles();
  checkLevelProgress();

  const gateOpen = enemies.length === 0;
  ui.abilityStatus.textContent = `Cooldowns — Burst:${player.cooldowns.burst} Dash:${player.cooldowns.dash} Smoke:${player.cooldowns.smoke} Grapple:${player.cooldowns.grapple} | Gate: ${gateOpen ? 'OPEN' : 'LOCKED'}`;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111b2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Parallax background stripes
  ctx.strokeStyle = '#24364f';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 85 + (performance.now() * 0.03) % 85, 0);
    ctx.lineTo(i * 85 - 120 + (performance.now() * 0.03) % 85, canvas.height);
    ctx.stroke();
  }

  current.platforms.forEach((pl) => {
    ctx.fillStyle = '#334155';
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  });

  current.traps.forEach((trap) => {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    for (let x = trap.x; x < trap.x + trap.w; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, trap.y);
      ctx.lineTo(x + 5, trap.y - 8);
      ctx.lineTo(x + 10, trap.y);
      ctx.fill();
    }
  });

  const gateOpen = enemies.length === 0;
  ctx.fillStyle = gateOpen ? '#22c55e' : '#6b7280';
  ctx.fillRect(current.gate.x, current.gate.y, current.gate.w, current.gate.h);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(gateOpen ? 'EXIT' : 'LOCKED', current.gate.x - 4, current.gate.y - 8);

  enemies.forEach((e) => {
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#111827';
    ctx.fillRect(e.x, e.y - 8, e.w, 4);
    ctx.fillStyle = '#22c55e';
    const maxHp = current.enemies.find((en) => en.minX === e.minX && en.maxX === e.maxX)?.hp || 100;
    ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / maxHp), 4);
  });

  state.bullets.forEach((b) => {
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  state.particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0.2, p.life / 25);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = player.invuln > 0 ? '#cbd5e1' : '#f8fafc';
  ctx.fillRect(player.x, player.y, PLAYER_W, PLAYER_H);
  if (player.touchingWall !== 0 && !player.onGround) {
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(player.x - 2, player.y - 2, PLAYER_W + 4, PLAYER_H + 4);
  }

  // HP bar
  ctx.fillStyle = '#111827';
  ctx.fillRect(20, 20, 260, 24);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(20, 20, 260 * Math.max(0, player.hp / player.maxHp), 24);
  ctx.strokeStyle = '#e5e7eb';
  ctx.strokeRect(20, 20, 260, 24);
  ctx.fillStyle = '#fff';
  ctx.fillText(`HP ${Math.max(0, player.hp).toFixed(0)}`, 26, 37);

  if (state.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '42px sans-serif';
    ctx.fillText(state.won ? 'You Cleared All Ninja Trials!' : 'Defeated - Restart to Try Again', 270, 320);
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  state.keys[key] = true;
  if (['1', '2', '3', '4'].includes(e.key)) triggerAbility(e.key);
});
window.addEventListener('keyup', (e) => {
  state.keys[e.key.toLowerCase()] = false;
});
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - r.left;
  state.mouse.y = e.clientY - r.top;
});
canvas.addEventListener('click', () => {
  const sx = player.x + PLAYER_W / 2;
  const sy = player.y + PLAYER_H / 2;
  const angle = Math.atan2(state.mouse.y - sy, state.mouse.x - sx);
  state.bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, fromPlayer: true, dmg: 14 });
});

document.getElementById('restartBtn').addEventListener('click', () => {
  state.levelIndex = 0;
  player.hp = player.maxHp;
  state.over = false;
  state.won = false;
  resetLevel(0);
});

resetLevel(0);
gameLoop();
