// Guards: waypoint patrols and the amber vision cone that reads the thief.
// A guard walks 85 px/s, pauses 1.2 s at each waypoint, and turns at most
// 120 deg/s so the cone sweeps in readable arcs. A tossed coin pulls a nearby
// guard off patrol: he walks to it, looks at it for 2 s, then returns.
import { coneSeesPoint } from './vision.js';

export function visionConeSeesThief(level, guard, thief) {
  return coneSeesPoint(level, guard.x, guard.y, guard.heading, 120, (55 * Math.PI) / 360, thief.x, thief.y);
}

/** Advance one guard one step along his route, or toward a coin he is chasing. */
export function patrolRoute(guard, route, dt, coin) {
  if (guard.mode === 'inspect') {
    guard.timer -= dt;
    if (guard.timer <= 0) {
      guard.mode = 'return';
    }
    return;
  }
  let tx;
  let ty;
  if (guard.mode === 'toCoin' && coin) {
    tx = coin.x;
    ty = coin.y;
  } else if (guard.mode === 'return') {
    const nearest = nearestWaypoint(route, guard);
    tx = nearest.x;
    ty = nearest.y;
  } else {
    const wp = route.waypoints[guard.wp];
    tx = wp.x;
    ty = wp.y;
  }
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 4) {
    if (guard.mode === 'toCoin') {
      guard.mode = 'inspect';
      guard.timer = 2;
      if (coin) guard.heading = Math.atan2(coin.y - guard.y, coin.x - guard.x);
      return;
    }
    if (guard.mode === 'return') {
      guard.mode = 'patrol';
      return;
    }
    if (guard.pause > 0) {
      guard.pause -= dt;
      return;
    }
    guard.pause = 1.2;
    if (route.loop) {
      guard.wp = (guard.wp + 1) % route.waypoints.length;
    } else {
      if (guard.wp === 0) guard.dir = 1;
      if (guard.wp === route.waypoints.length - 1) guard.dir = -1;
      guard.wp += guard.dir;
    }
    return;
  }
  const wanted = Math.atan2(dy, dx);
  guard.heading = turnToward(guard.heading, wanted, (120 * Math.PI / 180) * dt);
  const speed = 85;
  guard.x += (dx / dist) * speed * dt;
  guard.y += (dy / dist) * speed * dt;
}

/** A coin landing within earshot pulls every guard inside its ring off patrol. */
export function callGuardsToCoin(guards, coin) {
  for (let i = 0; i < guards.length; i += 1) {
    const g = guards[i];
    if (g.mode !== 'patrol') continue;
    const dx = coin.x - g.x;
    const dy = coin.y - g.y;
    if (Math.sqrt(dx * dx + dy * dy) <= 150) {
      g.mode = 'toCoin';
    }
  }
}

function nearestWaypoint(route, guard) {
  let best = route.waypoints[0];
  let bestD = Infinity;
  for (let i = 0; i < route.waypoints.length; i += 1) {
    const w = route.waypoints[i];
    const d = (w.x - guard.x) * (w.x - guard.x) + (w.y - guard.y) * (w.y - guard.y);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

function turnToward(heading, wanted, maxTurn) {
  let diff = wanted - heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxTurn) return wanted;
  return heading + Math.sign(diff) * maxTurn;
}
