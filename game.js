/* ===========================================================
   MATEOAVENTURA 🐾🦸‍♂️
   Juego de plataformas 2D en canvas.
   Mateo rescata animales perdidos en Las Jaras (Córdoba)
   de unos aliens secuestradores, usando su tirachinas.
   =========================================================== */

(() => {
'use strict';

/* ----------------------------------------------------------
   0. Referencias del DOM
---------------------------------------------------------- */
const canvas   = document.getElementById('game');
const ctx      = canvas.getContext('2d');
const el = {
  menu:       document.getElementById('menu'),
  help:       document.getElementById('help'),
  hud:        document.getElementById('hud'),
  pause:      document.getElementById('pause'),
  gameover:   document.getElementById('gameover'),
  victory:    document.getElementById('victory'),
  leveldone:  document.getElementById('leveldone'),
  touch:      document.getElementById('touch'),
  bananas:    document.getElementById('hud-bananas'),
  total:      document.getElementById('hud-total'),
  lives:      document.getElementById('hud-lives'),
  time:       document.getElementById('hud-time'),
  levelLabel: document.getElementById('hud-level'),
  goBananas:  document.getElementById('go-bananas'),
  goTime:     document.getElementById('go-time'),
  vcBananas:  document.getElementById('vc-bananas'),
  vcTotal:    document.getElementById('vc-total'),
  vcTime:     document.getElementById('vc-time'),
  newRecord:  document.getElementById('new-record'),
  record:     document.getElementById('record'),
  ldLevel:    document.getElementById('ld-level'),
  ldName:     document.getElementById('ld-name'),
  ldBananas:  document.getElementById('ld-bananas'),
  ldTotal:    document.getElementById('ld-total'),
  ldTime:     document.getElementById('ld-time'),
};

/* ----------------------------------------------------------
   1. Dimensiones del canvas
---------------------------------------------------------- */
const VIEW_W = 960;
const VIEW_H = 540;
let scale = 1;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = Math.min(w / VIEW_W, h / VIEW_H);
  canvas.width  = VIEW_W;
  canvas.height = VIEW_H;
  canvas.style.width  = (VIEW_W * ratio) + 'px';
  canvas.style.height = (VIEW_H * ratio) + 'px';
  scale = ratio;
}
window.addEventListener('resize', resize);
resize();

/* ----------------------------------------------------------
   2. Constantes de física
---------------------------------------------------------- */
const GRAVITY    = 2000;
const MOVE_SPEED = 290;
const JUMP_VEL   = -720;
const MAX_FALL   = 1100;
const COYOTE     = 0.10;
const JUMP_BUF   = 0.12;

/* --- Constantes de la tirachinas --- */
const PROJECTILE_SPEED = 600;
const PROJECTILE_LIFE  = 1.2;   // segundos antes de desaparecer
const SHOOT_COOLDOWN   = 0.35;  // tiempo entre disparos
const PROJECTILE_DMG   = 1;      // daño por piedra

/* ----------------------------------------------------------
   3. Estado del juego
---------------------------------------------------------- */
const STATE = { MENU:'menu', PLAY:'play', PAUSE:'pause', OVER:'over', WIN:'win', LEVELEDONE:'leveldone' };
let state = STATE.MENU;

let level = null;
let player = null;
let enemies = [];
let items = [];            // animales perdidos
let projectiles = [];      // piedras de la tirachinas
let particles = [];
let camera = { x: 0, y: 0 };
let keys = {};
let jumpBuffer = 0;
let coyoteTimer = 0;
let lives = 3;
let animalsCollected = 0;
let elapsed = 0;
let lastTime = 0;
let goalAnim = 0;
let goalMsg = '';
let goalMsgTimer = 0;
let currentLevel = 0;
let totalElapsed = 0;
let levelStartTime = 0;
let shootCooldown = 0;
let boss = null;
let bossProjectiles = [];
let bossDefeated = false;

let record = parseFloat(localStorage.getItem('mateoaventura_record')) || Infinity;

/* ----------------------------------------------------------
   4. Definición de los niveles — Las Jaras (Córdoba)
     1 — "El Campo"     : campo abierto, vallas y muretes
     2 — "El Arroyo"    : barrancos, puentes de madera
     3 — "La Dehesa"    : zona boscosa final, más aliens
---------------------------------------------------------- */
const LEVELS = [
  // ==================== NIVEL 1 — EL CAMPO ====================
  {
    name: 'El Campo',
    theme: 'campo',
    worldW: 3600,
    platforms: [
      { x: 0,    y: 480, w: 900,  h: 60, type: 'ground' },
      { x: 1040, y: 480, w: 760,  h: 60, type: 'ground' },
      { x: 1960, y: 480, w: 1640, h: 60, type: 'ground' },

      { x: 360,  y: 370, w: 120, h: 30, type: 'crate' },
      { x: 560,  y: 290, w: 120, h: 30, type: 'crate' },
      { x: 760,  y: 360, w: 100, h: 30, type: 'plat' },
      { x: 1180, y: 350, w: 130, h: 30, type: 'crate' },
      { x: 1380, y: 260, w: 120, h: 30, type: 'crate' },
      { x: 1560, y: 360, w: 120, h: 30, type: 'plat' },
      { x: 2080, y: 360, w: 160, h: 30, type: 'crate' },
      { x: 2320, y: 280, w: 120, h: 30, type: 'crate' },
      { x: 2540, y: 360, w: 140, h: 30, type: 'plat' },
      { x: 2780, y: 270, w: 130, h: 30, type: 'crate' },
      { x: 3000, y: 360, w: 140, h: 30, type: 'crate' },
    ],
    animals: [
      [120,440],[260,440],[400,330],[480,440],
      [600,250],[700,440],[790,320],
      [1220,310],[1320,440],[1420,220],
      [1620,320],[1700,440],[1800,440],
      [2120,320],[2220,440],[2360,240],
      [2580,320],[2820,230],[3040,320],[3200,440],[3340,440],
    ],
    enemies: [
      { x: 300,  patrolMin: 60,   patrolMax: 880,  speed: 100, hp: 1 },
      { x: 1300, patrolMin: 1060, patrolMax: 1780, speed: 120, hp: 1 },
      { x: 2200, patrolMin: 1980, patrolMax: 2700, speed: 120, hp: 1 },
      { x: 3100, patrolMin: 2780, patrolMax: 3560, speed: 130, hp: 1 },
    ],
    goal: { x: 3480, y: 400, w: 60, h: 80 },
  },

  // ==================== NIVEL 2 — EL ARROYO ====================
  {
    name: 'El Arroyo',
    theme: 'arroyo',
    worldW: 4000,
    platforms: [
      { x: 0,    y: 480, w: 600,  h: 60, type: 'ground' },
      { x: 760,  y: 480, w: 420,  h: 60, type: 'ground' },
      { x: 1380, y: 480, w: 360,  h: 60, type: 'ground' },
      { x: 1960, y: 480, w: 460,  h: 60, type: 'ground' },
      { x: 2620, y: 480, w: 380,  h: 60, type: 'ground' },
      { x: 3200, y: 480, w: 800,  h: 60, type: 'ground' },

      { x: 300,  y: 380, w: 100, h: 30, type: 'plat' },
      { x: 480,  y: 300, w: 100, h: 30, type: 'plat' },
      { x: 640,  y: 220, w: 100, h: 30, type: 'plat' },
      { x: 800,  y: 380, w: 80,  h: 30, type: 'plat' },
      { x: 1060, y: 360, w: 100, h: 30, type: 'crate' },
      { x: 1220, y: 260, w: 90,  h: 30, type: 'plat' },
      { x: 1400, y: 380, w: 80,  h: 30, type: 'plat' },
      { x: 1580, y: 300, w: 100, h: 30, type: 'crate' },
      { x: 1980, y: 360, w: 90,  h: 30, type: 'plat' },
      { x: 2160, y: 260, w: 100, h: 30, type: 'plat' },
      { x: 2340, y: 340, w: 90,  h: 30, type: 'crate' },
      { x: 2640, y: 380, w: 80,  h: 30, type: 'plat' },
      { x: 2820, y: 280, w: 100, h: 30, type: 'plat' },
      { x: 3020, y: 360, w: 90,  h: 30, type: 'crate' },
      { x: 3260, y: 370, w: 140, h: 30, type: 'crate' },
      { x: 3480, y: 280, w: 120, h: 30, type: 'crate' },
      { x: 3680, y: 360, w: 140, h: 30, type: 'crate' },
    ],
    animals: [
      [140,440],[340,340],[380,440],
      [520,260],[680,180],[820,440],
      [840,340],[900,440],[1100,320],
      [1260,220],[1440,340],[1620,260],
      [1820,440],[2020,320],[2200,220],
      [2380,300],[2680,340],[2860,240],
      [3060,320],[3300,330],[3530,240],
      [3730,320],[3900,440],
    ],
    enemies: [
      { x: 300,  patrolMin: 40,   patrolMax: 560,  speed: 120, hp: 1 },
      { x: 900,  patrolMin: 780,  patrolMax: 1140, speed: 130, hp: 1 },
      { x: 1500, patrolMin: 1400, patrolMax: 1700, speed: 140, hp: 2 },
      { x: 2100, patrolMin: 1980, patrolMax: 2380, speed: 140, hp: 2 },
      { x: 2800, patrolMin: 2640, patrolMax: 2980, speed: 150, hp: 2 },
      { x: 3400, patrolMin: 3220, patrolMax: 3960, speed: 150, hp: 2 },
    ],
    goal: { x: 3880, y: 400, w: 60, h: 80 },
  },

  // ==================== NIVEL 3 — LA DEHESA ====================
  {
    name: 'La Dehesa',
    theme: 'dehesa',
    worldW: 4600,
    platforms: [
      { x: 0,    y: 480, w: 480,  h: 60, type: 'ground' },
      { x: 640,  y: 480, w: 340,  h: 60, type: 'ground' },
      { x: 1160, y: 480, w: 300,  h: 60, type: 'ground' },
      { x: 1680, y: 480, w: 320,  h: 60, type: 'ground' },
      { x: 2200, y: 480, w: 360,  h: 60, type: 'ground' },
      { x: 2760, y: 480, w: 300,  h: 60, type: 'ground' },
      { x: 3280, y: 480, w: 380,  h: 60, type: 'ground' },
      { x: 3840, y: 480, w: 760,  h: 60, type: 'ground' },

      { x: 260, y: 380, w: 80,  h: 30, type: 'plat' },
      { x: 400, y: 300, w: 80,  h: 30, type: 'plat' },
      { x: 540, y: 220, w: 80,  h: 30, type: 'plat' },
      { x: 680, y: 380, w: 70,  h: 30, type: 'plat' },
      { x: 860,  y: 320, w: 90, h: 30, type: 'plat' },
      { x: 1000, y: 240, w: 80, h: 30, type: 'plat' },
      { x: 1180, y: 380, w: 80, h: 30, type: 'plat' },
      { x: 1340, y: 300, w: 80, h: 30, type: 'plat' },
      { x: 1500, y: 220, w: 80, h: 30, type: 'plat' },
      { x: 1700, y: 360, w: 80, h: 30, type: 'plat' },
      { x: 1860, y: 280, w: 80, h: 30, type: 'plat' },
      { x: 2020, y: 360, w: 80, h: 30, type: 'plat' },
      { x: 2220, y: 300, w: 80, h: 30, type: 'plat' },
      { x: 2400, y: 200, w: 100, h: 30, type: 'crate' },
      { x: 2580, y: 320, w: 80, h: 30, type: 'plat' },
      { x: 2780, y: 240, w: 80, h: 30, type: 'plat' },
      { x: 2960, y: 340, w: 80, h: 30, type: 'plat' },
      { x: 3140, y: 250, w: 80, h: 30, type: 'plat' },
      { x: 3320, y: 360, w: 120, h: 30, type: 'crate' },
      { x: 3520, y: 270, w: 110, h: 30, type: 'crate' },
      { x: 3720, y: 350, w: 110, h: 30, type: 'crate' },
      { x: 3940, y: 260, w: 120, h: 30, type: 'crate' },
      { x: 4160, y: 350, w: 120, h: 30, type: 'crate' },
    ],
    animals: [
      [120,440],[290,340],[430,260],
      [570,180],[720,340],[880,440],
      [900,280],[1040,200],[1220,340],
      [1380,260],[1540,180],[1740,320],
      [1900,240],[2060,320],[2260,260],
      [2440,160],[2620,280],[2820,200],
      [3000,300],[3180,210],[3360,320],
      [3560,230],[3760,310],[3980,220],
      [4200,310],[4350,440],[4500,440],
    ],
    enemies: [
      { x: 200,  patrolMin: 20,   patrolMax: 440,  speed: 130, hp: 2 },
      { x: 760,  patrolMin: 660,  patrolMax: 940,  speed: 150, hp: 2 },
      { x: 1280, patrolMin: 1180, patrolMax: 1420, speed: 160, hp: 2 },
      { x: 1820, patrolMin: 1700, patrolMax: 1970, speed: 160, hp: 3 },
      { x: 2360, patrolMin: 2220, patrolMax: 2540, speed: 170, hp: 3 },
      { x: 2900, patrolMin: 2780, patrolMax: 3040, speed: 170, hp: 3 },
      { x: 3450, patrolMin: 3300, patrolMax: 3640, speed: 180, hp: 3 },
      { x: 4100, patrolMin: 3860, patrolMax: 4560, speed: 190, hp: 3 },
    ],
    goal: { x: 4480, y: 400, w: 60, h: 80 },
    boss: {
      x: 4300, y: 300, w: 90, h: 100,
      hp: 10, maxHp: 10,
      vx: 80, vy: 0,
      shootTimer: 1.5,
      phase: 0, // 0=espera, 1=combate, 2=derrotado
      anim: 0,
      hitFlash: 0,
    },
  },
];

/* Construye un nivel a partir de su índice. */
function buildLevel(index) {
  const def = LEVELS[index];
  const items = def.animals.map(([x, y], i) => ({
    x, y, w: 32, h: 32, collected: false, t: Math.random() * Math.PI * 2,
    type: i % 4, // 4 tipos de animal diferentes
  }));
  return {
    platforms: def.platforms,
    items,
    enemies: def.enemies,
    goal: { ...def.goal },
    worldW: def.worldW,
    deathY: 700,
    theme: def.theme,
    name: def.name,
    boss: def.boss ? { ...def.boss } : null,
  };
}

/* ----------------------------------------------------------
   5. Entidades
---------------------------------------------------------- */
function makePlayer(x, y) {
  return {
    x, y, w: 34, h: 48,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    walkTime: 0,
    invuln: 0,
    blink: 0,
    squash: 1,
    aimAngle: 0, // ángulo de apuntado para la tirachinas
  };
}

function makeEnemy(def) {
  return {
    x: def.x, y: 0, w: 40, h: 48,
    vx: def.speed * (Math.random() < 0.5 ? 1 : -1),
    patrolMin: def.patrolMin,
    patrolMax: def.patrolMax,
    speed: def.speed,
    rot: 0,
    alive: true,
    hp: def.hp || 1,
    hitFlash: 0,
  };
}

function makeProjectile(x, y, dirX) {
  return {
    x, y, w: 10, h: 10,
    vx: dirX * PROJECTILE_SPEED,
    vy: -100, // ligero arco ascendente
    life: PROJECTILE_LIFE,
    active: true,
  };
}

/* ----------------------------------------------------------
   6. Colisiones (AABB contra plataformas sólidas)
---------------------------------------------------------- */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollisions(p, platforms) {
  p.onGround = false;

  p.x += p.vx * dt;
  for (const pl of platforms) {
    if (rectsOverlap(p, pl)) {
      if (p.vx > 0) p.x = pl.x - p.w;
      else if (p.vx < 0) p.x = pl.x + pl.w;
      p.vx = 0;
    }
  }
  p.y += p.vy * dt;
  for (const pl of platforms) {
    if (rectsOverlap(p, pl)) {
      if (p.vy > 0) {
        p.y = pl.y - p.h;
        if (p.vy > 400) p.squash = 0.6;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = pl.y + pl.h;
        p.vy = 0;
      }
    }
  }
}

/* ----------------------------------------------------------
   7. Bucle y actualización
---------------------------------------------------------- */
let dt = 0;

function update() {
  if (state !== STATE.PLAY) return;

  elapsed += dt;
  if (shootCooldown > 0) shootCooldown -= dt;

  // ---- Entrada del jugador ----
  let dir = 0;
  if (keys.left)  dir -= 1;
  if (keys.right) dir += 1;

  if (jumpBuffer > 0) jumpBuffer -= dt;
  if (keys.jumpQueued) { jumpBuffer = JUMP_BUF; keys.jumpQueued = false; }

  if (player.onGround) coyoteTimer = COYOTE;
  else if (coyoteTimer > 0) coyoteTimer -= dt;

  player.vx = dir * MOVE_SPEED;
  if (dir !== 0) player.facing = dir;

  // Salto
  if (jumpBuffer > 0 && coyoteTimer > 0) {
    player.vy = JUMP_VEL;
    player.onGround = false;
    coyoteTimer = 0;
    jumpBuffer = 0;
    player.squash = 1.25;
    spawnDust(player.x + player.w/2, player.y + player.h, 6);
    if (window.JMSound) JMSound.sfx.jump();
  }

  if (!keys.jump && player.vy < -250) player.vy = -250;

  // Gravedad
  player.vy += GRAVITY * dt;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  // Colisiones
  const wasOnGround = player.onGround;
  const fallSpeed = player.vy;
  resolveCollisions(player, level.platforms);
  if (!wasOnGround && player.onGround && fallSpeed > 350) {
    if (window.JMSound) JMSound.sfx.land();
  }

  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > level.worldW) {
    player.x = level.worldW - player.w; player.vx = 0;
  }

  // Animación
  if (player.onGround && Math.abs(player.vx) > 10) player.walkTime += dt * 12;
  else player.walkTime = 0;
  player.squash += (1 - player.squash) * Math.min(1, dt * 12);
  if (player.invuln > 0) player.invuln -= dt;
  player.blink += dt;

  // ---- Disparo de tirachinas ----
  if (keys.shoot && shootCooldown <= 0) {
    const px = player.x + player.w/2 + player.facing * 20;
    const py = player.y + player.h * 0.35;
    projectiles.push(makeProjectile(px, py, player.facing));
    shootCooldown = SHOOT_COOLDOWN;
    if (window.JMSound) JMSound.sfx.shoot();
  }

  // ---- Actualizar proyectiles ----
  for (const pr of projectiles) {
    if (!pr.active) continue;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.vy += 400 * dt; // gravedad ligera sobre la piedra
    pr.life -= dt;
    if (pr.life <= 0 || pr.x < 0 || pr.x > level.worldW || pr.y > 600) {
      pr.active = false;
      continue;
    }
    // Colisión con plataformas
    for (const pl of level.platforms) {
      if (rectsOverlap(pr, pl)) { pr.active = false; break; }
    }
    if (!pr.active) continue;
    // Colisión con enemigos
    for (const e of enemies) {
      if (!e.alive) continue;
      if (rectsOverlap(pr, e)) {
        pr.active = false;
        e.hp -= PROJECTILE_DMG;
        e.hitFlash = 0.15;
        if (window.JMSound) JMSound.sfx.hit();
        if (e.hp <= 0) {
          e.alive = false;
          spawnPoof(e.x + e.w/2, e.y + e.h/2);
          if (window.JMSound) JMSound.sfx.stomp();
        }
        break;
      }
    }
  }
  // limpiar proyectiles inactivos
  projectiles = projectiles.filter(p => p.active);

  // ---- Caída al vacío ----
  if (player.y > level.deathY) {
    hurtPlayer(true);
    return;
  }

  // ---- Items (animales perdidos) ----
  for (const it of items) {
    if (it.collected) continue;
    it.t += dt * 4;
    if (rectsOverlap(player, it)) {
      it.collected = true;
      animalsCollected++;
      spawnSparkle(it.x + it.w/2, it.y + it.h/2);
      if (window.JMSound) JMSound.sfx.rescue();
      updateHud();
    }
  }

  // ---- Enemigos (aliens) ----
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x += e.vx * dt;
    if (e.x < e.patrolMin) { e.x = e.patrolMin; e.vx *= -1; }
    if (e.x + e.w > e.patrolMax) { e.x = e.patrolMax - e.w; e.vx *= -1; }
    e.rot += dt * 3;
    if (e.hitFlash > 0) e.hitFlash -= dt;

    const ground = findGroundUnder(e, level.platforms);
    e.y = ground - e.h;

    // Colisión con jugador
    if (rectsOverlap(player, e)) {
      if (player.vy > 150 && player.y + player.h - e.y < 24) {
        // Pisada: también daña al alien
        e.hp -= 1;
        e.hitFlash = 0.15;
        player.vy = JUMP_VEL * 0.6;
        if (window.JMSound) JMSound.sfx.stomp();
        if (e.hp <= 0) {
          e.alive = false;
          spawnPoof(e.x + e.w/2, e.y + e.h/2);
        }
      } else if (player.invuln <= 0) {
        hurtPlayer(false);
      }
    }
  }

  // ---- Boss final ----
  if (boss && !bossDefeated) {
    boss.anim += dt;
    if (boss.hitFlash > 0) boss.hitFlash -= dt;

    // Activar boss cuando el jugador se acerca
    if (boss.phase === 0 && player.x > boss.x - 400) {
      boss.phase = 1;
      goalMsg = '⚠️ ¡BOSS FINAL! ¡Derrota al Rey Alien! 👽👑';
      goalMsgTimer = 3;
      if (window.JMSound) JMSound.sfx.bossAlert();
    }

    if (boss.phase === 1) {
      // Movimiento: flotar arriba y abajo + perseguir al jugador horizontal
      boss.y += Math.sin(boss.anim * 1.5) * 60 * dt;
      boss.y = Math.max(180, Math.min(380, boss.y));

      // Moverse hacia el jugador lentamente
      const dx = player.x - boss.x;
      if (Math.abs(dx) > 150) {
        boss.x += Math.sign(dx) * 50 * dt;
      }

      // Disparar proyectiles alien
      boss.shootTimer -= dt;
      if (boss.shootTimer <= 0) {
        const bx = boss.x + boss.w/2;
        const by = boss.y + boss.h/2;
        const targetX = player.x + player.w/2;
        const targetY = player.y + player.h/2;
        const dist = Math.hypot(targetX - bx, targetY - by);
        const speed = 350;
        bossProjectiles.push({
          x: bx, y: by, w: 14, h: 14,
          vx: (targetX - bx) / dist * speed,
          vy: (targetY - by) / dist * speed,
          life: 3, active: true,
        });
        if (window.JMSound) JMSound.sfx.bossShoot();
        // Más rápido conforme pierde HP
        boss.shootTimer = Math.max(0.6, 1.8 - (1 - boss.hp / boss.maxHp) * 1.2);
      }

      // Colisión: proyectiles del boss con jugador
      for (const bp of bossProjectiles) {
        if (!bp.active) continue;
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;
        bp.life -= dt;
        if (bp.life <= 0 || bp.x < 0 || bp.x > level.worldW || bp.y > 600 || bp.y < 0) {
          bp.active = false;
          continue;
        }
        if (rectsOverlap(player, bp) && player.invuln <= 0) {
          bp.active = false;
          hurtPlayer(false);
        }
      }
      bossProjectiles = bossProjectiles.filter(p => p.active);

      // Colisión: proyectiles del jugador (piedras) con el boss
      for (const pr of projectiles) {
        if (!pr.active) continue;
        if (rectsOverlap(pr, boss)) {
          pr.active = false;
          boss.hp -= PROJECTILE_DMG;
          boss.hitFlash = 0.15;
          spawnSparkle(pr.x + pr.w/2, pr.y + pr.h/2);
          if (window.JMSound) JMSound.sfx.hit();
          if (boss.hp <= 0) {
            boss.phase = 2;
            bossDefeated = true;
            // Explosión grande
            for (let i = 0; i < 30; i++) {
              const a = Math.random() * Math.PI * 2;
              const s = 100 + Math.random() * 200;
              particles.push({
                x: boss.x + boss.w/2, y: boss.y + boss.h/2,
                vx: Math.cos(a)*s, vy: Math.sin(a)*s - 80,
                life: 0.8, max: 0.8, size: 4+Math.random()*8,
                color: i % 2 === 0 ? '#a020f0' : '#7fffd4', type:'poof'
              });
            }
            if (window.JMSound) { JMSound.sfx.stomp(); JMSound.sfx.victory(); }
            goalMsg = '¡BOSS DERROTADO! ¡Has salvado Las Jaras! 🎉🐾';
            goalMsgTimer = 4;
          }
        }
      }

      // Colisión física con el boss (daño al tocarlo)
      if (rectsOverlap(player, boss) && player.invuln <= 0) {
        hurtPlayer(false);
      }
    }
  }

  // ---- Meta ----
  goalAnim += dt;
  if (rectsOverlap(player, level.goal)) {
    if (animalsCollected >= items.length) {
      winGame();
      return;
    } else if (goalMsgTimer <= 0) {
      goalMsg = `¡Faltan ${items.length - animalsCollected} animales por rescatar!`;
      goalMsgTimer = 2.5;
    }
  }
  if (goalMsgTimer > 0) goalMsgTimer -= dt;

  // ---- Cámara ----
  const targetX = player.x + player.w/2 - VIEW_W/2;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
  camera.x = Math.max(0, Math.min(camera.x, level.worldW - VIEW_W));
  camera.y = 0;

  // ---- Partículas ----
  updateParticles();
}

