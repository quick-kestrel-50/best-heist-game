// The Velvet Fox herself: movement and the decoy coin she tosses with a click.
// She walks 170 px/s, sprints at 260 px/s (louder: detection fills 1.6x faster
// while sprinting inside a cone), and collides with walls and display cases.
import { collideCircle, pointInsideSolid } from './level.js';
import { callGuardsToCoin } from './guards.js';

export function tossDecoyCoin(state, x, y) {
  if (state.mode !== 'play') return false;
  if (state.coins <= 0) return false;
  if (x < 16 || x > 1264 || y < 80 || y > 784) return false;
  if (pointInsideSolid(state.level, x, y)) return false;
  state.coins -= 1;
  state.coin = { x, y, ring: 12, maxRing: 150, active: true };
  callGuardsToCoin(state.guards, state.coin);
  return true;
}

/** Move the thief one step from the held keys; returns true while she sprints. */
export function moveThief(state, dt, input) {
  const thief = state.thief;
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx === 0 && dy === 0) {
    thief.sprinting = false;
    return false;
  }
  const len = Math.sqrt(dx * dx + dy * dy);
  dx /= len;
  dy /= len;
  const sprinting = !!input.sprint;
  const speed = sprinting ? 260 : 170;
  thief.x += dx * speed * dt;
  thief.y += dy * speed * dt;
  thief.heading = Math.atan2(dy, dx);
  thief.sprinting = sprinting;
  collideCircle(state.level, thief, 14);
  return sprinting;
}
