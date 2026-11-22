// Boot and the main loop: input every frame, the world advancing in fixed 1/60 s
// steps, and the renderer painting what is there. The game moves between four
// screens: title, play, caught and escaped.
//
// ?shot=cover|decoy|caught|escape (with &seed=1) stages that scene instead of
// running the loop: one composed frame is painted synchronously and
// window.__shotReady is set for a screenshot.
import { buildMuseumWithTwoRoutes } from './level.js';
import { visionConeSeesThief, patrolRoute } from './guards.js';
import { sweepCameraCone, cameraConeSeesThief } from './cameras.js';
import { raiseAlarm, decayAlarm } from './alarm.js';
import { tossDecoyCoin, moveThief } from './thief.js';
import { liftSapphire } from './loot.js';
import { lineOfSightClear } from './vision.js';
import { laserGateOpen, thiefInLaserGap } from './lasers.js';
import { drawHud } from './hud.js';
import { drawMuseumFrame } from './render.js';
import { soundKit } from './sound.js';

export function bootVelvetFoxGame() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  if (shot) {
    const state = makeSceneState(shot);
    drawMuseumFrame(ctx, state);
    window.__shotReady = true;
    return;
  }
  runGame(canvas, ctx);
}

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

function createState() {
  const level = buildMuseumWithTwoRoutes();
  const guards = level.guardRoutes.map((route, i) => {
    const start = route.waypoints[0];
    const next = route.waypoints[1];
    return {
      x: start.x, y: start.y,
      heading: Math.atan2(next.y - start.y, next.x - start.x),
      wp: 1, dir: 1, pause: 0, mode: 'patrol', timer: 0,
      seen: false, flash: false, routeIndex: i,
    };
  });
  const cameras = level.cameraMounts.map((m) => ({
    x: m.x, y: m.y, angle: Math.PI / 2, phase: m.phase, seen: false,
  }));
  return {
    level,
    mode: 'title',
    time: 0,
    alarm: 0,
    peakAlarm: 0,
    coins: 3,
    lootTaken: [false, false, false],
    sapphireTaken: false,
    callingCard: false,
    lootValue: 0,
    thief: { x: level.spawn.x, y: level.spawn.y, heading: -Math.PI / 2, sprinting: false, lifting: 0 },
    guards,
    cameras,
    laser: { t: 0, hit: false },
    coin: null,
    caughtBy: null,
    lastSource: null,
    score: null,
    sparkles: [],
    patrolAlpha: 0.18,
    speckle: true,
    sound: soundKit(),
  };
}

function resetState(state) {
  const fresh = createState();
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.mode = 'play';
}

function computeScore(state) {
  const seconds = Math.floor(state.time);
  const timeBonus = Math.max(0, 180 - seconds) * 25;
  const ghost = state.peakAlarm <= 50 ? 5000 : 0;
  const total = state.lootValue + timeBonus + ghost;
  const rank = total >= 22000 ? 'S' : total >= 17500 ? 'A' : total >= 12500 ? 'B' : 'C';
  return { loot: state.lootValue, timeBonus, ghost, total, rank };
}