function findGroundUnder(e, platforms) {
  const desiredTop = e.y + e.h;
  let best = null;
  for (const pl of platforms) {
    if (e.x + e.w <= pl.x || e.x >= pl.x + pl.w) continue;
    if (Math.abs(pl.y - desiredTop) <= 6) {
      if (best === null || pl.y < best) best = pl.y;
    }
  }
  if (best === null) {
    for (const pl of platforms) {
      if (e.x + e.w <= pl.x || e.x >= pl.x + pl.w) continue;
      if (pl.y >= desiredTop - 4 && pl.y < 520) {
        if (best === null || pl.y < best) best = pl.y;
      }
    }
  }
  return best !== null ? best : level.deathY;
}

/* ----------------------------------------------------------
   8. Daño y vidas
---------------------------------------------------------- */
function hurtPlayer(fell) {
  if (player.invuln > 0 && !fell) return;
  lives--;
  spawnPoof(player.x + player.w/2, player.y + player.h/2);
  if (window.JMSound) JMSound.sfx.hurt();
  updateHud();

  if (lives <= 0) {
    gameOver();
    return;
  }

  player.invuln = 1.5;
  player.vy = -300;
  player.vx = -player.facing * 200;
  if (fell) {
    respawnNearSafe();
  }
}

function respawnNearSafe() {
  let best = null;
  for (const pl of level.platforms) {
    if (pl.type === 'ground' && pl.x < player.x && pl.x + pl.w > player.x - 200) {
      best = pl;
    }
  }
  if (best) {
    player.x = best.x + best.w / 2;
    player.y = best.y - player.h - 10;
  } else {
    player.x = 50; player.y = 400;
  }
  player.vx = 0; player.vy = 0;
}

