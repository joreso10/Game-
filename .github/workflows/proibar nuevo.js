const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const shortid = require('shortid');

// Constants for game balance and settings
const Constants = {
  PLAYER_RADIUS: 30,
  BULLET_RADIUS: 6,
  POWERUP_RADIUS: 20,
  OBSTACLE_MIN_SIZE: 50,
  OBSTACLE_MAX_SIZE: 200,
  FLAG_RADIUS: 20,
  HILL_RADIUS: 200,
  PAYLOAD_SIZE: 50,
  HARDPOINT_RADIUS: 100,
  ZOMBIE_SPAWN_RATE: 0.05,
  BOT_SPAWN_RATE: 0.02,
  POWERUP_SPAWN_RATE: 0.01,
  OBSTACLE_SPAWN_RATE: 0.005,
  PARTICLE_LIFE: 0.5,
  PLAYER_MAX_HP: 100,
  BOT_MAX_HP: 150,
  BULLET_DAMAGE: 10,
  PLAYER_SPEED: 400,
  BOT_SPEED: 300,
  BULLET_SPEED: 800,
  SCORE_PER_SECOND: 1,
  SCORE_BULLET_HIT: 20,
  SCORE_KILL: 100,
  SCORE_POWERUP: 50,
  SCORE_FLAG_CAPTURE: 200,
  SCORE_HILL_CONTROL: 2,
  SCORE_PAYLOAD_PUSH: 1,
  SCORE_HARDPOINT_CONTROL: 3,
  PLAYER_FIRE_COOLDOWN: 0.25,
  ABILITY_COOLDOWN: 10,
  POWERUP_DURATION: 15,
  INVISIBILITY_DURATION: 10,
  DOUBLE_SCORE_DURATION: 20,
  LEVEL_UP_SCORE: 1000,
  MAX_LEVEL: 10,
  TEAM_SCORES_TO_WIN: 5, // for CTF, etc.
  MSG_TYPES: {
    JOIN_GAME: 'join_game',
    GAME_UPDATE: 'update',
    INPUT: 'input',
    FIRE: 'fire',
    ABILITY: 'ability',
    GAME_OVER: 'dead',
    CHOOSE_MODE: 'choose_mode',
    MODE_CHOSEN: 'mode_chosen',
    VOTE_MAP: 'vote_map',
    MAP_VOTE: 'map_vote',
    CHAT: 'chat',
    UPGRADE: 'upgrade',
    SHOP_BUY: 'shop_buy',
    LEVEL_UP: 'level_up',
    PARTICLE: 'particle',
    SOUND: 'sound',
  },
};

// Expanded character types with more details
const characterTypes = [
  {name: 'Warrior', baseSpeed: 450, maxHp: 120, abilityDuration: 1.5, abilityType: 'speed_boost', abilityDesc: 'Double speed for a short time', passive: 'Increased melee damage'},
  {name: 'Scout', baseSpeed: 500, maxHp: 80, abilityDuration: 2, abilityType: 'invisibility', abilityDesc: 'Become invisible to enemies', passive: 'Faster reload'},
  {name: 'Tank', baseSpeed: 350, maxHp: 150, abilityDuration: 1, abilityType: 'shield', abilityDesc: 'Gain a temporary shield', passive: 'Reduced damage taken'},
  {name: 'Sniper', baseSpeed: 400, maxHp: 90, abilityDuration: 1.2, abilityType: 'pierce_shot', abilityDesc: 'Bullets pierce through enemies', passive: 'Increased bullet range'},
  {name: 'Mage', baseSpeed: 400, maxHp: 100, abilityDuration: 1.8, abilityType: 'fireball', abilityDesc: 'Shoot a powerful fireball', passive: 'Area damage on hit'},
  {name: 'Assassin', baseSpeed: 480, maxHp: 85, abilityDuration: 1, abilityType: 'dash', abilityDesc: 'Dash forward quickly', passive: 'Backstab bonus'},
  {name: 'Healer', baseSpeed: 420, maxHp: 110, abilityDuration: 2.5, abilityType: 'heal', abilityDesc: 'Heal yourself and nearby allies', passive: 'Regen over time'},
  {name: 'Engineer', baseSpeed: 380, maxHp: 130, abilityDuration: 3, abilityType: 'turret', abilityDesc: 'Deploy a turret', passive: 'Repair obstacles'},
];

// Expanded weapons list with more stats
const weapons = [
  {name: 'Pistol', maxAmmo: 12, reload: 1.5, cooldown: 0.2, damage: 10, speed: 800, range: 1000, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'SMG', maxAmmo: 30, reload: 2, cooldown: 0.1, damage: 5, speed: 900, range: 800, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Assault Rifle', maxAmmo: 30, reload: 2.5, cooldown: 0.15, damage: 8, speed: 850, range: 1200, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Shotgun', maxAmmo: 8, reload: 3, cooldown: 1, damage: 15, speed: 700, range: 500, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Sniper Rifle', maxAmmo: 5, reload: 4, cooldown: 1.5, damage: 50, speed: 1200, range: 2000, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Machine Gun', maxAmmo: 50, reload: 5, cooldown: 0.08, damage: 7, speed: 800, range: 1000, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Revolver', maxAmmo: 6, reload: 2, cooldown: 0.5, damage: 20, speed: 900, range: 1100, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'AK-47', maxAmmo: 30, reload: 2.5, cooldown: 0.12, damage: 12, speed: 850, range: 1300, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Uzi', maxAmmo: 32, reload: 1.8, cooldown: 0.09, damage: 6, speed: 950, range: 900, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Pump Shotgun', maxAmmo: 5, reload: 3.5, cooldown: 1.2, damage: 18, speed: 650, range: 600, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Bolt Action', maxAmmo: 5, reload: 4.5, cooldown: 2, damage: 60, speed: 1300, range: 2500, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'LMG', maxAmmo: 100, reload: 6, cooldown: 0.1, damage: 9, speed: 750, range: 1400, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Hand Cannon', maxAmmo: 7, reload: 2.2, cooldown: 0.4, damage: 25, speed: 1000, range: 1100, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Laser Gun', maxAmmo: 20, reload: 3, cooldown: 0.3, damage: 15, speed: 1200, range: 1500, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
  {name: 'Plasma Rifle', maxAmmo: 40, reload: 4, cooldown: 0.2, damage: 10, speed: 1000, range: 1200, upgrades: {damage: 0, speed: 0, ammo: 0, reload: 0, cooldown: 0, range: 0}},
];

// More skins for customization
const skins = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray', 'brown', 'cyan', 'magenta', 'gold', 'silver', 'bronze', 'diamond', 'emerald', 'ruby', 'sapphire'];

// Expanded game modes
const gameModes = [
  'Deathmatch', 'Free for All', 'Team Deathmatch', 'Capture the Flag', 'King of the Hill', 'Survival', 
  'Domination', 'Payload', 'Search and Destroy', 'Hardpoint', 'Zombies', 'Battle Royale',
  'Last Man Standing', 'Gun Game', 'Infection', 'VIP Escort', 'Bomb Defusal', 'Arena Duel'
];

// More maps with varying sizes and obstacle counts
const maps = [
  {name: 'Arena 1', size: 2000, obstacles: 10, theme: 'urban'},
  {name: 'Arena 2', size: 3000, obstacles: 15, theme: 'forest'},
  {name: 'Arena 3', size: 2500, obstacles: 12, theme: 'desert'},
  {name: 'Arena 4', size: 3500, obstacles: 20, theme: 'snow'},
  {name: 'Arena 5', size: 4000, obstacles: 25, theme: 'space'},
  {name: 'Arena 6', size: 2200, obstacles: 18, theme: 'jungle'},
  {name: 'Arena 7', size: 2800, obstacles: 22, theme: 'city'},
];

// Expanded powerup types
const powerupTypes = ['health', 'ammo', 'speed', 'damage', 'score', 'shield', 'invisibility', 'double_score', 'instant_reload', 'extra_life', 'triple_shot', 'bounce_bullet', 'homing_missile', 'teleport'];

// Shop items with more options
const shopItems = [
  {name: 'Health Boost', cost: 50, effect: 'maxHp += 20'},
  {name: 'Speed Boost', cost: 50, effect: 'baseSpeed += 50'},
  {name: 'Damage Boost', cost: 100, effect: 'damageMultiplier += 0.2'},
  {name: 'Ammo Boost', cost: 30, effect: 'weapon.maxAmmo += 10'},
  {name: 'New Skin', cost: 200, effect: 'unlock new skin'},
  {name: 'Ability Upgrade', cost: 150, effect: 'abilityDuration += 0.5'},
  {name: 'Passive Boost', cost: 120, effect: 'passive strength +1'},
  {name: 'Experience Multiplier', cost: 300, effect: 'exp gain * 1.5 for round'},
];

// Sound effects list (client will handle playback)
const sounds = {
  shoot: 'shoot.wav',
  hit: 'hit.wav',
  kill: 'kill.wav',
  powerup: 'powerup.wav',
  levelup: 'levelup.wav',
  ability: 'ability.wav',
  explosion: 'explosion.wav',
};

// Base GameObject class
class GameObject {
  constructor(id, x, y, dir, speed) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.direction = dir;
    this.speed = speed;
  }

  update(dt) {
    this.x += dt * this.speed * Math.sin(this.direction);
    this.y -= dt * this.speed * Math.cos(this.direction);
  }

  distanceTo(object) {
    const dx = this.x - object.x;
    const dy = this.y - object.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setDirection(dir) {
    this.direction = dir;
  }

  serializeForUpdate() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
    };
  }
}

