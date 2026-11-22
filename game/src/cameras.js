// Cameras: wall-mounted domes whose hard-edged red cones sweep the north band.
// A camera sweeps +/-40 deg on a 4.8 s sine cycle; the two phases are offset so
// a gap always exists somewhere on the north route.
import { coneSeesPoint } from './vision.js';

export function sweepCameraCone(camera, time) {
  const base = Math.PI / 2; // pointing south, into the room
  const sweep = (40 * Math.PI) / 180;
  camera.angle = base + sweep * Math.sin((Math.PI * 2 * time) / 4.8 + camera.phase);
}

/** True when the thief stands inside this camera's red cone with a clear view. */
export function cameraConeSeesThief(level, camera, thief) {
  return coneSeesPoint(level, camera.x, camera.y, camera.angle, 95, (45 * Math.PI) / 360, thief.x, thief.y);
}