/* ----------------------------------------------------------
   9. Partículas
---------------------------------------------------------- */
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y, vx: (Math.random()-0.5)*120, vy: -Math.random()*120,
      life: 0.5, max: 0.5, size: 3 + Math.random()*3, color: '#d4a76a', type:'dust'
    });
  }
}
function spawnSparkle(x, y) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random()*Math.PI*2;
    const s = 80 + Math.random()*120;
    particles.push({
      x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
      life: 0.6, max: 0.6, size: 2+Math.random()*4, color: '#7fffd4', type:'spark'
    });
  }
}
function spawnPoof(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random()*Math.PI*2;
    const s = 60 + Math.random()*140;
    particles.push({
      x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 60,
      life: 0.5, max: 0.5, size: 4+Math.random()*6, color: '#a020f0', type:'poof'
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 600 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ----------------------------------------------------------
   10. Render
---------------------------------------------------------- */
function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground();

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  for (const pl of level.platforms) drawPlatform(pl);
  drawGoal(level.goal);
  for (const it of items) if (!it.collected) drawAnimal(it);
  for (const e of enemies) if (e.alive) drawAlien(e);
  for (const pr of projectiles) drawProjectile(pr);
  // Boss final
  if (boss && boss.phase < 2) drawBoss(boss);
  for (const bp of bossProjectiles) if (bp.active) drawBossProjectile(bp);
  drawPlayer(player);
  for (const p of particles) drawParticle(p);

  ctx.restore();

  if (goalMsgTimer > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 60, 60, ${Math.min(1, goalMsgTimer)})`;
    ctx.font = 'bold 22px "Baloo 2"';
    ctx.textAlign = 'center';
    ctx.fillText(goalMsg, VIEW_W/2, 70);
    ctx.restore();
  }
}

/* ---- Fondo parallax (temático por nivel) ---- */
function drawBackground() {
  const theme = level ? level.theme : 'campo';

  if (theme === 'arroyo') {
    // === ARROYO: tonos verdes-azulados, agua ===
    const sky = ctx.createLinearGradient(0,0,0,VIEW_H);
    sky.addColorStop(0, '#1a3a2e');
    sky.addColorStop(0.5, '#2d5a3d');
    sky.addColorStop(1, '#1a2a1e');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,VIEW_W,VIEW_H);

    // reflejos de agua
    const off1 = (camera.x * 0.15) % 300;
    for (let i = -1; i < 5; i++) {
      const bx = i * 300 - off1;
      ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx + 50, 420);
      ctx.lineTo(bx + 70, 260);
      ctx.lineTo(bx + 90, 420);
      ctx.closePath();
      ctx.fill();
    }

    // estalactitas de raíces
    const off2 = (camera.x * 0.3) % 200;
    ctx.fillStyle = 'rgba(40, 60, 40, 0.5)';
    for (let i = -1; i < 6; i++) {
      const bx = i * 200 - off2;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 30, 0);
      ctx.lineTo(bx + 15, 50 + (i % 3) * 25);
      ctx.closePath();
      ctx.fill();
    }

    // luciérnagas
    ctx.fillStyle = 'rgba(200, 255, 180, 0.15)';
    for (let i = 0; i < 20; i++) {
      const px = (i * 73 + camera.x * 0.1) % VIEW_W;
      const py = (i * 47) % VIEW_H;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI*2);
      ctx.fill();
    }

  } else if (theme === 'dehesa') {
    // === DEHESA: atardecer dorado con encinas ===
    const sky = ctx.createLinearGradient(0,0,0,VIEW_H);
    sky.addColorStop(0, '#2a1a0a');
    sky.addColorStop(0.4, '#5a3010');
    sky.addColorStop(0.8, '#8a5020');
    sky.addColorStop(1, '#ff8c42');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,VIEW_W,VIEW_H);

    // resplandor dorado del atardecer
    const glow = ctx.createRadialGradient(VIEW_W/2, VIEW_H, 50, VIEW_W/2, VIEW_H, 350);
    glow.addColorStop(0, 'rgba(255, 180, 80, 0.3)');
    glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, VIEW_H - 200, VIEW_W, 200);

    // encinas silueta (parallax)
    const off1 = (camera.x * 0.25) % 280;
    for (let i = -1; i < 5; i++) {
      const bx = i * 280 - off1;
      ctx.fillStyle = 'rgba(30, 50, 20, 0.7)';
      ctx.fillRect(bx + 40, 200, 40, 280);
      ctx.fillRect(bx + 35, 190, 50, 15);
      // copa redondeada
      ctx.beginPath();
      ctx.arc(bx + 60, 170, 35, 0, Math.PI*2);
      ctx.fill();
    }

    // partículas de polen dorado
    ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
    for (let i = 0; i < 15; i++) {
      const px = (i * 67 + camera.x * 0.2) % VIEW_W;
      const py = VIEW_H - ((i * 53 + goalAnim * 30) % 400);
      ctx.beginPath();
      ctx.arc(px, py, 1 + (i % 3), 0, Math.PI*2);
      ctx.fill();
    }

  } else {
    // === CAMPO: cielo azul, olivos, colinas ===
    const sky = ctx.createLinearGradient(0,0,0,VIEW_H);
    sky.addColorStop(0, '#5ec6e8');
    sky.addColorStop(0.6, '#a8e0c8');
    sky.addColorStop(1, '#d4c0a0');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,VIEW_W,VIEW_H);

    // Sol
    ctx.fillStyle = 'rgba(255, 235, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(VIEW_W - 120, 90, 50, 0, Math.PI*2);
    ctx.fill();

    // colinas
    ctx.fillStyle = '#7ec850';
    const off1 = (camera.x * 0.2) % 400;
    for (let i = -1; i < 4; i++) {
      const bx = i*400 - off1;
      ctx.beginPath();
      ctx.moveTo(bx, 420);
      ctx.quadraticCurveTo(bx+100, 300, bx+200, 420);
      ctx.quadraticCurveTo(bx+300, 320, bx+400, 420);
      ctx.lineTo(bx+400, VIEW_H);
      ctx.lineTo(bx, VIEW_H);
      ctx.fill();
    }

    // olivos
    const off2 = (camera.x * 0.4) % 300;
    ctx.fillStyle = '#4a7a3a';
    for (let i = -1; i < 5; i++) {
      const bx = i*300 - off2;
      ctx.fillRect(bx+40, 360, 16, 120);
      ctx.beginPath();
      ctx.arc(bx+48, 350, 45, 0, Math.PI*2);
      ctx.fill();
    }

    // nubes decorativas
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const off3 = (camera.x * 0.1) % 500;
    for (let i = -1; i < 3; i++) {
      const bx = i*500 - off3;
      ctx.beginPath();
      ctx.arc(bx + 100, 80, 25, 0, Math.PI*2);
      ctx.arc(bx + 130, 75, 30, 0, Math.PI*2);
      ctx.arc(bx + 160, 85, 22, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

/* ---- Plataformas ---- */
function drawPlatform(pl) {
  if (pl.type === 'ground') {
    ctx.fillStyle = '#8b6b3a';
    ctx.fillRect(pl.x, pl.y + 8, pl.w, pl.h);
    ctx.fillStyle = '#5a8c3a';
    ctx.fillRect(pl.x, pl.y, pl.w, 14);
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(pl.x, pl.y, pl.w, 6);
    // textura
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < pl.w; i += 28) {
      ctx.fillRect(pl.x + i + 6, pl.y + 20, 4, 4);
      ctx.fillRect(pl.x + i + 16, pl.y + 34, 5, 5);
    }
  } else if (pl.type === 'crate') {
    // Cajón de madera de campo
    ctx.fillStyle = '#c08850';
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.strokeStyle = '#6b3410';
    ctx.lineWidth = 3;
    ctx.strokeRect(pl.x+1.5, pl.y+1.5, pl.w-3, pl.h-3);
    ctx.strokeStyle = 'rgba(107,52,16,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x+pl.w, pl.y+pl.h);
    ctx.moveTo(pl.x+pl.w, pl.y); ctx.lineTo(pl.x, pl.y+pl.h);
    ctx.stroke();
  } else {
    // Plataforma de piedra (murete de campo)
    ctx.fillStyle = '#a8a0a0';
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = '#cfc8c8';
    ctx.fillRect(pl.x, pl.y, pl.w, 5);
    ctx.fillStyle = '#888080';
    ctx.fillRect(pl.x, pl.y + pl.h - 5, pl.w, 5);
    ctx.fillStyle = '#605858';
    for (let i = 10; i < pl.w; i += 30) {
      ctx.beginPath(); ctx.arc(pl.x + i, pl.y + 8, 2.5, 0, Math.PI*2); ctx.fill();
    }
  }
}

/* ---- Animal perdido (coleccionable) — dibujado en canvas ---- */
function drawAnimal(it) {
  const cx = it.x + it.w/2;
  const cy = it.y + it.h/2 + Math.sin(it.t)*4;
  ctx.save();
  ctx.translate(cx, cy);

  // aura de "perdido" pulsante
  const pulse = 0.5 + Math.sin(it.t * 2) * 0.3;
  ctx.fillStyle = `rgba(127, 255, 212, ${pulse * 0.35})`;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = `rgba(127, 255, 212, ${pulse * 0.15})`;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI*2);
  ctx.fill();

  const aType = it.type % 4;

  if (aType === 0) drawBunny();
  else if (aType === 1) drawHedgehog();
  else if (aType === 2) drawTurtle();
  else drawBird();

  // signo de exclamación "perdido"
  ctx.fillStyle = '#ff6b1a';
  ctx.font = 'bold 12px "Baloo 2"';
  ctx.textAlign = 'center';
  ctx.fillText('!', 16, -16);

  ctx.restore();
}

/* --- Conejo --- */
function drawBunny() {
  // cuerpo
  ctx.fillStyle = '#f5f0e8';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 9, 0, 0, Math.PI*2);
  ctx.fill();
  // orejas
  ctx.fillStyle = '#f5f0e8';
  ctx.beginPath(); ctx.ellipse(-5, -10, 3, 8, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -10, 3, 8, 0.2, 0, Math.PI*2); ctx.fill();
  // interior orejas rosado
  ctx.fillStyle = '#ffb3c1';
  ctx.beginPath(); ctx.ellipse(-5, -10, 1.5, 5, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -10, 1.5, 5, 0.2, 0, Math.PI*2); ctx.fill();
  // ojos
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-3, 0, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 0, 1.5, 0, Math.PI*2); ctx.fill();
  // nariz
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath(); ctx.arc(0, 4, 1.2, 0, Math.PI*2); ctx.fill();
  // bigotes
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3, 5); ctx.lineTo(-8, 4);
  ctx.moveTo(-3, 6); ctx.lineTo(-8, 7);
  ctx.moveTo(3, 5); ctx.lineTo(8, 4);
  ctx.moveTo(3, 6); ctx.lineTo(8, 7);
  ctx.stroke();
}

/* --- Erizo --- */
function drawHedgehog() {
  // cuerpo marrón
  ctx.fillStyle = '#8b6b3a';
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 8, 0, 0, Math.PI*2);
  ctx.fill();
  // púas
  ctx.strokeStyle = '#6b4b2a';
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    const ang = -Math.PI/2 + i * 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang)*8, Math.sin(ang)*6 + 2);
    ctx.lineTo(Math.cos(ang)*14, Math.sin(ang)*12 + 2);
    ctx.stroke();
  }
  // cara clara
  ctx.fillStyle = '#e8d5b8';
  ctx.beginPath();
  ctx.ellipse(0, 6, 6, 5, 0, 0, Math.PI*2);
  ctx.fill();
  // ojos
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-2.5, 5, 1.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5, 5, 1.3, 0, Math.PI*2); ctx.fill();
  // nariz
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(0, 8, 1, 0, Math.PI*2); ctx.fill();
}

/* --- Tortuga --- */
function drawTurtle() {
  // caparazón
  ctx.fillStyle = '#3a8a3a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#2a6a2a';
  // patrón del caparazón
  ctx.beginPath(); ctx.arc(-4, -1, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -1, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI*2); ctx.fill();
  // cabeza
  ctx.fillStyle = '#5a9a4a';
  ctx.beginPath();
  ctx.ellipse(0, 9, 5, 4, 0, 0, Math.PI*2);
  ctx.fill();
  // ojos
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-2, 8, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 8, 1, 0, Math.PI*2); ctx.fill();
  // patas
  ctx.fillStyle = '#5a9a4a';
  ctx.beginPath(); ctx.ellipse(-9, 4, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 4, 3, 2, 0, 0, Math.PI*2); ctx.fill();
}

/* --- Pájaro --- */
function drawBird() {
  // cuerpo azul
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI*2);
  ctx.fill();
  // ala
  ctx.fillStyle = '#29b6f6';
  ctx.beginPath();
  ctx.ellipse(-2, 2, 5, 4, -0.3, 0, Math.PI*2);
  ctx.fill();
  // cabeza
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(5, -4, 5, 0, Math.PI*2);
  ctx.fill();
  // pico naranja
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(9, -4); ctx.lineTo(14, -3); ctx.lineTo(9, -2);
  ctx.closePath();
  ctx.fill();
  // ojo
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(6, -5, 1.3, 0, Math.PI*2); ctx.fill();
  // patitas
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-3, 7); ctx.lineTo(-3, 11);
  ctx.moveTo(3, 7); ctx.lineTo(3, 11);
  ctx.stroke();
}

/* ---- Alien secuestrador (enemigo) ---- */
function drawAlien(e) {
  const cx = e.x + e.w/2;
  const cy = e.y + e.h/2;
  ctx.save();
  ctx.translate(cx, cy);

  // Flash de daño
  if (e.hitFlash > 0) {
    ctx.filter = 'brightness(2.5)';
  }

  // flotación leve
  const bob = Math.sin(e.rot) * 3;
  ctx.translate(0, bob);

  // Cuerpo del alien: cabeza grande verde
  ctx.fillStyle = '#3a8a3a';
  ctx.beginPath();
  ctx.ellipse(0, -8, 18, 16, 0, 0, Math.PI*2);
  ctx.fill();

  // Cabeza más oscura arriba
  ctx.fillStyle = '#2a6a2a';
  ctx.beginPath();
  ctx.ellipse(0, -14, 16, 10, 0, Math.PI, Math.PI*2);
  ctx.fill();

  // Antenas con ojos
  ctx.strokeStyle = '#3a8a3a';
  ctx.lineWidth = 3;
  // antena izq
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.lineTo(-12, -26);
  ctx.stroke();
  // antena der
  ctx.beginPath();
  ctx.moveTo(8, -18);
  ctx.lineTo(12, -26);
  ctx.stroke();
  // ojos en las antenas
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath(); ctx.arc(-12, -27, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -27, 3.5, 0, Math.PI*2); ctx.fill();
  // brillo en los ojos
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-13, -28, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -28, 1.2, 0, Math.PI*2); ctx.fill();

  // Ojos grandes en la cara (estilo alien clásico)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-6, -8, 5, 7, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -8, 5, 7, 0.3, 0, Math.PI*2); ctx.fill();
  // pupilas verticales
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(-6, -7, 1.5, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -7, 1.5, 4, 0, 0, Math.PI*2); ctx.fill();

  // Boca pequeña
  ctx.strokeStyle = '#1a4a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -2, 3, 0, Math.PI);
  ctx.stroke();

  // Cuerpo inferior (tentáculos)
  ctx.fillStyle = '#3a8a3a';
  for (let i = -2; i <= 2; i++) {
    const wave = Math.sin(e.rot + i * 0.5) * 4;
    ctx.beginPath();
    ctx.ellipse(i * 7, 8 + wave, 4, 10, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // indicador de HP si tiene más de 1
  if (e.hp > 1 && e.alive) {
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-16, -30, 32, 5);
    ctx.fillStyle = '#3f3';
    ctx.fillRect(-15, -29, (e.hp / (e.maxHp || 3)) * 30, 3);
  }

  ctx.filter = 'none';
  ctx.restore();
}

/* ---- Proyectil (piedra de tirachinas) ---- */
/* ---- Boss final: Rey Alien ---- */
function drawBoss(b) {
  const cx = b.x + b.w/2;
  const cy = b.y + b.h/2;
  ctx.save();
  ctx.translate(cx, cy);

  if (b.hitFlash > 0) ctx.filter = 'brightness(2.5)';

  const bob = Math.sin(b.anim * 1.5) * 3;
  ctx.translate(0, bob);

  // aura siniestra
  const auraPulse = 0.3 + Math.sin(b.anim * 3) * 0.2;
  ctx.fillStyle = `rgba(160, 32, 240, ${auraPulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI*2);
  ctx.fill();

  // cuerpo gigante (cabeza)
  ctx.fillStyle = '#4a8a4a';
  ctx.beginPath();
  ctx.ellipse(0, -10, 42, 38, 0, 0, Math.PI*2);
  ctx.fill();
  // parte superior más oscura
  ctx.fillStyle = '#3a6a3a';
  ctx.beginPath();
  ctx.ellipse(0, -25, 38, 22, 0, Math.PI, Math.PI*2);
  ctx.fill();

  // corona alien
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const px = i * 16;
    const py = -42 - Math.abs(i) * 3;
    ctx.beginPath();
    ctx.moveTo(px - 7, -35);
    ctx.lineTo(px, py);
    ctx.lineTo(px + 7, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // antenas grandes con ojos
  ctx.strokeStyle = '#4a8a4a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-20, -38);
  ctx.lineTo(-28, -55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, -38);
  ctx.lineTo(28, -55);
  ctx.stroke();
  // ojos en antenas (rojos brillantes)
  ctx.fillStyle = '#ff1a1a';
  ctx.beginPath(); ctx.arc(-28, -57, 6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -57, 6, 0, Math.PI*2); ctx.fill();
  // brillo
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-30, -59, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(26, -59, 2, 0, Math.PI*2); ctx.fill();

  // ojos gigantes de la cara
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-14, -12, 11, 16, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, -12, 11, 16, 0.2, 0, Math.PI*2); ctx.fill();
  // pupilas verticales
  ctx.fillStyle = '#000';
  const eyeLookX = (player.x > cx) ? 2 : -2;
  ctx.beginPath(); ctx.ellipse(-14 + eyeLookX, -10, 3, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14 + eyeLookX, -10, 3, 9, 0, 0, Math.PI*2); ctx.fill();

  // boca grande con dientes
  ctx.fillStyle = '#1a3a1a';
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 10, 0, 0, Math.PI*2);
  ctx.fill();
  // dientes
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i*7 - 3, 0);
    ctx.lineTo(i*7, 8);
    ctx.lineTo(i*7 + 3, 0);
    ctx.closePath();
    ctx.fill();
  }

  // tentáculos grandes
  ctx.fillStyle = '#4a8a4a';
  for (let i = -3; i <= 3; i++) {
    const wave = Math.sin(b.anim * 2 + i * 0.4) * 8;
    ctx.beginPath();
    ctx.ellipse(i * 12, 28 + wave, 6, 18, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.filter = 'none';

  // barra de HP del boss
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-50, -70, 100, 8);
  const hpRatio = b.hp / b.maxHp;
  const hpColor = hpRatio > 0.5 ? '#3f3' : hpRatio > 0.25 ? '#ff3' : '#f33';
  ctx.fillStyle = hpColor;
  ctx.fillRect(-48, -68, hpRatio * 96, 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-50, -70, 100, 8);

  // etiqueta
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 8px "Baloo 2"';
  ctx.textAlign = 'center';
  ctx.fillText('REY ALIEN', 0, -74);

  ctx.restore();
}

/* ---- Proyectil del boss (bola de plasma alien) ---- */
function drawBossProjectile(bp) {
  ctx.save();
  ctx.translate(bp.x + bp.w/2, bp.y + bp.h/2);
  // estela
  ctx.fillStyle = 'rgba(160, 32, 240, 0.4)';
  ctx.beginPath();
  ctx.arc(-bp.vx * 0.015, -bp.vy * 0.015, 8, 0, Math.PI*2);
  ctx.fill();
  // núcleo
  ctx.fillStyle = '#a020f0';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-1, -1, 2.5, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawProjectile(pr) {
  ctx.save();
  ctx.translate(pr.x + pr.w/2, pr.y + pr.h/2);
  // estela
  ctx.fillStyle = 'rgba(200, 180, 150, 0.4)';
  ctx.beginPath();
  ctx.arc(-pr.vx * 0.02, -pr.vy * 0.02, 6, 0, Math.PI*2);
  ctx.fill();
  // piedra
  ctx.fillStyle = '#8a8078';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#5a5048';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/* ---- Meta: Punto de rescate (caseta de animales) ---- */
function drawGoal(g) {
  const bob = Math.sin(goalAnim * 3) * 4;
  const cx = g.x + g.w/2;
  const cy = g.y + g.h/2 + bob;
  ctx.save();
  ctx.translate(cx, cy);

  const allDone = animalsCollected >= items.length;
  const glow = ctx.createRadialGradient(0,0,5, 0,0,60);
  glow.addColorStop(0, allDone ? 'rgba(127,255,212,0.55)' : 'rgba(255,180,60,0.4)');
  glow.addColorStop(1, allDone ? 'rgba(127,255,212,0)' : 'rgba(255,180,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-65,-65,130,130);

  // caseta de rescate
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-25, -15, 50, 40);
  // tejado
  ctx.fillStyle = '#a0522d';
  ctx.beginPath();
  ctx.moveTo(-30, -15);
  ctx.lineTo(0, -35);
  ctx.lineTo(30, -15);
  ctx.closePath();
  ctx.fill();
  // puerta
  ctx.fillStyle = '#5a2d0c';
  ctx.fillRect(-10, 5, 20, 20);
  // cartel "RESCATE"
  ctx.fillStyle = '#fff8e7';
  ctx.fillRect(-18, -12, 36, 12);
  ctx.fillStyle = '#d62828';
  ctx.font = 'bold 8px "Baloo 2"';
  ctx.textAlign = 'center';
  ctx.fillText('RESCATE', 0, -4);

  // animal feliz en la puerta si está completo
  if (allDone) {
    ctx.font = '16px sans-serif';
    ctx.fillText('🐾', 0, 18);
  }

  ctx.restore();

  // banderín "META"
  ctx.save();
  ctx.translate(g.x + g.w/2, g.y - 10 + bob*0.3);
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(0,24); ctx.lineTo(40,12); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Baloo 2"';
  ctx.textAlign = 'center';
  ctx.fillText('META', 14, 16);
  ctx.restore();
}

/* ---- El protagonista: MATEO (niño con tirachinas) ---- */
function drawPlayer(p) {
  if (p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0) return;

  const cx = p.x + p.w/2;
  const baseY = p.y + p.h;
  const sq = p.squash;
  const sx = 1 / Math.sqrt(sq);
  const sy = sq;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(p.facing * sx, sy);

  const W = p.w;   // 34
  const H = p.h;   // 48
  const top    = -H;
  const headY  = -H + 14;
  const bodyTop= -H + 24;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, W*0.55, 5, 0, 0, Math.PI*2);
  ctx.fill();

  // === PIERNAS ===
  const legSwing = Math.sin(p.walkTime) * 5;
  const legSwing2 = Math.sin(p.walkTime + Math.PI) * 5;
  // pantalón corto
  ctx.fillStyle = '#2d6b4a'; // verde campo
  ctx.fillRect(-10, -14, 8, 14 + (p.onGround ? legSwing*0.5 : 0));
  ctx.fillRect(2, -14, 8, 14 + (p.onGround ? legSwing2*0.5 : 0));
  // piernas (piel)
  ctx.fillStyle = '#e8b890';
  ctx.fillRect(-9, -8, 6, 8 + (p.onGround ? legSwing*0.3 : 0));
  ctx.fillRect(3, -8, 6, 8 + (p.onGround ? legSwing2*0.3 : 0));
  // zapatillas
  ctx.fillStyle = '#d62828';
  ctx.fillRect(-12, -3 + (p.onGround ? legSwing*0.5 : 0), 11, 5);
  ctx.fillRect(1, -3 + (p.onGround ? legSwing2*0.5 : 0), 11, 5);
  // suela blanca
  ctx.fillStyle = '#fff';
  ctx.fillRect(-12, -1 + (p.onGround ? legSwing*0.5 : 0), 11, 2);
  ctx.fillRect(1, -1 + (p.onGround ? legSwing2*0.5 : 0), 11, 2);

  // === CUERPO: camiseta ===
  ctx.fillStyle = '#e74c3c'; // camiseta roja
  ctx.beginPath();
  ctx.roundRect(-14, bodyTop, 28, 18, 5);
  ctx.fill();
  // banda decorativa
  ctx.fillStyle = '#fff';
  ctx.fillRect(-14, bodyTop + 6, 28, 3);

  // === TIRACHINAS en la mano ===
  ctx.fillStyle = '#6b3410'; // madera
  ctx.fillRect(10, bodyTop + 4, 10, 4);  // horquilla
  ctx.fillRect(8, bodyTop + 2, 3, 8);   // mango izq
  ctx.fillRect(19, bodyTop + 2, 3, 8);  // mango der
  // gomas
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(9, bodyTop + 4);
  ctx.lineTo(14, bodyTop + 8);
  ctx.moveTo(20, bodyTop + 4);
  ctx.lineTo(14, bodyTop + 8);
  ctx.stroke();

  // === BRAZOS ===
  const armSwing = p.onGround ? Math.sin(p.walkTime + Math.PI/2) * 4 : 0;
  // brazo trasero
  ctx.fillStyle = '#e8b890';
  ctx.fillRect(-16, bodyTop+2, 7, 14);
  // brazo delantero (con tirachinas)
  ctx.save();
  ctx.translate(12, bodyTop+3);
  ctx.rotate(armSwing * 0.05);
  ctx.fillStyle = '#e8b890';
  ctx.fillRect(-3, 0, 7, 14);
  ctx.restore();

  // === CABEZA ===
  // cara
  ctx.fillStyle = '#e8b890';
  ctx.beginPath();
  ctx.ellipse(0, headY+2, 10, 11, 0, 0, Math.PI*2);
  ctx.fill();

  // pelo castaño
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.ellipse(0, headY-4, 12, 9, 0, Math.PI, Math.PI*2);
  ctx.fill();
  // mechón
  ctx.fillStyle = '#5a3520';
  ctx.beginPath();
  ctx.ellipse(-3, headY-10, 5, 4, -0.3, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, headY-11, 5, 4, 0.3, 0, Math.PI*2);
  ctx.fill();

  // ojos
  const blink = (Math.sin(p.blink * 1.3) > 0.97) ? 0.3 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-4, headY, 3, 3*blink, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, headY, 3, 3*blink, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath(); ctx.arc(-4 + (p.facing>0?0.5:0), headY, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + (p.facing>0?0.5:0), headY, 1.5, 0, Math.PI*2); ctx.fill();

  // sonrisa
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, headY+4, 3.5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // mejillas rosadas
  ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
  ctx.beginPath(); ctx.arc(-7, headY+3, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, headY+3, 2.5, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

/* ---- Partículas ---- */
function drawParticle(p) {
  const a = Math.max(0, p.life / p.max);
  ctx.globalAlpha = a;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * a, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ----------------------------------------------------------
   11. Bucle principal
---------------------------------------------------------- */
function loop(t) {
  if (!lastTime) lastTime = t;
  dt = Math.min(0.033, (t - lastTime) / 1000);
  lastTime = t;

  if (state === STATE.PLAY) {
    update();
    draw();
    el.time.textContent = elapsed.toFixed(1);
  } else if (state === STATE.PAUSE) {
    draw();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ----------------------------------------------------------
   12. HUD y pantallas
---------------------------------------------------------- */
function updateHud() {
  el.bananas.textContent = animalsCollected;
  el.lives.textContent = lives;
}
function showOverlay(name) {
  [el.menu, el.help, el.pause, el.gameover, el.victory, el.leveldone].forEach(o => o.classList.add('hidden'));
  if (name) document.getElementById(name).classList.remove('hidden');
}

/* ----------------------------------------------------------
   13. Flujo del juego
---------------------------------------------------------- */
function startGame() {
  if (window.JMSound) { JMSound.init(); JMSound.resume(); JMSound.sfx.start(); }
  currentLevel = 0;
  lives = 3;
  totalElapsed = 0;
  loadLevel(0);
  if (window.JMSound) JMSound.startMusic();
}

function loadLevel(idx) {
  currentLevel = idx;
  level = buildLevel(idx);
  player = makePlayer(60, 420);
  enemies = level.enemies.map(makeEnemy);
  // guardar maxHp para barra de vida
  enemies.forEach(e => e.maxHp = e.hp);
  items = level.items;
  projectiles = [];
  particles = [];
  bossProjectiles = [];
  boss = level.boss ? { ...level.boss, maxHp: level.boss.hp } : null;
  bossDefeated = false;
  camera = { x: 0, y: 0 };
  animalsCollected = 0;
  elapsed = 0;
  levelStartTime = performance.now();
  jumpBuffer = 0; coyoteTimer = 0;
  shootCooldown = 0;
  goalMsg = ''; goalMsgTimer = 0;
  keys = {};
  el.total.textContent = items.length;
  el.levelLabel.textContent = `Nivel ${idx + 1}/${LEVELS.length} — ${level.name}`;
  updateHud();
  el.hud.classList.remove('hidden');
  detectTouch();
  showOverlay(null);
  state = STATE.PLAY;
}

function pauseGame() {
  if (state !== STATE.PLAY) return;
  state = STATE.PAUSE;
  showOverlay('pause');
}
function resumeGame() {
  if (state !== STATE.PAUSE) return;
  state = STATE.PLAY;
  showOverlay(null);
  lastTime = 0;
}

function gameOver() {
  state = STATE.OVER;
  if (window.JMSound) { JMSound.stopMusic(); JMSound.sfx.death(); }
  el.goBananas.textContent = animalsCollected;
  el.goTime.textContent = totalElapsed.toFixed(1);
  el.hud.classList.add('hidden');
  el.touch.classList.add('hidden');
  showOverlay('gameover');
}

function winGame() {
  totalElapsed += elapsed;
  if (currentLevel >= LEVELS.length - 1) {
    state = STATE.WIN;
    if (window.JMSound) { JMSound.stopMusic(); JMSound.sfx.victory(); }
    el.vcBananas.textContent = animalsCollected;
    el.vcTotal.textContent = items.length;
    el.vcTime.textContent = totalElapsed.toFixed(1);
    el.hud.classList.add('hidden');
    el.touch.classList.add('hidden');
    const isRecord = totalElapsed < record;
    if (isRecord) {
      record = totalElapsed;
      localStorage.setItem('mateoaventura_record', String(record));
      el.newRecord.classList.remove('hidden');
    } else {
      el.newRecord.classList.add('hidden');
    }
    updateRecordDisplay();
    showOverlay('victory');
  } else {
    if (window.JMSound) JMSound.sfx.levelUp();
    state = STATE.LEVELEDONE;
    el.ldLevel.textContent = `Nivel ${currentLevel + 1}`;
    el.ldName.textContent = level.name;
    el.ldBananas.textContent = animalsCollected;
    el.ldTotal.textContent = items.length;
    el.ldTime.textContent = elapsed.toFixed(1);
    el.hud.classList.add('hidden');
    el.touch.classList.add('hidden');
    showOverlay('leveldone');
  }
}

function nextLevel() {
  loadLevel(currentLevel + 1);
}

function backToMenu() {
  state = STATE.MENU;
  if (window.JMSound) JMSound.stopMusic();
  el.hud.classList.add('hidden');
  el.touch.classList.add('hidden');
  updateRecordDisplay();
  showOverlay('menu');
}

function updateRecordDisplay() {
  el.record.textContent = (record === Infinity) ? '—' : record.toFixed(1) + 's';
}

/* ----------------------------------------------------------
   14. Entrada (teclado + táctil)
---------------------------------------------------------- */
const KEY_MAP = {
  'ArrowLeft':'left','a':'left','A':'left',
  'ArrowRight':'right','d':'right','D':'right',
  'ArrowUp':'jump','w':'jump','W':'jump',' ':'jump',
  'j':'shoot','J':'shoot','k':'shoot','K':'shoot',
};
const JUMP_KEYS = new Set(['ArrowUp','w','W',' ']);
const SHOOT_KEYS = new Set(['j','J','k','K']);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (state === STATE.PLAY) pauseGame();
    else if (state === STATE.PAUSE) resumeGame();
    return;
  }
  const action = KEY_MAP[e.key];
  if (!action) return;
  e.preventDefault();
  keys[action] = true;
  if (JUMP_KEYS.has(e.key)) {
    if (!keys.jumpHeld) { keys.jumpQueued = true; keys.jumpHeld = true; }
  }
  if (SHOOT_KEYS.has(e.key)) {
    keys.shoot = true;
  }
});
window.addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.key];
  if (!action) return;
  keys[action] = false;
  if (JUMP_KEYS.has(e.key)) keys.jumpHeld = false;
  if (SHOOT_KEYS.has(e.key)) keys.shoot = false;
});

// Táctil
function bindTouchBtn(id, action) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    keys[action] = true;
    if (action === 'jump') keys.jumpQueued = true;
  };
  const release = (e) => { e.preventDefault(); keys[action] = false; };
  btn.addEventListener('touchstart', press, {passive:false});
  btn.addEventListener('touchend', release, {passive:false});
  btn.addEventListener('touchcancel', release, {passive:false});
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
}
bindTouchBtn('t-left','left');
bindTouchBtn('t-right','right');
bindTouchBtn('t-jump','jump');
bindTouchBtn('t-shoot','shoot');

