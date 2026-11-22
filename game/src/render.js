// Drawing: the museum frame, cones, glow and vignette. Vision cones are drawn
// FIRST and walls and cases are drawn OVER them, so cover visibly blocks sight
// without any per-ray cone clipping. The floor, light pools and vignette are
// pre-rendered once to offscreen canvases.
import { drawHud } from './hud.js';
import { laserGateOpen } from './lasers.js';

export function drawMuseumFrame(ctx, state) {
  const level = state.level;
  ctx.save();
  ctx.clearRect(0, 0, 1280, 800);
  drawFloor(ctx, state);
  drawPatrolPaths(ctx, state);
  drawVisionCones(ctx, state);
  drawVaultGlass(ctx, state);
  drawWallsAndCases(ctx, level);
  drawDoor(ctx, state);
  drawLoot(ctx, state);
  drawLaserGate(ctx, state);
  drawCoin(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawThief(ctx, state);
  drawSparkles(ctx, state);
  drawVignette(ctx, state);
  drawLampGlows(ctx, state);
  drawHud(ctx, state);
  drawBanner(ctx, state);
  ctx.restore();
}

// --- Pre-rendered floor and vignette ---

let floorPlain = null;
let floorSpeckle = null;
let vignetteCanvas = null;

function getFloor(speckle) {
  if (speckle && floorSpeckle) return floorSpeckle;
  if (!speckle && floorPlain) return floorPlain;
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 800;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(640, 420, 80, 640, 420, 900);
  grad.addColorStop(0, '#232c4e');
  grad.addColorStop(1, '#161c33');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1280, 800);
  // Soft radial light pools under the lamps.
  const pools = [
    [90, 745, 170], [1108, 224, 190], [400, 300, 210],
    [700, 500, 210], [1000, 700, 190], [560, 170, 180],
  ];
  for (let i = 0; i < pools.length; i += 1) {
    const p = pools[i];
    const pool = g.createRadialGradient(p[0], p[1], 8, p[0], p[1], p[2]);
    pool.addColorStop(0, 'rgba(255, 236, 180, 0.16)');
    pool.addColorStop(1, 'rgba(255, 236, 180, 0)');
    g.fillStyle = pool;
    g.fillRect(p[0] - p[2], p[1] - p[2], p[2] * 2, p[2] * 2);
  }
  // Large low-contrast zone labels on the floor.
  g.fillStyle = 'rgba(238, 241, 245, 0.10)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 46px system-ui, sans-serif';
  g.fillText('GALLERY', 560, 170);
  g.font = 'bold 34px system-ui, sans-serif';
  g.fillText('SERVICE CORRIDOR', 640, 716);
  g.font = 'bold 30px system-ui, sans-serif';
  g.fillText('THE VAULT', 1108, 140);
  if (speckle) {
    const rand = mulberry32(20261122);
    g.fillStyle = 'rgba(238, 241, 245, 0.05)';
    for (let i = 0; i < 260; i += 1) {
      const x = 20 + rand() * 1240;
      const y = 84 + rand() * 696;
      g.fillRect(x, y, 2, 2);
    }
  }
  if (speckle) floorSpeckle = c; else floorPlain = c;
  return c;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getVignette() {
  if (vignetteCanvas) return vignetteCanvas;
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 800;
  const g = c.getContext('2d');
  const v = g.createRadialGradient(640, 420, 260, 640, 420, 780);
  v.addColorStop(0, 'rgba(5, 7, 15, 0)');
  v.addColorStop(1, 'rgba(5, 7, 15, 0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, 1280, 800);
  vignetteCanvas = c;
  return c;
}

function drawFloor(ctx, state) {
  ctx.drawImage(getFloor(state.speckle), 0, 0);
}

function drawVignette(ctx) {
  ctx.drawImage(getVignette(), 0, 0);
}

// Lamp pools re-lit after the vignette so the door and the vault stay readable.
function drawLampGlows(ctx) {
  const pools = [[90, 745, 150], [1108, 224, 170]];
  for (let i = 0; i < pools.length; i += 1) {
    const p = pools[i];
    const pool = ctx.createRadialGradient(p[0], p[1], 8, p[0], p[1], p[2]);
    pool.addColorStop(0, 'rgba(255, 236, 180, 0.14)');
    pool.addColorStop(1, 'rgba(255, 236, 180, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(p[0] - p[2], p[1] - p[2], p[2] * 2, p[2] * 2);
  }
}

// --- Floor furniture and routes ---

function drawPatrolPaths(ctx, state) {
  ctx.save();
  ctx.strokeStyle = 'rgba(238, 241, 245, 1)';
  ctx.globalAlpha = state.patrolAlpha;
  ctx.setLineDash([3, 9]);
  ctx.lineWidth = 2;
  for (let i = 0; i < state.level.guardRoutes.length; i += 1) {
    const route = state.level.guardRoutes[i];
    ctx.beginPath();
    ctx.moveTo(route.waypoints[0].x, route.waypoints[0].y);
    for (let j = 1; j < route.waypoints.length; j += 1) ctx.lineTo(route.waypoints[j].x, route.waypoints[j].y);
    if (route.loop) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawWallsAndCases(ctx, level) {
  for (let i = 0; i < level.walls.length; i += 1) {
    const w = level.walls[i];
    ctx.fillStyle = '#3a4568';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#5a6a9a';
    ctx.fillRect(w.x, w.y, w.w, 2);
  }
  for (let i = 0; i < level.cases.length; i += 1) {
    const c = level.cases[i];
    ctx.fillStyle = '#232c47';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#31406b';
    ctx.fillRect(c.x, c.y, c.w, 3);
    ctx.strokeStyle = '#10142a';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  }
}

// A specular streak across the vault glass.
function drawVaultGlass(ctx, state) {
  const v = state.level.vault;
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(v.x + 40, v.y);
  ctx.lineTo(v.x + 110, v.y);
  ctx.lineTo(v.x + 40, v.y + v.h);
  ctx.lineTo(v.x - 30, v.y + v.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Cones ---

function drawVisionCones(ctx, state) {
  for (let i = 0; i < state.guards.length; i += 1) {
    const g = state.guards[i];
    drawGuardCone(ctx, g, g.seen);
  }
  for (let i = 0; i < state.cameras.length; i += 1) {
    const cam = state.cameras[i];
    drawCameraCone(ctx, cam, cam.seen);
  }
}

function conePath(ctx, x, y, heading, range, halfSpread) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, heading - halfSpread, heading + halfSpread);
  ctx.closePath();
}

function drawGuardCone(ctx, guard, seen) {
  const range = 120;
  const half = (55 * Math.PI) / 360;
  const grad = ctx.createRadialGradient(guard.x, guard.y, 6, guard.x, guard.y, range);
  if (seen) {
    grad.addColorStop(0, 'rgba(255, 90, 60, 0.75)');
    grad.addColorStop(1, 'rgba(255, 90, 60, 0.05)');
  } else {
    grad.addColorStop(0, 'rgba(255, 196, 90, 0.55)');
    grad.addColorStop(1, 'rgba(255, 196, 90, 0.03)');
  }
  ctx.save();
  conePath(ctx, guard.x, guard.y, guard.heading, range, half);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = seen ? 'rgba(255, 120, 80, 0.95)' : 'rgba(255, 210, 120, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawCameraCone(ctx, camera, seen) {
  const range = 95;
  const half = (45 * Math.PI) / 360;
  ctx.save();
  conePath(ctx, camera.x, camera.y, camera.angle, range, half);
  ctx.fillStyle = seen ? 'rgba(229, 83, 75, 0.5)' : 'rgba(229, 83, 75, 0.28)';
  ctx.fill();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = 'rgba(255, 110, 100, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// --- Door, loot, laser, coin ---

function drawDoor(ctx, state) {
  const door = state.level.door;
  const getaway = state.sapphireTaken;
  ctx.save();
  // Pad.
  ctx.shadowColor = '#2ec4b6';
  ctx.shadowBlur = getaway ? 28 : 12;
  ctx.fillStyle = getaway ? '#1f8f84' : '#1a5f58';
  ctx.fillRect(door.padX - 34, door.padY - 12, 68, 26);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7fe3d0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getaway ? 'GETAWAY' : 'ENTRY', door.padX, door.padY - 28);
  // Jambs of the gap in the south wall.
  ctx.fillStyle = '#3a4568';
  ctx.fillRect(door.x - 6, 772, 8, 28);
  ctx.fillRect(door.x + door.w - 2, 772, 8, 28);
  ctx.restore();
}

function drawLoot(ctx, state) {
  const level = state.level;
  const pulse = 1 + 0.12 * Math.sin(state.time * 4);
  for (let i = 0; i < level.loots.length; i += 1) {
    if (state.lootTaken[i]) continue;
    drawGoldDiamond(ctx, level.loots[i].x, level.loots[i].y, 13 * pulse, state.time);
  }
  const plinth = level.plinth;
  // Plinth.
  ctx.fillStyle = '#2c355e';
  ctx.fillRect(plinth.x, plinth.y, plinth.w, plinth.h);
  ctx.strokeStyle = '#5a6a9a';
  ctx.lineWidth = 2;
  ctx.strokeRect(plinth.x + 1, plinth.y + 1, plinth.w - 2, plinth.h - 2);
  if (!state.sapphireTaken) {
    drawGoldDiamond(ctx, plinth.cx, plinth.cy - 8, 20 * pulse, state.time);
    ctx.fillStyle = '#eef1f5';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAPPHIRE', plinth.cx, plinth.y + plinth.h + 16);
  }
  if (state.callingCard) {
    // The Velvet Fox's white calling card on the empty plinth.
    ctx.save();
    ctx.translate(plinth.cx, plinth.cy);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#f4f7fa';
    ctx.fillRect(-13, -9, 26, 18);
    ctx.strokeStyle = '#2ec4b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 3);
    ctx.lineTo(0, -5);
    ctx.lineTo(6, 3);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawGoldDiamond(ctx, x, y, r, time) {
  ctx.save();
  ctx.shadowColor = '#f2c94c';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.72, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.72, y);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x + r * 0.3, y - r * 0.1);
  ctx.lineTo(x, y + r * 0.25);
  ctx.lineTo(x - r * 0.3, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLaserGate(ctx, state) {
  const v = state.level.vault;
  const on = laserGateOpen(state);
  const midY = v.doorY + v.doorH / 2;
  ctx.save();
  // Emitter posts.
  for (let i = 0; i < 2; i += 1) {
    const y = i === 0 ? v.doorY + 2 : v.doorY + v.doorH - 10;
    ctx.shadowColor = '#ff4d6d';
    ctx.shadowBlur = on ? 14 : 4;
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(v.doorX - 3, y, 22, 8);
  }
  ctx.shadowBlur = 0;
  if (on) {
    const glow = 0.6 + 0.4 * Math.sin(state.time * 9);
    ctx.strokeStyle = 'rgba(255, 77, 109, ' + glow.toFixed(2) + ')';
    ctx.shadowColor = '#ff4d6d';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i += 1) {
      const y = v.doorY + 10 + i * 14;
      ctx.beginPath();
      ctx.moveTo(v.doorX, y);
      ctx.lineTo(v.doorX + v.doorW, y);
      ctx.stroke();
    }
    // Countdown glow: bright while the beams are live.
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 77, 109, ' + (0.5 + 0.4 * glow).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(v.doorX + 8, midY, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255, 77, 109, 0.35)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', v.doorX + 8, midY + 4);
  }
  ctx.restore();
}

function drawCoin(ctx, state) {
  const coin = state.coin;
  if (!coin || !coin.active) return;
  ctx.save();
  if (coin.ring < coin.maxRing) {
    ctx.strokeStyle = 'rgba(159, 216, 232, ' + (0.8 * (1 - coin.ring / coin.maxRing)).toFixed(2) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8eef7';
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2ec4b6';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¢', coin.x, coin.y);
  ctx.restore();
}

// --- Watchers and the thief ---

function drawCameras(ctx, state) {
  for (let i = 0; i < state.cameras.length; i += 1) {
    const cam = state.cameras[i];
    // Sweep-arc end-stop ticks at +/-40 deg.
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 110, 100, 0.55)';
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k += 2) {
      const a = Math.PI / 2 + k * (40 * Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(cam.x + Math.cos(a) * 88, cam.y + Math.sin(a) * 88);
      ctx.lineTo(cam.x + Math.cos(a) * 98, cam.y + Math.sin(a) * 98);
      ctx.stroke();
    }
    // Oversized dome housing on the wall, light enough to read at thumbnail size.
    ctx.fillStyle = '#4a5580';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 21, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#9aa8d0';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cam.x - 7, cam.y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39406b';
    ctx.fillRect(cam.x - 23, cam.y - 5, 46, 6);
    // Lens pointing along the cone.
    ctx.fillStyle = '#e5534b';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 14, cam.y + Math.sin(cam.angle) * 14, 6, 0, Math.PI * 2);
    ctx.fill();
    // Blinking red LED.
    const blink = Math.sin(state.time * 6 + i * 2) > 0;
    ctx.fillStyle = blink ? '#ff2e2e' : 'rgba(255, 46, 46, 0.25)';
    ctx.beginPath();
    ctx.arc(cam.x + 16, cam.y + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (cam.seen) drawExclaim(ctx, cam.x, cam.y + 30, 30);
    ctx.restore();
  }
}

function drawGuards(ctx, state) {
  for (let i = 0; i < state.guards.length; i += 1) {
    const g = state.guards[i];
    ctx.save();
    // Drop shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(g.x + 3, g.y + 13, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: dark uniform with an amber rim.
    ctx.fillStyle = '#2a3352';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8a13a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Visor facing the heading.
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.heading - 0.5) * 9, g.y + Math.sin(g.heading - 0.5) * 9);
    ctx.lineTo(g.x + Math.cos(g.heading + 0.5) * 9, g.y + Math.sin(g.heading + 0.5) * 9);
    ctx.stroke();
    ctx.fillStyle = '#e8a13a';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G' + (i + 1), g.x, g.y - 20);
    if (g.seen) drawExclaim(ctx, g.x, g.y - 34, g.flash ? 54 : 30);
    ctx.restore();
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(t.x + 3, t.y + 12, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teal hooded figure with two subtle fox-ear points.
  ctx.fillStyle = '#2ec4b6';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f3d3a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#2ec4b6';
  ctx.beginPath();
  ctx.moveTo(t.x - 11, t.y - 8);
  ctx.lineTo(t.x - 13, t.y - 20);
  ctx.lineTo(t.x - 3, t.y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t.x + 11, t.y - 8);
  ctx.lineTo(t.x + 13, t.y - 20);
  ctx.lineTo(t.x + 3, t.y - 12);
  ctx.closePath();
  ctx.fill();
  // Face: two eyes toward the heading.
  const ex = Math.cos(t.heading);
  const ey = Math.sin(t.heading);
  ctx.fillStyle = '#0b0e1a';
  ctx.beginPath();
  ctx.arc(t.x + ex * 5 - ey * 4, t.y + ey * 5 + ex * 4, 2.2, 0, Math.PI * 2);
  ctx.arc(t.x + ex * 5 + ey * 4, t.y + ey * 5 - ex * 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // The sapphire in hand once lifted.
  if (state.sapphireTaken) {
    drawGoldDiamond(ctx, t.x + ex * 20, t.y + ey * 20, 8, state.time);
  }
  // Lift progress ring.
  if (t.lifting > 0) {
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 22, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * t.lifting) / 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExclaim(ctx, x, y, size) {
  ctx.save();
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff5a3c';
  ctx.strokeStyle = '#1b0b08';
  ctx.lineWidth = 4;
  ctx.strokeText('!', x, y);
  ctx.fillText('!', x, y);
  ctx.restore();
}

function drawSparkles(ctx, state) {
  for (let i = 0; i < state.sparkles.length; i += 1) {
    const s = state.sparkles[i];
    const life = 1 - s.t / 0.7;
    if (life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = life;
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    const r = 6 + (1 - life) * 18;
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y);
    ctx.lineTo(s.x + r, s.y);
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x, s.y + r);
    ctx.stroke();
    ctx.restore();
  }
}

// --- Banners ---

function drawBanner(ctx, state) {
  if (state.mode === 'title') {
    overlay(ctx, 0.72);
    centreText(ctx, 'VELVET FOX', 640, 250, 'bold 88px system-ui, sans-serif', '#f2c94c');
    centreText(ctx, 'The Moonlight Heist', 640, 320, 'bold 38px system-ui, sans-serif', '#7fe3d0');
    centreText(ctx, 'Steal the Moonlight Sapphire — then reach the door.', 640, 390, '26px system-ui, sans-serif', '#eef1f5');
    centreText(ctx, 'WASD / arrows move · Shift sprint · Click toss a coin · E interact · R restart', 640, 440, '20px system-ui, sans-serif', '#9aa3bd');
    centreText(ctx, 'Press ENTER or click to begin', 640, 510, 'bold 30px system-ui, sans-serif', '#eef1f5');
  } else if (state.mode === 'caught') {
    overlay(ctx, 0.55);
    const cause = state.caughtBy === 'camera'
      ? 'CAUGHT ON CAMERA'
      : state.caughtBy === 'laser' ? 'TRIPPED THE LASER' : 'SPOTTED BY A GUARD';
    centreText(ctx, cause + ' — Press R', 640, 330, 'bold 76px system-ui, sans-serif', '#ff5a3c');
    centreText(ctx, 'Loot gathered: $' + state.lootValue.toLocaleString('en-US') + ' · Press R to retry', 640, 420, 'bold 30px system-ui, sans-serif', '#eef1f5');
  } else if (state.mode === 'escaped') {
    overlay(ctx, 0.6);
    const s = state.score;
    centreText(ctx, 'ESCAPED!', 640, 240, 'bold 96px system-ui, sans-serif', '#f2c94c');
    centreText(ctx, 'Loot $' + s.loot.toLocaleString('en-US') + ' · Time bonus $' + s.timeBonus.toLocaleString('en-US'), 640, 340, 'bold 44px system-ui, sans-serif', '#eef1f5');
    centreText(ctx, 'Ghost bonus $' + s.ghost.toLocaleString('en-US') + ' · Total $' + s.total.toLocaleString('en-US') + ' · Rank ' + s.rank, 640, 400, 'bold 44px system-ui, sans-serif', '#eef1f5');
    centreText(ctx, 'The Velvet Fox leaves only a calling card.', 640, 470, 'italic 34px system-ui, sans-serif', '#7fe3d0');
    centreText(ctx, 'Press R to play again', 640, 530, '28px system-ui, sans-serif', '#9aa3bd');
  }
}

function overlay(ctx, alpha) {
  ctx.fillStyle = 'rgba(5, 7, 15, ' + alpha + ')';
  ctx.fillRect(0, 0, 1280, 800);
}

function centreText(ctx, text, x, y, font, colour) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
  ctx.restore();
}
