// Cone and line-of-sight tests: what a guard or a camera can actually see.
// A cone sees the thief only inside its range and spread with a clear segment
// between watcher and thief; walls and display cases block the segment.
export function lineOfSightClear(level, x1, y1, x2, y2) {
  for (let i = 0; i < level.blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, level.blockers[i])) return false;
  }
  return true;
}

/** True when the thief stands inside the cone and the view to them is clear. */
export function coneSeesPoint(level, ox, oy, heading, range, halfSpread, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > range || d < 1) return false;
  const angleTo = Math.atan2(dy, dx);
  let diff = angleTo - heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfSpread) return false;
  return lineOfSightClear(level, ox, oy, tx, ty);
}

/** Segment-vs-rectangle test: true when the segment touches or crosses the rect. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 0.000001) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 0.000001) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}