function detectTouch() {
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-mode');
    el.touch.classList.remove('hidden');
  }
}

/* ----------------------------------------------------------
   15. Botones de la UI
---------------------------------------------------------- */
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-help').addEventListener('click', () => showOverlay('help'));
document.getElementById('btn-help-back').addEventListener('click', () => showOverlay('menu'));
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-quit').addEventListener('click', backToMenu);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-go-menu').addEventListener('click', backToMenu);
document.getElementById('btn-play-again').addEventListener('click', startGame);
document.getElementById('btn-vc-menu').addEventListener('click', backToMenu);
document.getElementById('btn-next-level').addEventListener('click', nextLevel);
document.getElementById('btn-ld-menu').addEventListener('click', backToMenu);

// Botones de sonido
document.getElementById('btn-sfx').addEventListener('click', () => {
  if (!window.JMSound) return;
  JMSound.init();
  const on = !JMSound.isSfxOn();
  JMSound.setSfxOn(on);
  document.getElementById('btn-sfx').textContent = on ? '🔊' : '🔇';
  if (on) JMSound.sfx.click();
});
document.getElementById('btn-music').addEventListener('click', () => {
  if (!window.JMSound) return;
  JMSound.init();
  const on = !JMSound.isMusicOn();
  JMSound.setMusicOn(on);
  document.getElementById('btn-music').textContent = on ? '🎵' : '🎶';
  if (on && state === STATE.PLAY) JMSound.startMusic();
});

// Polyfill roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r) {
    if (typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
    else r = {tl:r[0],tr:r[1],br:r[2],bl:r[3]};
    this.beginPath();
    this.moveTo(x+r.tl, y);
    this.lineTo(x+w-r.tr, y);
    this.quadraticCurveTo(x+w, y, x+w, y+r.tr);
    this.lineTo(x+w, y+h-r.br);
    this.quadraticCurveTo(x+w, y+h, x+w-r.br, y+h);
    this.lineTo(x+r.bl, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-r.bl);
    this.lineTo(x, y+r.tl);
    this.quadraticCurveTo(x, y, x+r.tl, y);
    this.closePath();
    return this;
  };
}

updateRecordDisplay();
detectTouch();

})();
