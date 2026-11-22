// The laser gate across the vault doorway: beams ON 2.4 s, OFF 1.6 s, on a
// 4 s cycle. Crossing while the beams are live adds +50 alarm instantly.
export function laserGateOpen(state) {
  const cycle = state.laser.t % 4;
  return cycle < 2.4;
}

/** True when the thief's circle overlaps the vault doorway gap. */
export function thiefInLaserGap(state) {
  const v = state.level.vault;
  const t = state.thief;
  const nearestX = Math.max(v.doorX, Math.min(t.x, v.doorX + v.doorW));
  const nearestY = Math.max(v.doorY, Math.min(t.y, v.doorY + v.doorH));
  const dx = t.x - nearestX;
  const dy = t.y - nearestY;
  return dx * dx + dy * dy < 14 * 14;
}
