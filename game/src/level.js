// The museum floor: walls, display cases, zones and the two routes in.
// One screen, no scrolling: the whole floor is visible in every frame.
export function buildMuseumWithTwoRoutes() {
  const level = {
    width: 1280,
    height: 800,
    hudHeight: 64,
    walls: WALLS,
    cases: CASES,
    zones: ZONES,
    vault: VAULT,
    door: DOOR,
    plinth: PLINTH,
    loots: LOOTS,
    spawn: SPAWN,
    guardRoutes: GUARD_ROUTES,
    cameraMounts: CAMERA_MOUNTS,
    blockers: WALLS.concat(CASES),
  };
  return level;
}

/** Push a circle out of every solid rect it overlaps; returns true when it hit something. */
export function collideCircle(level, circle, radius) {
  let hit = false;
  for (let i = 0; i < level.blockers.length; i += 1) {
    const r = level.blockers[i];
    const nearestX = Math.max(r.x, Math.min(circle.x, r.x + r.w));
    const nearestY = Math.max(r.y, Math.min(circle.y, r.y + r.h));
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      circle.x = nearestX + (dx / d) * radius;
      circle.y = nearestY + (dy / d) * radius;
    } else {
      circle.y = r.y - radius;
    }
  }
  // Keep the thief inside the inner bounds.
  circle.x = Math.max(16 + radius, Math.min(1264 - radius, circle.x));
  circle.y = Math.max(80 + radius, Math.min(784 - radius, circle.y));
  return hit;
}

/** True when point (x, y) sits inside any solid rect (walls or a case). */
export function pointInsideSolid(level, x, y) {
  for (let i = 0; i < level.blockers.length; i += 1) {
    const r = level.blockers[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

// --- Floor data (coordinates in px on the 1280x800 canvas) ---

// Outer walls are 16 thick; the south wall has the ENTRY gap at x 50-130.
const WALLS = [
  { x: 16, y: 64, w: 1248, h: 16 }, // north
  { x: 16, y: 784, w: 34, h: 16 }, // south, west of the door
  { x: 130, y: 784, w: 1134, h: 16 }, // south, east of the door
  { x: 0, y: 64, w: 16, h: 736 }, // west
  { x: 1264, y: 64, w: 16, h: 736 }, // east
  // Dividing wall y 624-640 with a west doorway (x 220-268) and an east doorway (x 980-1028).
  { x: 160, y: 624, w: 60, h: 16 },
  { x: 268, y: 624, w: 712, h: 16 },
  { x: 1028, y: 624, w: 92, h: 16 },
  // The vault: north, south and east walls, and a west wall with a doorway gap at y 196-244.
  { x: 968, y: 96, w: 280, h: 16 }, // vault north
  { x: 968, y: 336, w: 280, h: 16 }, // vault south
  { x: 1232, y: 96, w: 16, h: 256 }, // vault east
  { x: 968, y: 96, w: 16, h: 100 }, // vault west, above the doorway
  { x: 968, y: 244, w: 16, h: 108 }, // vault west, below the doorway
];

// Display cases: solid cover the thief can hide behind.
const CASES = [
  { x: 300, y: 300, w: 72, h: 48, label: 'A' },
  { x: 520, y: 300, w: 72, h: 48, label: 'B' },
  { x: 300, y: 470, w: 72, h: 48, label: 'C' },
  { x: 520, y: 470, w: 72, h: 48, label: 'D' },
  { x: 740, y: 380, w: 88, h: 56, label: 'E' },
  { x: 1052, y: 681, w: 56, h: 48, label: 'F' },
];

// Large low-contrast floor labels naming the zones.
const ZONES = [
  { text: 'GALLERY', x: 560, y: 170 },
  { text: 'SERVICE CORRIDOR', x: 640, y: 716 },
  { text: 'THE VAULT', x: 1108, y: 140 },
];

const VAULT = { x: 968, y: 96, w: 280, h: 256, doorX: 968, doorY: 196, doorW: 16, doorH: 48 };

const DOOR = { x: 50, y: 784, w: 80, h: 16, padX: 90, padY: 745, label: 'ENTRY' };

const PLINTH = { x: 1076, y: 192, w: 64, h: 64, cx: 1108, cy: 224 };

const LOOTS = [
  { id: 0, x: 336, y: 324, value: 2500, name: 'Jade Scarab' },
  { id: 1, x: 556, y: 494, value: 2500, name: 'Gold Mask' },
  { id: 2, x: 1080, y: 705, value: 2500, name: 'Pearl Fan' },
];

const SPAWN = { x: 90, y: 700 };

// Guard patrol routes. G1 loops the gallery; G2 and G3 ping-pong the corridor in opposite phase.
const GUARD_ROUTES = [
  { waypoints: [{ x: 200, y: 220 }, { x: 830, y: 220 }, { x: 830, y: 560 }, { x: 200, y: 560 }], loop: true },
  { waypoints: [{ x: 240, y: 705 }, { x: 1040, y: 705 }], loop: false },
  { waypoints: [{ x: 1040, y: 705 }, { x: 240, y: 705 }], loop: false },
];

// Cameras mounted on the north inner wall, cones pointing south.
const CAMERA_MOUNTS = [
  { x: 400, y: 88, phase: 0 },
  { x: 880, y: 88, phase: Math.PI },
];
