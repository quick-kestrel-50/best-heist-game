// The one shared alarm meter, 0-100. Every watcher feeds the same bar, so the
// player always knows exactly how close to caught they are. At 100: caught.
export function raiseAlarm(state, amount, source) {
  if (state.mode !== 'play') return;
  state.alarm = Math.min(100, state.alarm + amount);
  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);
  state.lastSource = source;
  if (state.alarm >= 100) {
    state.mode = 'caught';
    state.caughtBy = source;
  }
}

/** The meter drains 12/s whenever no watcher can see the thief. */
export function decayAlarm(state, dt) {
  if (state.mode !== 'play') return;
  state.alarm = Math.max(0, state.alarm - 12 * dt);
}