function runGame(canvas, ctx) {
  const state = createState();
  const input = { up: false, down: false, left: false, right: false, sprint: false, interact: false };

  function startGame() {
    state.sound.ensure();
    resetState(state);
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    state.sound.ensure();
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.up = true; break;
      case 'KeyS': case 'ArrowDown': input.down = true; break;
      case 'KeyA': case 'ArrowLeft': input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.sprint = true; break;
      case 'KeyE': input.interact = true; break;
      case 'KeyR': if (state.mode !== 'title') startGame(); break;
      case 'Enter': case 'Space':
        if (state.mode === 'title' || state.mode === 'caught' || state.mode === 'escaped') startGame();
        break;
      default: break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.up = false; break;
      case 'KeyS': case 'ArrowDown': input.down = false; break;
      case 'KeyA': case 'ArrowLeft': input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.sprint = false; break;
      case 'KeyE': input.interact = false; break;
      default: break;
    }
  });
  canvas.addEventListener('click', (e) => {
    state.sound.ensure();
    if (state.mode === 'title' || state.mode === 'caught' || state.mode === 'escaped') {
      startGame();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 800;
    if (tossDecoyCoin(state, x, y)) state.sound.tick();
  });

  let accumulator = 0;
  let last = performance.now();

  function step() {
    if (state.mode !== 'play') return;
    state.time += STEP;
    state.laser.t += STEP;

    // Cameras sweep; guards walk their routes (or chase a coin).
    for (let i = 0; i < state.cameras.length; i += 1) sweepCameraCone(state.cameras[i], state.time);
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      patrolRoute(g, state.level.guardRoutes[g.routeIndex], STEP, state.coin);
      if (state.coin && state.coin.active && g.mode === 'patrol') {
        const dx = state.coin.x - g.x;
        const dy = state.coin.y - g.y;
        if (Math.sqrt(dx * dx + dy * dy) <= state.coin.ring) g.mode = 'toCoin';
      }
    }
    if (state.coin && state.coin.active) {
      state.coin.ring = Math.min(state.coin.maxRing, state.coin.ring + 220 * STEP);
    }

    const sprinting = moveThief(state, STEP, input);

    // Detection: every watcher feeds the one shared alarm meter.
    let anySeen = false;
    let strongest = null;
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      const seen = visionConeSeesThief(state.level, g, state.thief);
      g.seen = seen;
      g.flash = seen;
      if (seen) {
        anySeen = true;
        const dx = state.thief.x - g.x;
        const dy = state.thief.y - g.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const rate = (55 - 25 * (d / 120)) * (sprinting ? 1.6 : 1);
        if (!strongest || rate > strongest.rate) strongest = { rate, source: 'guard' };
      }
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      const cam = state.cameras[i];
      const seen = cameraConeSeesThief(state.level, cam, state.thief);
      cam.seen = seen;
      if (seen) {
        anySeen = true;
        if (!strongest || 35 > strongest.rate) strongest = { rate: 35, source: 'camera' };
      }
    }
    if (anySeen && strongest) {
      raiseAlarm(state, strongest.rate * STEP, strongest.source);
    } else {
      decayAlarm(state, STEP);
    }

    // The laser gate: crossing while the beams are live costs +50 alarm.
    if (laserGateOpen(state) && thiefInLaserGap(state)) {
      if (!state.laser.hit) {
        state.laser.hit = true;
        raiseAlarm(state, 50, 'laser');
        if (state.mode === 'play') state.caughtBy = 'laser';
      }
    } else if (!thiefInLaserGap(state)) {
      state.laser.hit = false;
    }

    liftSapphire(state, STEP, input.interact);

    for (let i = state.sparkles.length - 1; i >= 0; i -= 1) {
      state.sparkles[i].t += STEP;
      if (state.sparkles[i].t > 0.7) state.sparkles.splice(i, 1);
    }

    if (state.mode === 'caught') {
      state.sound.sting();
    }

    // Escape: back at the door with the sapphire.
    if (state.mode === 'play' && state.sapphireTaken) {
      const dx = state.thief.x - state.level.door.padX;
      const dy = state.thief.y - state.level.door.padY;
      if (dx * dx + dy * dy < 36 * 36) {
        state.mode = 'escaped';
        state.score = computeScore(state);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
    }
    drawMuseumFrame(ctx, state);
  }
  requestAnimationFrame(frame);
}

// --- Staged scenes: one composed frame per screenshot, all numbers agreeing ---

