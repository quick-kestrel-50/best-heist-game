// Sound: tiny original WebAudio oscillator blips only — a loot chime, a caught
// sting and a coin tick. No audio files. The context starts on first input.
export function soundKit() {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    } catch {
      ctx = null;
    }
    return ctx;
  }
  function blip(freq, dur, type, vol, when) {
    const audio = ensure();
    if (!audio) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, audio.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + when + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(audio.currentTime + when);
      osc.stop(audio.currentTime + when + dur);
    } catch {
      // Audio is decoration; a failure never breaks the game.
    }
  }
  return {
    ensure,
    chime() {
      blip(880, 0.18, 'sine', 0.12, 0);
      blip(1318, 0.25, 'sine', 0.1, 0.09);
    },
    sting() {
      blip(220, 0.5, 'sawtooth', 0.1, 0);
      blip(175, 0.6, 'sawtooth', 0.1, 0.12);
    },
    tick() {
      blip(1568, 0.06, 'square', 0.06, 0);
    },
  };
}