// Bullet class with range
class Bullet extends GameObject {
  constructor(parentID, x, y, dir, speed, damage, pierce = false, range = 1000) {
    super(shortid(), x, y, dir, speed);
    this.parentID = parentID;
    this.damage = damage;
    this.pierce = pierce;
    this.range = range;
    this.traveled = 0;
  }

  update(dt, mapSize) {
    super.update(dt);
    this.traveled += dt * this.speed;
    return this.traveled > this.range || this.x < 0 || this.x > mapSize || this.y < 0 || this.y > mapSize;
  }

  serializeForUpdate() {
    return {
      ...super.serializeForUpdate(),
      direction: this.direction,
      parentID: this.parentID,
      pierce: this.pierce,
    };
  }
}

// PowerUp class
class PowerUp extends GameObject {
  constructor(id, x, y, type) {
    super(id, x, y, 0, 0);
    this.type = type;
  }

  serializeForUpdate() {
    return {
      ...super.serializeForUpdate(),
      type: this.type,
    };
  }
}

// Obstacle class with health for destructible ones
class Obstacle extends GameObject {
  constructor(id, x, y, size, destructible = false, hp = 100) {
    super(id, x, y, 0, 0);
    this.size = size;
    this.destructible = destructible;
    this.hp = hp;
  }

  takeDamage(damage) {
    if (this.destructible) {
      this.hp -= damage;
      return this.hp <= 0;
    }
    return false;
  }

  serializeForUpdate() {
    return {
      ...super.serializeForUpdate(),
      size: this.size,
      hp: this.hp,
    };
  }
}

// Flag class
class Flag {
  constructor(team, x, y) {
    this.team = team;
    this.x = x;
    this.y = y;
    this.carrier = null;
    this.homeX = x;
    this.homeY = y;
  }

  serializeForUpdate() {
    return {
      team: this.team,
      x: this.x,
      y: this.y,
      carrier: this.carrier,
    };
  }
}

// Hardpoint class
class Hardpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = false;
    this.controllingTeam = -1;
  }

  serializeForUpdate() {
    return {
      x: this.x,
      y: this.y,
      active: this.active,
      controllingTeam: this.controllingTeam,
    };
  }
}

// Turret class for engineer ability
class Turret extends GameObject {
  constructor(ownerID, x, y) {
    super(shortid(), x, y, 0, 0);
    this.ownerID = ownerID;
    this.hp = 50;
    this.fireCooldown = 1;
    this.target = null;
  }

  update(dt, players, mapSize) {
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      // Find target
      this.target = players.find(p => p.team !== players.find(o => o.id === this.ownerID)?.team && this.distanceTo(p) < 500);
      if (this.target) {
        this.direction = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        return new Bullet(this.ownerID, this.x, this.y, this.direction, 800, 10);
      }
    }
    return null;
  }

  takeDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  serializeForUpdate() {
    return {
      ...super.serializeForUpdate(),
      ownerID: this.ownerID,
      hp: this.hp,
    };
  }
}

// Player class expanded
class Player extends GameObject {
  constructor(id, username, x, y, charIndex, weaponIndex, skinIndex, mapSize, isBot = false) {
    const char = characterTypes[charIndex];
    super(id, x, y, Math.random() * 2 * Math.PI, char.baseSpeed);
    this.username = username;
    this.hp = char.maxHp;
    this.maxHp = char.maxHp;
    this.baseSpeed = char.baseSpeed;
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.shield = 0;
    this.invisible = false;
    this.score = 0;
    this.points = 0;
    this.level = 1;
    this.exp = 0;
    this.charType = charIndex;
    this.abilityType = char.abilityType;
    this.abilityDesc = char.abilityDesc;
    this.passive = char.passive;
    this.weaponIndex = weaponIndex;
    this.weapon = {...weapons[weaponIndex]};
    this.skin = skins[skinIndex];
    this.unlockedSkins = [skinIndex];
    this.currentAmmo = this.getMaxAmmo();
    this.reloadTime = 0;
    this.fireCooldown = 0;
    this.abilityCooldown = 0;
    this.abilityActive = false;
    this.abilityDuration = 0;
    this.powerupTimers = {speed: 0, damage: 0, shield: 0, invisibility: 0, double_score: 0, triple_shot: 0, bounce_bullet: 0};
    this.hitTime = 0;
    this.lastHitter = null;
    this.mapSize = mapSize;
    this.team = Math.random() < 0.5 ? 0 : 1;
    this.isBot = isBot;
    this.botTarget = null;
    this.botFireTimer = 0;
    this.botAbilityTimer = 0;
    this.botMoveTimer = 0;
    this.turret = null; // for engineer
    this.passiveLevel = 1;
    this.regenTimer = 0;
  }

  update(dt, players, obstacles, turrets) {
    if (this.isBot) this.botAI(dt, players, obstacles, turrets);

    this.applyPassive(dt);

    this.speed = this.baseSpeed * this.speedMultiplier * (1 + (this.level - 1) * 0.05);

    if (this.abilityActive) {
      this.applyAbility(dt, players);
    }

    const oldX = this.x;
    const oldY = this.y;
    super.update(dt);

    // Collision with obstacles
    obstacles.forEach(obs => {
      if (this.distanceTo(obs) < Constants.PLAYER_RADIUS + obs.size / 2) {
        this.x = oldX;
        this.y = oldY;
      }
    });

    this.score += dt * Constants.SCORE_PER_SECOND * (this.powerupTimers.double_score > 0 ? 2 : 1);

    this.x = Math.max(0, Math.min(this.mapSize, this.x));
    this.y = Math.max(0, Math.min(this.mapSize, this.y));

    if (this.hitTime > 0) this.hitTime -= dt;
    if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
    if (this.reloadTime > 0) this.reloadTime -= dt;
    if (this.reloadTime <= 0 && this.currentAmmo < this.getMaxAmmo()) {
      this.currentAmmo = this.getMaxAmmo();
    }
    this.fireCooldown -= dt;

    Object.keys(this.powerupTimers).forEach(key => {
      if (this.powerupTimers[key] > 0) this.powerupTimers[key] -= dt;
      if (this.powerupTimers[key] <= 0) {
        this.resetPowerup(key);
      }
    });

    this.checkLevelUp();
  }