const SCENES = {
  cover: {
    mode: 'play', time: 24, alarm: 45, coins: 3, lootValue: 0,
    lootTaken: [false, false, false], sapphireTaken: false, callingCard: false,
    speckle: false, patrolAlpha: 0.05, laserT: 0,
    thief: { x: 450, y: 390, heading: -0.7 },
    guards: [
      { x: 300, y: 220, heading: 0, seen: false },
      { x: 700, y: 705, heading: Math.PI, seen: false },
      { x: 1000, y: 705, heading: 0, seen: false },
    ],
    cameras: [{ angle: Math.PI / 2 + 0.6 }, { angle: Math.PI / 2 - 0.5 }],
    coin: { x: 820, y: 700, ring: 90, maxRing: 150, active: true },
  },
  decoy: {
    mode: 'play', time: 47, alarm: 25, coins: 2, lootValue: 2500,
    lootTaken: [true, false, false], sapphireTaken: false, callingCard: false,
    speckle: true, patrolAlpha: 0.18, laserT: 3,
    thief: { x: 560, y: 690, heading: 0 },
    guards: [
      { x: 600, y: 220, heading: Math.PI / 2, seen: false },
      { x: 640, y: 705, heading: 0, seen: false },
      { x: 1000, y: 705, heading: Math.PI, seen: false },
    ],
    cameras: [{ angle: Math.PI / 2 + 0.3 }, { angle: Math.PI / 2 - 0.6 }],
    coin: { x: 700, y: 705, ring: 120, maxRing: 150, active: true },
  },
  caught: {
    mode: 'caught', time: 78, alarm: 100, coins: 2, lootValue: 15000,
    lootTaken: [true, true, false], sapphireTaken: true, callingCard: true,
    speckle: true, patrolAlpha: 0.18, laserT: 0, caughtBy: 'guard',
    thief: { x: 940, y: 220, heading: Math.PI },
    guards: [
      { x: 860, y: 220, heading: 0, seen: true, flash: true },
      { x: 500, y: 705, heading: 0, seen: false },
      { x: 900, y: 705, heading: Math.PI, seen: false },
    ],
    cameras: [{ angle: Math.PI / 2 + 0.4 }, { angle: Math.PI / 2 - 0.4 }],
    coin: null,
  },
  escape: {
    mode: 'escaped', time: 92, alarm: 45, coins: 2, lootValue: 17500,
    lootTaken: [true, true, true], sapphireTaken: true, callingCard: true,
    speckle: true, patrolAlpha: 0.18, laserT: 3, peakAlarm: 45,
    score: { loot: 17500, timeBonus: 2200, ghost: 5000, total: 24700, rank: 'S' },
    thief: { x: 90, y: 745, heading: Math.PI / 2 },
    guards: [
      { x: 400, y: 220, heading: Math.PI, seen: false },
      { x: 400, y: 705, heading: 0, seen: false },
      { x: 900, y: 705, heading: Math.PI, seen: false },
    ],
    cameras: [{ angle: Math.PI / 2 + 0.5 }, { angle: Math.PI / 2 - 0.3 }],
    coin: null,
  },
};

function makeSceneState(name) {
  const scene = SCENES[name] || SCENES.cover;
  const state = createState();
  state.mode = scene.mode;
  state.time = scene.time;
  state.alarm = scene.alarm;
  state.peakAlarm = scene.peakAlarm || scene.alarm;
  state.coins = scene.coins;
  state.lootValue = scene.lootValue;
  state.lootTaken = scene.lootTaken.slice();
  state.sapphireTaken = scene.sapphireTaken;
  state.callingCard = scene.callingCard;
  state.speckle = scene.speckle;
  state.patrolAlpha = scene.patrolAlpha;
  state.laser.t = scene.laserT;
  state.caughtBy = scene.caughtBy || null;
  state.score = scene.score || null;
  state.thief.x = scene.thief.x;
  state.thief.y = scene.thief.y;
  state.thief.heading = scene.thief.heading;
  for (let i = 0; i < scene.guards.length; i += 1) {
    const sg = scene.guards[i];
    state.guards[i].x = sg.x;
    state.guards[i].y = sg.y;
    state.guards[i].heading = sg.heading;
    state.guards[i].seen = !!sg.seen;
    state.guards[i].flash = !!sg.flash;
  }
  for (let i = 0; i < scene.cameras.length; i += 1) {
    state.cameras[i].angle = scene.cameras[i].angle;
  }
  state.coin = scene.coin;
  return state;
}

bootVelvetFoxGame();