  applyPassive(dt) {
    switch (this.passive) {
      case 'Increased melee damage':
        // Implement if melee added
        break;
      case 'Faster reload':
        if (this.reloadTime > 0) this.reloadTime -= dt * 0.1 * this.passiveLevel;
        break;
      case 'Reduced damage taken':
        // Applied in takeDamage
        break;
      case 'Increased bullet range':
        // Applied in handleFire
        break;
      case 'Area damage on hit':
        // Applied in collisions
        break;
      case 'Backstab bonus':
        // If behind enemy
        break;
      case 'Regen over time':
        this.regenTimer += dt;
        if (this.regenTimer > 5) {
          this.hp = Math.min(this.maxHp, this.hp + 5 * this.passiveLevel);
          this.regenTimer = 0;
        }
        break;
      case 'Repair obstacles':
        // Find nearby obstacle and repair
        break;
    }
  }

  getMaxAmmo() {
    return this.weapon.maxAmmo + this.weapon.upgrades.ammo + (this.level - 1) * 2;
  }

  botAI(dt, players, obstacles, turrets) {
    if (this.botMoveTimer <= 0) {
      this.botTarget = players.filter(p => !p.isBot && p.team !== this.team)[Math.floor(Math.random() * players.length)];
      this.botMoveTimer = Math.random() * 5 + 2;
    } else {
      this.botMoveTimer -= dt;
    }

    if (this.botTarget) {
      let dx = this.botTarget.x - this.x;
      let dy = this.botTarget.y - this.y;
      // Avoid obstacles
      obstacles.forEach(obs => {
        if (this.distanceTo(obs) < 100) {
          dx += (this.x - obs.x) * 2;
          dy += (this.y - obs.y) * 2;
        }
      });
      this.direction = Math.atan2(dy, dx);
    }

    this.botFireTimer -= dt;
    if (this.botFireTimer <= 0 && this.botTarget && this.distanceTo(this.botTarget) < 500) {
      this.fireCooldown = -1;
      this.botFireTimer = Math.random() * 1 + 0.5;
    }

    this.botAbilityTimer -= dt;
    if (this.botAbilityTimer <= 0 && Math.random() < 0.01) {
      this.activateAbility(players);
      this.botAbilityTimer = Math.random() * 20 + 10;
    }
  }

  applyAbility(dt, players) {
    switch (this.abilityType) {
      case 'speed_boost':
        this.speedMultiplier = 2 + 0.2 * (this.level - 1);
        break;
      case 'invisibility':
        this.invisible = true;
        break;
      case 'shield':
        this.shield = 50 + (this.level - 1) * 10;
        break;
      case 'pierce_shot':
        break;
      case 'fireball':
        this.damageMultiplier = 1.5 + 0.1 * (this.level - 1);
        break;
      case 'dash':
        this.speedMultiplier = 3;
        break;
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + 20 * dt);
        players.forEach(p => {
          if (p.team === this.team && p.distanceTo(this) < 100) {
            p.hp = Math.min(p.maxHp, p.hp + 10 * dt);
          }
        });
        break;
      case 'turret':
        if (!this.turret) {
          this.turret = new Turret(this.id, this.x, this.y);
        }
        break;
    }
    this.abilityDuration -= dt;
    if (this.abilityDuration <= 0) {
      this.abilityActive = false;
      this.resetAbilityEffects();
    }
  }

  resetAbilityEffects() {
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.shield = 0;
    this.invisible = false;
  }

  handleFire() {
    if (this.fireCooldown <= 0 && this.currentAmmo > 0 && this.reloadTime <= 0) {
      this.fireCooldown = this.weapon.cooldown - this.weapon.upgrades.cooldown * 0.01;
      this.currentAmmo--;
      if (this.currentAmmo === 0) this.reloadTime = this.weapon.reload - this.weapon.upgrades.reload * 0.1;
      let damage = (this.weapon.damage + this.weapon.upgrades.damage) * this.damageMultiplier * (1 + (this.level - 1) * 0.1);
      let speed = this.weapon.speed + this.weapon.upgrades.speed;
      let range = this.weapon.range + this.weapon.upgrades.range;
      let pierce = this.abilityActive && this.abilityType === 'pierce_shot';
      if (this.powerupTimers.triple_shot > 0) {
        let bullets = [];
        for (let i = -1; i <= 1; i++) {
          let dir = this.direction + i * 0.2;
          bullets.push(new Bullet(this.id, this.x, this.y, dir, speed, damage, pierce, range));
        }
        return bullets;
      } else if (this.powerupTimers.bounce_bullet > 0) {
        // Implement bounce logic later
      } else if (this.abilityType === 'fireball' && this.abilityActive) {
        damage *= 2;
      }
      return [new Bullet(this.id, this.x, this.y, this.direction, speed, damage, pierce, range)];
    }
    return [];
  }

  takeBulletDamage(bullet, players) {
    let damage = bullet.damage;
    if (this.shield > 0) {
      damage = Math.max(0, damage - this.shield);
      this.shield = Math.max(0, this.shield - bullet.damage);
    }
    if (this.passive === 'Reduced damage taken') damage *= 0.8 / this.passiveLevel;
    this.hp -= damage;
    this.hitTime = 0.2;
    this.lastHitter = bullet.parentID;
    this.exp += damage / 2;
    if (this.passive === 'Area damage on hit') {
      players.forEach(p => {
        if (p.id !== this.id && p.distanceTo(this) < 50) {
          p.takeBulletDamage({damage: 5 * this.passiveLevel});
        }
      });
    }
    return damage > 0;
  }

  onDealtDamage() {
    this.score += Constants.SCORE_BULLET_HIT;
    this.exp += Constants.SCORE_BULLET_HIT / 2;
  }

  onKill() {
    this.score += Constants.SCORE_KILL;
    this.exp += Constants.SCORE_KILL;
    this.points += 20;
  }

  onPowerUp() {
    this.score += Constants.SCORE_POWERUP;
    this.exp += Constants.SCORE_POWERUP / 2;
  }

  activateAbility(players) {
    if (this.abilityCooldown <= 0 && !this.abilityActive) {
      this.abilityActive = true;
      this.abilityDuration = characterTypes[this.charType].abilityDuration + (this.level - 1) * 0.2;
      this.abilityCooldown = Constants.ABILITY_COOLDOWN - (this.level - 1) * 0.5;
    }
  }

  applyPowerUp(type) {
    this.onPowerUp();
    switch (type) {
      case 'health':
        this.hp = Math.min(this.maxHp, this.hp + 50 + (this.level - 1) * 10);
        break;
      case 'ammo':
        this.currentAmmo = this.getMaxAmmo();
        this.reloadTime = 0;
        break;
      case 'speed':
        this.speedMultiplier = 1.5;
        this.powerupTimers.speed = Constants.POWERUP_DURATION;
        break;
      case 'damage':
        this.damageMultiplier = 1.5;
        this.powerupTimers.damage = Constants.POWERUP_DURATION;
        break;
      case 'score':
        this.score += 100 + (this.level - 1) * 50;
        break;
      case 'shield':
        this.shield = 30 + (this.level - 1) * 10;
        this.powerupTimers.shield = Constants.POWERUP_DURATION;
        break;
      case 'invisibility':
        this.invisible = true;
        this.powerupTimers.invisibility = Constants.INVISIBILITY_DURATION;
        break;
      case 'double_score':
        this.powerupTimers.double_score = Constants.DOUBLE_SCORE_DURATION;
        break;
      case 'instant_reload':
        this.reloadTime = 0;
        this.currentAmmo = this.getMaxAmmo();
        break;
      case 'extra_life':
        this.hp = this.maxHp;
        break;
      case 'triple_shot':
        this.powerupTimers.triple_shot = Constants.POWERUP_DURATION;
        break;
      case 'bounce_bullet':
        this.powerupTimers.bounce_bullet = Constants.POWERUP_DURATION;
        break;
      case 'homing_missile':
        // Special bullet type
        break;
      case 'teleport':
        this.x = Math.random() * this.mapSize;
        this.y = Math.random() * this.mapSize;
        break;
    }
  }

  upgradeWeapon(type) {
    if (this.points >= 10) {
      this.points -= 10;
      this.weapon.upgrades[type]++;
    }
  }

  buyShopItem(itemIndex) {
    const item = shopItems[itemIndex];
    if (this.points >= item.cost) {
      this.points -= item.cost;
      switch (item.name) {
        case 'Health Boost':
          this.maxHp += 20;
          break;
        case 'Speed Boost':
          this.baseSpeed += 50;
          break;
        case 'Damage Boost':
          this.damageMultiplier += 0.2;
          break;
        case 'Ammo Boost':
          this.weapon.maxAmmo += 10;
          break;
        case 'New Skin':
          const newSkin = Math.floor(Math.random() * skins.length);
          if (!this.unlockedSkins.includes(newSkin)) this.unlockedSkins.push(newSkin);
          break;
        case 'Ability Upgrade':
          // Assuming we add a bonus
          this.abilityDuration += 0.5; // but abilityDuration is instance var, but it's set per activation
          break;
        case 'Passive Boost':
          this.passiveLevel += 1;
          break;
        case 'Experience Multiplier':
          // For round, perhaps set a multiplier
          this.expMultiplier = 1.5; // add property
          break;
      }
      return true;
    }
    return false;
  }

  checkLevelUp() {
    const requiredExp = Constants.LEVEL_UP_SCORE * this.level;
    if (this.exp >= requiredExp && this.level < Constants.MAX_LEVEL) {
      this.level++;
      this.exp -= requiredExp;
      this.maxHp += 10;
      this.hp = this.maxHp;
      this.baseSpeed += 10;
      this.points += 50;
      this.passiveLevel += 0.5;
    }
  }

  serializeForUpdate() {
    return {
      ...super.serializeForUpdate(),
      direction: this.direction,
      hp: this.hp,
      maxHp: this.maxHp,
      username: this.username,
      score: Math.round(this.score),
      skin: this.skin,
      charType: this.charType,
      weaponIndex: this.weaponIndex,
      currentAmmo: this.currentAmmo,
      reloadTime: this.reloadTime,
      abilityCooldown: this.abilityCooldown,
      abilityActive: this.abilityActive,
      hitTime: this.hitTime,
      powerupTimers: this.powerupTimers,
      abilityType: this.abilityType,
      team: this.team,
      points: this.points,
      level: this.level,
      exp: this.exp,
      invisible: this.invisible,
      isBot: this.isBot,
      unlockedSkins: this.unlockedSkins,
      turret: this.turret ? this.turret.serializeForUpdate() : null,
    };
  }
}

// Collision functions expanded
function applyBulletCollisions(players, bullets, gameMode, obstacles, turrets) {
  const destroyedBullets = [];
  const destroyedObstacles = [];
  const destroyedTurrets = [];
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];
    let hit = false;
    // Obstacles
    for (let j = 0; j < obstacles.length; j++) {
      const obs = obstacles[j];
      if (bullet.distanceTo(obs) < Constants.BULLET_RADIUS + obs.size / 2) {
        if (obs.takeDamage(bullet.damage)) {
          destroyedObstacles.push(obs);
        }
        destroyedBullets.push(bullet);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // Turrets
    for (let j = 0; j < turrets.length; j++) {
      const turret = turrets[j];
      if (bullet.parentID !== turret.ownerID && bullet.distanceTo(turret) < Constants.BULLET_RADIUS + 20) {
        if (turret.takeDamage(bullet.damage)) {
          destroyedTurrets.push(turret);
        }
        destroyedBullets.push(bullet);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // Players
    for (let j = 0; j < players.length; j++) {
      const player = players[j];
      if (
        bullet.parentID !== player.id &&
        !player.invisible &&
        (gameMode !== 'Team Deathmatch' || players.find(p => p.id === bullet.parentID)?.team !== player.team) &&
        player.distanceTo(bullet) <= Constants.PLAYER_RADIUS + Constants.BULLET_RADIUS
      ) {
        if (player.takeBulletDamage(bullet, players)) {
          const parent = players.find(p => p.id === bullet.parentID);
          if (parent) parent.onDealtDamage();
        }
        if (!bullet.pierce) {
          destroyedBullets.push(bullet);
          hit = true;
        }
        if (player.passive === 'Area damage on hit') {
          // Already in takeDamage
        }
        break;
      }
    }
  }
  return {destroyedBullets, destroyedObstacles, destroyedTurrets};
}

function applyPowerUpCollisions(players, powerups) {
  const collected = [];
  for (let i = 0; i < powerups.length; i++) {
    const pu = powerups[i];
    for (let j = 0; j < players.length; j++) {
      const player = players[j];
      if (player.distanceTo(pu) <= Constants.PLAYER_RADIUS + Constants.POWERUP_RADIUS) {
        player.applyPowerUp(pu.type);
        collected.push(pu);
        break;
      }
    }
  }
  return collected;
}

// Game class expanded with more features
class Game {
  constructor() {
    this.sockets = {};
    this.players = {};
    this.bots = [];
    this.bullets = [];
    this.powerups = [];
    this.obstacles = [];
    this.flags = [];
    this.hardpoints = [];
    this.turrets = [];
    this.killFeed = [];
    this.chatMessages = [];
    this.lastUpdateTime = Date.now();
    this.shouldSendUpdate = false;
    this.currentMap = 0;
    this.mapSize = maps[this.currentMap].size;
    this.currentMode = 0;
    this.roundTime = 0;
    this.roundDuration = 120;
    this.state = 'menu';
    this.votes = {};
    this.leaderId = null;
    this.voteTimer = 0;
    this.voteDuration = 30;
    this.teamScores = [0, 0];
    this.hillX = 0;
    this.hillY = 0;
    this.hillRadius = Constants.HILL_RADIUS;
    this.payloadX = 0;
    this.payloadY = 0;
    this.payloadTargetX = 0;
    this.payloadTargetY = 0;
    this.bombPlanted = false;
    this.bombSiteX = 0;
    this.bombSiteY = 0;
    this.vipId = null;
    setInterval(this.update.bind(this), 1000 / 60);
  }

  generateObstacles() {
    this.obstacles = [];
    for (let i = 0; i < maps[this.currentMap].obstacles; i++) {
      const size = Math.random() * (Constants.OBSTACLE_MAX_SIZE - Constants.OBSTACLE_MIN_SIZE) + Constants.OBSTACLE_MIN_SIZE;
      const x = Math.random() * this.mapSize;
      const y = Math.random() * this.mapSize;
      const destructible = Math.random() < 0.5;
      this.obstacles.push(new Obstacle(shortid(), x, y, size, destructible));
    }
  }

  spawnBot(isZombie = false) {
    const charIndex = Math.floor(Math.random() * characterTypes.length);
    const weaponIndex = Math.floor(Math.random() * weapons.length);
    const skinIndex = Math.floor(Math.random() * skins.length);
    const x = Math.random() * this.mapSize;
    const y = Math.random() * this.mapSize;
    const bot = new Player(shortid(), 'Bot' + Math.floor(Math.random() * 100), x, y, charIndex, weaponIndex, skinIndex, this.mapSize, true);
    bot.team = isZombie ? 2 : Math.random() < 0.5 ? 0 : 1;
    if (isZombie) {
      bot.baseSpeed *= 0.8;
      bot.maxHp *= 1.5;
      bot.hp = bot.maxHp;
      bot.skin = 'green';
    }
    this.bots.push(bot);
    this.players[bot.id] = bot;
    this.killFeed.push(`${bot.username} spawned as ${isZombie ? 'zombie' : 'bot'}`);
  }

  addPlayer(socket, data) {
    this.sockets[socket.id] = socket;
    const x = this.mapSize * Math.random();
    const y = this.mapSize * Math.random();
    const player = new Player(socket.id, data.username, x, y, data.charIndex, data.weaponIndex, data.skinIndex, this.mapSize);
    this.players[socket.id] = player;
    this.killFeed.push(`${data.username} joined the game`);
    if (this.state === 'playing') {
      socket.emit('game_start', this.currentMode, this.currentMap, this.obstacles.map(o => o.serializeForUpdate()), this.turrets.map(t => t.serializeForUpdate()));
    }
  }

  removePlayer(socket) {
    const player = this.players[socket.id];
    if (player) {
      this.killFeed.push(`${player.username} left the game`);
      if (player.turret) {
        this.turrets = this.turrets.filter(t => t.id !== player.turret.id);
      }
    }
    delete this.sockets[socket.id];
    delete this.players[socket.id];
  }

  handleInput(socket, dir) {
    const player = this.players[socket.id];
    if (player) {
      player.setDirection(dir);
    }
  }

  handleFire(socket) {
    const player = this.players[socket.id];
    if (player) {
      const newBullets = player.handleFire();
      this.bullets.push(...newBullets);
      io.emit(Constants.MSG_TYPES.SOUND, {type: 'shoot', x: player.x, y: player.y});
    }
  }

  handleAbility(socket) {
    const player = this.players[socket.id];
    if (player) {
      player.activateAbility(Object.values(this.players));
      io.emit(Constants.MSG_TYPES.SOUND, {type: 'ability', x: player.x, y: player.y});
    }
  }

  handleChat(socket, message) {
    const player = this.players[socket.id];
    if (player) {
      this.chatMessages.push(`${player.username}: ${message}`);
      if (this.chatMessages.length > 20) this.chatMessages.shift();
    }
  }

  handleUpgrade(socket, type) {
    const player = this.players[socket.id];
    if (player) {
      player.upgradeWeapon(type);
    }
  }

  handleShopBuy(socket, itemIndex) {
    const player = this.players[socket.id];
    if (player) {
      if (player.buyShopItem(itemIndex)) {
        socket.emit('shop_success', itemIndex);
      } else {
        socket.emit('shop_fail');
      }
    }
  }

  handleModeChoice(socket, modeIndex) {
    if (socket.id === this.leaderId && this.state === 'choosing_mode') {
      this.currentMode = modeIndex;
      this.state = 'voting_map';
      io.emit(Constants.MSG_TYPES.MODE_CHOSEN, modeIndex);
      io.emit(Constants.MSG_TYPES.VOTE_MAP, maps);
      this.votes = {};
      this.voteTimer = this.voteDuration;
    }
  }

  handleMapVote(socket, mapIndex) {
    if (this.state === 'voting_map') {
      this.votes[socket.id] = mapIndex;
    }
  }

  tallyVotes() {
    const voteCounts = new Array(maps.length).fill(0);
    Object.values(this.votes).forEach(v => voteCounts[v]++);
    let maxCount = Math.max(...voteCounts);
    let selectedMap = voteCounts.indexOf(maxCount);
    this.currentMap = selectedMap;
    this.mapSize = maps[selectedMap].size;
    this.generateObstacles();
    this.resetRound();
  }

  resetRound() {
    this.roundTime = 0;
    this.state = 'playing';
    this.bullets = [];
    this.powerups = [];
    this.killFeed = [];
    this.votes = {};
    this.leaderId = null;
    this.teamScores = [0, 0];
    this.bots = [];
    this.flags = [];
    this.hardpoints = [];
    this.turrets = [];
    this.bombPlanted = false;
    this.vipId = null;
    this.hillX = this.mapSize / 2;
    this.hillY = this.mapSize / 2;
    this.payloadX = this.mapSize / 4;
    this.payloadY = this.mapSize / 2;
    this.payloadTargetX = this.mapSize * 3 / 4;
    this.payloadTargetY = this.mapSize / 2;
    this.bombSiteX = this.mapSize / 2;
    this.bombSiteY = this.mapSize / 2;
    for (let i = 0; i < 3; i++) {
      this.hardpoints.push(new Hardpoint(Math.random() * this.mapSize, Math.random() * this.mapSize));
    }
    this.hardpoints[0].active = true;
    if (gameModes[this.currentMode] === 'Capture the Flag') {
      this.flags.push(new Flag(0, this.mapSize / 4, this.mapSize / 4));
      this.flags.push(new Flag(1, this.mapSize * 3 / 4, this.mapSize * 3 / 4));
    }
    if (gameModes[this.currentMode] === 'VIP Escort') {
      this.vipId = Object.keys(this.players)[0]; // First player as VIP
    }
    Object.values(this.players).forEach(p => {
      p.hp = p.maxHp;
      p.currentAmmo = p.getMaxAmmo();
      p.reloadTime = 0;
      p.abilityCooldown = 0;
      p.abilityActive = false;
      p.resetAbilityEffects();
      p.powerupTimers = {speed: 0, damage: 0, shield: 0, invisibility: 0, double_score: 0, triple_shot: 0, bounce_bullet: 0};
      p.x = this.mapSize * Math.random();
      p.y = this.mapSize * Math.random();
      p.lastHitter = null;
      p.team = Math.random() < 0.5 ? 0 : 1;
      p.level = 1;
      p.exp = 0;
      p.invisible = false;
      p.turret = null;
      p.passiveLevel = 1;
      p.regenTimer = 0;
    });
    io.emit('new_round', this.currentMode, this.currentMap, this.obstacles.map(o => o.serializeForUpdate()), this.turrets.map(t => t.serializeForUpdate()));
  }

  getLeaderboard() {
    if (!this.players || typeof this.players !== 'object') {
      return [];
    }
    const playerList = [];
    for (const key in this.players) {
      if (this.players.hasOwnProperty(key)) {
        const p = this.players[key];
        playerList.push({username: p.username, score: Math.round(p.score), level: p.level, kills: p.kills || 0});
      }
    }
    return playerList
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  update() {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    if (this.state === 'playing') {
      this.roundTime += dt;
      if (this.roundTime > this.roundDuration) {
        this.state = 'choosing_mode';
        const leaderboard = this.getLeaderboard();
        if (leaderboard.length > 0) {
          const leader = leaderboard[0];
          this.leaderId = Object.keys(this.players).find(id => this.players[id].username === leader.username);
          if (this.leaderId) {
            this.sockets[this.leaderId].emit(Constants.MSG_TYPES.CHOOSE_MODE, gameModes);
          }
        }
        return;
      }

      // Spawn powerups
      if (Math.random() < Constants.POWERUP_SPAWN_RATE) {
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        const pu = new PowerUp(shortid(), Math.random() * this.mapSize, Math.random() * this.mapSize, type);
        this.powerups.push(pu);
      }

      // Spawn bots
      if (Object.keys(this.players).length < 20 && Math.random() < Constants.BOT_SPAWN_RATE) {
        this.spawnBot(gameModes[this.currentMode] === 'Zombies' && Math.random() < 0.7);
      }

      // Update players
      const allPlayers = Object.values(this.players);
      allPlayers.forEach(player => player.update(dt, allPlayers, this.obstacles, this.turrets));

      // Update turrets
      let newBulletsFromTurrets = [];
      this.turrets.forEach(t => {
        const newBullet = t.update(dt, allPlayers, this.mapSize);
        if (newBullet) newBulletsFromTurrets.push(newBullet);
      });
      this.bullets.push(...newBulletsFromTurrets);

      // Update bullets
      const outOfBoundsBullets = this.bullets.filter(b => b.update(dt, this.mapSize));
      this.bullets = this.bullets.filter(b => !outOfBoundsBullets.includes(b));

      // Collisions
      const {destroyedBullets, destroyedObstacles, destroyedTurrets} = applyBulletCollisions(allPlayers, this.bullets, gameModes[this.currentMode], this.obstacles, this.turrets);
      this.bullets = this.bullets.filter(b => !destroyedBullets.includes(b));
      this.obstacles = this.obstacles.filter(o => !destroyedObstacles.includes(o));
      this.turrets = this.turrets.filter(t => !destroyedTurrets.includes(t));
      Object.values(this.players).forEach(p => {
        if (p.turret && destroyedTurrets.includes(p.turret)) p.turret = null;
      });

      const collectedPowerups = applyPowerUpCollisions(allPlayers, this.powerups);
      this.powerups = this.powerups.filter(pu => !collectedPowerups.includes(pu));

      // Dead players
      const deadPlayers = allPlayers.filter(p => p.hp <= 0);
      deadPlayers.forEach(player => {
        const killer = this.players[player.lastHitter];
        if (killer) {
          killer.onKill();
          killer.kills = (killer.kills || 0) + 1;
          this.killFeed.push(`${killer.username} killed ${player.username}`);
          io.emit(Constants.MSG_TYPES.SOUND, {type: 'kill', x: player.x, y: player.y});
        } else {
          this.killFeed.push(`${player.username} died`);
        }
        if (this.killFeed.length > 10) this.killFeed.shift();
        if (player.isBot) {
          this.bots = this.bots.filter(b => b.id !== player.id);
        }
        if (player.turret) {
          this.turrets = this.turrets.filter(t => t.id !== player.turret.id);
        }
        io.emit(Constants.MSG_TYPES.GAME_OVER, player.id);
        delete this.players[player.id];
        if (!player.isBot) delete this.sockets[player.id];
      });

      // Mode logic
      this.handleModeLogic(dt, allPlayers);

    } else if (this.state === 'voting_map') {
      this.voteTimer -= dt;
      if (this.voteTimer <= 0 || Object.keys(this.votes).length === Object.keys(this.sockets).length) {
        this.tallyVotes();
      }
    }

    // Updates
    this.shouldSendUpdate = !this.shouldSendUpdate;
    if (this.shouldSendUpdate) {
      const leaderboard = this.getLeaderboard();
      Object.values(this.sockets).forEach(s => {
        const player = this.players[s.id];
        if (player) {
          s.emit(Constants.MSG_TYPES.GAME_UPDATE, this.createUpdate(player, leaderboard));
        }
      });
    }
  }

  handleModeLogic(dt, players) {
    const modeName = gameModes[this.currentMode];
    switch (modeName) {
      case 'Deathmatch':
      case 'Free for All':
        // Score based on kills
        if (players.some(p => p.score >= 1000)) this.roundTime = this.roundDuration + 1;
        break;
      case 'Team Deathmatch':
        if (this.teamScores[0] >= 50 || this.teamScores[1] >= 50) this.roundTime = this.roundDuration + 1;
        break;
      case 'Capture the Flag':
        this.handleCTF(dt, players);
        break;
      case 'King of the Hill':
        this.handleKOTH(dt, players);
        break;
      case 'Survival':
        this.handleSurvival(dt);
        break;
      case 'Domination':
        this.handleDomination(dt, players);
        break;
      case 'Payload':
        this.handlePayload(dt, players);
        break;
      case 'Search and Destroy':
        this.handleSearchAndDestroy(dt, players);
        break;
      case 'Hardpoint':
        this.handleHardpoint(dt, players);
        break;
      case 'Zombies':
        this.handleZombies(dt, players);
        break;
      case 'Battle Royale':
        this.handleBattleRoyale(dt, players);
        break;
      case 'Last Man Standing':
        if (players.length <= 1) this.roundTime = this.roundDuration + 1;
        break;
      case 'Gun Game':
        this.handleGunGame(dt, players);
        break;
      case 'Infection':
        this.handleInfection(dt, players);
        break;
      case 'VIP Escort':
        this.handleVIPEscort(dt, players);
        break;
      case 'Bomb Defusal':
        this.handleBombDefusal(dt, players);
        break;
      case 'Arena Duel':
        this.handleArenaDuel(dt, players);
        break;
    }
  }

  handleCTF(dt, players) {
    this.flags.forEach(flag => {
      if (flag.carrier) {
        const carrier = players.find(p => p.id === flag.carrier);
        if (carrier) {
          flag.x = carrier.x;
          flag.y = carrier.y;
          const enemyFlag = this.flags.find(f => f.team !== flag.team);
          if (carrier.team !== flag.team && carrier.distanceTo({x: carrier.team === 0 ? this.mapSize / 4 : this.mapSize * 3 / 4, y: carrier.team === 0 ? this.mapSize / 4 : this.mapSize * 3 / 4}) < 50 && enemyFlag.carrier === null) {
            this.teamScores[carrier.team] += 1;
            flag.x = flag.homeX;
            flag.y = flag.homeY;
            flag.carrier = null;
            this.killFeed.push(`${carrier.username} captured the flag!`);
            carrier.score += Constants.SCORE_FLAG_CAPTURE;
            if (this.teamScores[carrier.team] >= Constants.TEAM_SCORES_TO_WIN) this.roundTime = this.roundDuration + 1;
          }
        } else {
          flag.x = flag.homeX;
          flag.y = flag.homeY;
          flag.carrier = null;
        }
      } else {
        players.forEach(p => {
          if (p.distanceTo(flag) < Constants.PLAYER_RADIUS + Constants.FLAG_RADIUS && p.team !== flag.team) {
            flag.carrier = p.id;
            this.killFeed.push(`${p.username} picked up the flag!`);
          }
        });
      }
    });
  }

  handleKOTH(dt, players) {
    let controllingTeam = -1;
    let count = [0, 0];
    players.forEach(p => {
      if (p.distanceTo({x: this.hillX, y: this.hillY}) < this.hillRadius) {
        count[p.team]++;
      }
    });
    if (count[0] > count[1]) controllingTeam = 0;
    if (count[1] > count[0] ) controllingTeam = 1;
    if (controllingTeam !== -1) {
      this.teamScores[controllingTeam] += dt * Constants.SCORE_HILL_CONTROL;
      players.forEach(p => {
        if (p.team === controllingTeam && p.distanceTo({x: this.hillX, y: this.hillY}) < this.hillRadius) {
          p.score += dt * Constants.SCORE_HILL_CONTROL;
        }
      });
    }
    if (this.teamScores[0] >= 300 || this.teamScores[1] >= 300) {
      this.roundTime = this.roundDuration + 1;
    }
  }

  handleSurvival(dt) {
    this.mapSize -= dt * 5;
    if (this.mapSize < 500) this.mapSize = 500;
    players.forEach(p => {
      const distFromCenter = p.distanceTo({x: this.mapSize / 2, y: this.mapSize / 2});
      if (distFromCenter > this.mapSize / 2) {
        p.hp -= dt * (distFromCenter - this.mapSize / 2) / 50;
      }
      p.mapSize = this.mapSize;
    });
  }

  handleDomination(dt, players) {
    // Similar to hardpoint but multiple active
    this.hardpoints.forEach(hp => hp.active = true);
    this.handleHardpoint(dt, players);
  }

  handlePayload(dt, players) {
    let pushingCount = 0;
    players.forEach(p => {
      if (p.team === 0 && p.distanceTo({x: this.payloadX, y: this.payloadY}) < 100) {
        pushingCount++;
      }
    });
    if (pushingCount > 0) {
      const speed = pushingCount * 10 * dt;
      const dx = this.payloadTargetX - this.payloadX;
      const dy = this.payloadTargetY - this.payloadY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 0) {
        this.payloadX += speed * (dx / dist);
        this.payloadY += speed * (dy / dist);
      }
      this.teamScores[0] += dt * Constants.SCORE_PAYLOAD_PUSH * pushingCount;
      if (dist < 10) {
        this.teamScores[0] += 100;
        this.roundTime = this.roundDuration + 1;
      }
    }
  }

  handleSearchAndDestroy(dt, players) {
    // Implement bomb plant/defuse
    if (this.bombPlanted) {
      // Timer for explosion
    }
    // etc.
  }

  handleHardpoint(dt, players) {
    this.hardpoints.forEach((hp, index) => {
      if (hp.active) {
        let count = [0, 0];
        players.forEach(p => {
          if (p.distanceTo(hp) < Constants.HARDPOINT_RADIUS) {
            count[p.team]++;
          }
        });
        if (count[0] > count[1]) hp.controllingTeam = 0;
        else if (count[1] > count[0]) hp.controllingTeam = 1;
        else hp.controllingTeam = -1;
        if (hp.controllingTeam !== -1) {
          this.teamScores[hp.controllingTeam] += dt * Constants.SCORE_HARDPOINT_CONTROL;
        }
      }
    });
    // Rotate active hardpoint
    if (Math.floor(this.roundTime / 30) !== Math.floor((this.roundTime - dt) / 30)) {
      this.hardpoints.forEach(hp => hp.active = false);
      const next = Math.floor(this.roundTime / 30) % this.hardpoints.length;
      this.hardpoints[next].active = true;
    }
  }

  handleZombies(dt, players) {
    if (Math.random() < Constants.ZOMBIE_SPAWN_RATE) {
      this.spawnBot(true);
    }
  }

  handleBattleRoyale(dt, players) {
    this.handleSurvival(dt);
    if (players.filter(p => !p.isBot).length <= 1) this.roundTime = this.roundDuration + 1;
  }

  handleGunGame(dt, players) {
    // Cycle weapons on kill
  }

  handleInfection(dt, players) {
    // Infect on kill
  }

  handleVIPEscort(dt, players) {
    const vip = this.players[this.vipId];
    if (vip && vip.hp <= 0) {
      this.roundTime = this.roundDuration + 1; // Defenders win
    }
    // Escort to point
  }

  handleBombDefusal(dt, players) {
    // Plant bomb at site
  }

  handleArenaDuel(dt, players) {
    // 1v1 matches
  }

  createUpdate(player, leaderboard) {
    return {
      t: Date.now(),
      me: player.serializeForUpdate(),
      others: Object.values(this.players).filter(p => p.id !== player.id && !p.invisible).map(p => p.serializeForUpdate()),
      bullets: this.bullets.map(b => b.serializeForUpdate()),
      powerups: this.powerups.map(p => p.serializeForUpdate()),
      obstacles: this.obstacles.map(o => o.serializeForUpdate()),
      flags: this.flags.map(f => f.serializeForUpdate()),
      hardpoints: this.hardpoints.map(h => h.serializeForUpdate()),
      turrets: this.turrets.map(t => t.serializeForUpdate()),
      killFeed: this.killFeed,
      chat: this.chatMessages,
      leaderboard,
      roundTime: this.roundTime,
      roundDuration: this.roundDuration,
      state: this.state,
      mapSize: this.mapSize,
      mode: this.currentMode,
      map: this.currentMap,
      voteTimer: this.voteTimer,
      teamScores: this.teamScores,
      hillX: this.hillX,
      hillY: this.hillY,
      hillRadius: this.hillRadius,
      payloadX: this.payloadX,
      payloadY: this.payloadY,
      bombPlanted: this.bombPlanted,
      vipId: this.vipId,
    };
  }
}

const game = new Game();

io.on('connection', socket => {
  socket.on(Constants.MSG_TYPES.JOIN_GAME, data => game.addPlayer(socket, data));
  socket.on('disconnect', () => game.removePlayer(socket));
  socket.on(Constants.MSG_TYPES.INPUT, dir => game.handleInput(socket, dir));
  socket.on(Constants.MSG_TYPES.FIRE, () => game.handleFire(socket));
  socket.on(Constants.MSG_TYPES.ABILITY, () => game.handleAbility(socket));
  socket.on(Constants.MSG_TYPES.CHAT, msg => game.handleChat(socket, msg));
  socket.on(Constants.MSG_TYPES.UPGRADE, type => game.handleUpgrade(socket, type));
  socket.on('shop_buy', item => game.handleShopBuy(socket, item));
  socket.on(Constants.MSG_TYPES.CHOOSE_MODE, mode => game.handleModeChoice(socket, mode));
  socket.on(Constants.MSG_TYPES.MAP_VOTE, map => game.handleMapVote(socket, map));
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Top-Down Shooter Ultimate</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: black; color: white; font-family: Arial; }
    canvas { display: block; }
    #menu { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    #armory, #upgrades, #customization, #character-select, #shop { display: none; }
    #hud { position: absolute; top: 10px; left: 10px; }
    #minimap { position: absolute; bottom: 10px; right: 10px; width: 200px; height: 200px; background: rgba(0,0,0,0.5); }
    #scoreboard { position: absolute; top: 10px; right: 10px; }
    #killfeed { position: absolute; bottom: 10px; left: 10px; }
    #chat { position: absolute; bottom: 50px; left: 10px; }
    #chat-input { position: absolute; bottom: 10px; left: 10px; }
    #level-up { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: gold; font-size: 50px; display: none; }
    #ability-desc { font-size: 12px; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="menu">
    <h1>Top-Down Shooter Ultimate</h1>
    <button id="play">Play</button>
    <button id="armory-btn">Armory</button>
    <button id="upgrades-btn">Upgrades</button>
    <button id="customization-btn">Customization</button>
    <button id="shop-btn">Shop</button>
  </div>
  <div id="character-select">
    <h2>Select Character</h2>
    ${characterTypes.map((c, i) => `<button onclick="selectChar(${i})">${c.name} - ${c.abilityDesc} (Passive: ${c.passive})</button>`).join('')}
    <input id="username" placeholder="Username">
    <button onclick="joinGame()">Join</button>
  </div>
  <div id="armory">
    <h2>Armory</h2>
    ${weapons.map((w, i) => `<button onclick="selectWeapon(${i})">${w.name} (Dmg: ${w.damage}, Ammo: ${w.maxAmmo})</button>`).join('')}
    <button onclick="backToMenu()">Back</button>
  </div>
  <div id="upgrades">
    <h2>Upgrades</h2>
    <p>Points: <span id="points">0</span></p>
    <button onclick="upgrade('damage')">Upgrade Damage (10 pts)</button>
    <button onclick="upgrade('speed')">Upgrade Bullet Speed (10 pts)</button>
    <button onclick="upgrade('ammo')">Upgrade Ammo (10 pts)</button>
    <button onclick="upgrade('reload')">Upgrade Reload Speed (10 pts)</button>
    <button onclick="upgrade('cooldown')">Upgrade Fire Rate (10 pts)</button>
    <button onclick="upgrade('range')">Upgrade Range (10 pts)</button>
    <button onclick="backToMenu()">Back</button>
  </div>
  <div id="customization">
    <h2>Customization</h2>
    ${skins.map((s, i) => `<button onclick="selectSkin(${i})">${s}</button>`).join('')}
    <button onclick="backToMenu()">Back</button>
  </div>
  <div id="shop">
    <h2>Shop</h2>
    <p>Points: <span id="shop-points">0</span></p>
    ${shopItems.map((item, i) => `<button onclick="buyItem(${i})">${item.name} - ${item.cost} pts</button>`).join('')}
    <button onclick="backToMenu()">Back</button>
  </div>
  <div id="hud" style="display:none">
    <div>Health: <div id="health-bar" style="width:100px; height:10px; background:red;"></div></div>
    <div>Ability: <div id="ability-bar" style="width:100px; height:10px; background:blue;"></div><span id="ability-desc"></span></div>
    <div>Ammo: <span id="ammo"></span></div>
    <div>Level: <span id="level"></span> Exp: <span id="exp"></span></div>
    <div>Kills: <span id="kills"></span></div>
  </div>
  <canvas id="minimap" width="200" height="200"></canvas>
  <div id="scoreboard"></div>
  <div id="killfeed"></div>
  <div id="chat"></div>
  <input id="chat-input" type="text" placeholder="Chat..." style="display:none">
  <div id="level-up">Level Up!</div>
  <audio id="shoot-sound" src="shoot.wav"></audio>
  <audio id="hit-sound" src="hit.wav"></audio>
  <audio id="kill-sound" src="kill.wav"></audio>
  <audio id="powerup-sound" src="powerup.wav"></audio>
  <audio id="levelup-sound" src="levelup.wav"></audio>
  <audio id="ability-sound" src="ability.wav"></audio>
  <audio id="explosion-sound" src="explosion.wav"></audio>
  <script>
    const socket = io();
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const minimapCanvas = document.getElementById('minimap');
    const mctx = minimapCanvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let me = null;
    let others = [];
    let bullets = [];
    let powerups = [];
    let obstacles = [];
    let flags = [];
    let hardpoints = [];
    let turrets = [];
    let killFeed = [];
    let chat = [];
    let leaderboard = [];
    let roundTime = 0;
    let roundDuration = 120;
    let state = 'menu';
    let mapSize = 2000;
    let mode = 0;
    let map = 0;
    let voteTimer = 0;
    let teamScores = [0, 0];
    let hillX = 0, hillY = 0, hillRadius = 200;
    let payloadX = 0, payloadY = 0;
    let particles = [];

    let selectedChar = 0;
    let selectedWeapon = 0;
    let selectedSkin = 0;
    let username = 'Player' + Math.floor(Math.random() * 1000);

    const keys = {};
    let mouseX = 0, mouseY = 0;
    let firing = false;

    // Audio elements
    const sounds = {
      shoot: document.getElementById('shoot-sound'),
      hit: document.getElementById('hit-sound'),
      kill: document.getElementById('kill-sound'),
      powerup: document.getElementById('powerup-sound'),
      levelup: document.getElementById('levelup-sound'),
      ability: document.getElementById('ability-sound'),
      explosion: document.getElementById('explosion-sound'),
    };

    // Menu handlers ...
    // (same as previous, but add more buttons if needed)

    socket.on('sound', data => {
      sounds[data.type].play();
    });

    // Update handler with more data
    socket.on('update', update => {
      // same as previous, add turret, hardpoints, etc.
      turrets = update.turrets;
      hardpoints = update.hardpoints;
      // ...
    });

    // Draw function expanded with more elements
    function draw() {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state !== 'playing') return;

      ctx.save();
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

      // Draw map with theme
      ctx.fillStyle = getMapThemeColor(maps[map].theme);
      ctx.fillRect(0, 0, mapSize, mapSize);

      // Draw obstacles with health bar if destructible
      obstacles.forEach(obs => {
        ctx.fillStyle = 'brown';
        ctx.fillRect(obs.x - obs.size / 2, obs.y - obs.size / 2, obs.size, obs.size);
        if (obs.destructible) {
          ctx.fillStyle = 'red';
          ctx.fillRect(obs.x - 20, obs.y - obs.size / 2 - 10, 40 * (obs.hp / 100), 5);
        }
      });

      // Draw powerups with glow
      powerups.forEach(pu => {
        ctx.fillStyle = getPowerupColor(pu.type);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, Constants.POWERUP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
      });

      // Draw flags with animation
      flags.forEach(flag => {
        ctx.fillStyle = flag.team === 0 ? 'blue' : 'red';
        ctx.beginPath();
        ctx.arc(flag.x, flag.y, Constants.FLAG_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw hill
      if (gameModes[mode] === 'King of the Hill' || gameModes[mode] === 'Domination') {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(hillX, hillY, hillRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw payload
      if (gameModes[mode] === 'Payload') {
        ctx.fillStyle = 'orange';
        ctx.fillRect(payloadX - Constants.PAYLOAD_SIZE / 2, payloadY - Constants.PAYLOAD_SIZE / 2, Constants.PAYLOAD_SIZE, Constants.PAYLOAD_SIZE);
      }

      // Draw hardpoints
      hardpoints.forEach(hp => {
        if (hp.active) {
          ctx.strokeStyle = hp.controllingTeam === 0 ? 'blue' : hp.controllingTeam === 1 ? 'red' : 'yellow';
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, Constants.HARDPOINT_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw turrets
      turrets.forEach(t => {
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'red';
        ctx.fillRect(t.x - 20, t.y - 30, 40 * (t.hp / 50), 5);
      });

      // Draw bullets with trail
      bullets.forEach(b => {
        ctx.fillStyle = b.pierce ? 'purple' : 'yellow';
        ctx.beginPath();
        ctx.arc(b.x, b.y, Constants.BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.strokeStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 10 * Math.sin(b.direction), b.y + 10 * Math.cos(b.direction));
        ctx.stroke();
      });

      // Draw players with more effects
      others.forEach(p => drawPlayer(p));
      drawPlayer(me);

      // Particles
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        p.update(1/60);
        p.draw(ctx);
      });

      ctx.restore();

      // HUD updates
      // ... (expanded with kills, etc.)

      // Minimap with more elements
      mctx.clearRect(0, 0, 200, 200);
      mctx.fillStyle = getMapThemeColor(maps[map].theme);
      mctx.fillRect(0, 0, 200, 200);
      const scale = 200 / mapSize;
      [me, ...others].forEach(p => {
        mctx.fillStyle = p.skin;
        mctx.fillRect(p.x * scale - 1, p.y * scale - 1, 2, 2);
      });
      obstacles.forEach(o => {
        mctx.fillStyle = 'brown';
        mctx.fillRect(o.x * scale - o.size * scale / 2, o.y * scale - o.size * scale / 2, o.size * scale, o.size * scale);
      });
      turrets.forEach(t => {
        mctx.fillStyle = 'gray';
        mctx.fillRect(t.x * scale - 1, t.y * scale - 1, 2, 2);
      });
      // Add flags, hill, etc. to minimap

      // Scoreboard with levels and kills
      const sb = document.getElementById('scoreboard');
      sb.innerHTML = 'Leaderboard:<br>' + leaderboard.map(l => l.username + ': ' + l.score + ' (Lv ' + l.level + ', K: ' + l.kills + ')').join('<br>') + '<br>Team Scores: Blue ' + teamScores[0] + ' Red ' + teamScores[1];

      // ... other UI
    }

    function getMapThemeColor(theme) {
      const themes = {
        urban: 'gray',
        forest: 'green',
        desert: 'yellow',
        snow: 'white',
        space: 'black',
        jungle: 'darkgreen',
        city: 'darkgray',
      };
      return themes[theme] || 'gray';
    }

    // Expanded drawPlayer with passive effects, turret link, etc.
    function drawPlayer(p) {
      if (p.invisible) return;
      if (p.hitTime > 0) {
        ctx.globalAlpha = 0.5;
        createParticles(p.x, p.y, 5, 'red');
        sounds['hit'].play();
      }
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Constants.PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Name with level
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(p.username + ' Lv' + p.level, p.x - 30, p.y - 50);

      // Health
      ctx.fillStyle = 'red';
      ctx.fillRect(p.x - 20, p.y - 40, 40 * (p.hp / p.maxHp), 5);

      // Direction gun
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 50 * Math.sin(p.direction), p.y - 50 * Math.cos(p.direction));
      ctx.stroke();

      if (p.abilityActive) {
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Constants.PLAYER_RADIUS + 5 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (p.turret) {
        ctx.strokeStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.turret.x, p.turret.y);
        ctx.stroke();
      }

      // Powerup icons
      Object.keys(p.powerupTimers).forEach((key, i) => {
        if (p.powerupTimers[key] > 0) {
          ctx.fillStyle = getPowerupColor(key);
          ctx.beginPath();
          ctx.arc(p.x + 20 * i - 20, p.y - 60, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Particle system
    class Particle {
      constructor(x, y, dx, dy, life, color) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.life = life;
        this.color = color;
      }

      update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.life -= dt;
        this.dx *= 0.95;
        this.dy *= 0.95;
      }

      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / Constants.PARTICLE_LIFE;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3 * (this.life / Constants.PARTICLE_LIFE), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function createParticles(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 200 + 100;
        particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * Constants.PARTICLE_LIFE + Constants.PARTICLE_LIFE, color));
      }
    }

    socket.on('particle', data => {
      createParticles(data.x, data.y, data.count, data.color);
    });

    draw();
  </script>
</body>
</html>
  `);
});

http.listen(3000, () => console.log('Server running on port 3000'));