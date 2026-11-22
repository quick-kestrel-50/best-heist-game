// Loot: side pieces picked up by walking over them, and the Moonlight Sapphire
// itself, lifted from the plinth by holding E for 1.2 s. Lifting the sapphire
// leaves the Velvet Fox's white calling card on the empty plinth.
export function liftSapphire(state, dt, holdingInteract) {
  const thief = state.thief;
  const plinth = state.level.plinth;
  // Side loot: walk over it and it is yours.
  for (let i = 0; i < state.level.loots.length; i += 1) {
    const loot = state.level.loots[i];
    if (state.lootTaken[i]) continue;
    const dx = thief.x - loot.x;
    const dy = thief.y - loot.y;
    if (dx * dx + dy * dy < 22 * 22) {
      state.lootTaken[i] = true;
      state.lootValue += loot.value;
      state.sparkles.push({ x: loot.x, y: loot.y, t: 0 });
      state.sound.chime();
    }
  }
  if (state.sapphireTaken) {
    thief.lifting = 0;
    return;
  }
  const dx = thief.x - plinth.cx;
  const dy = thief.y - plinth.cy;
  const near = dx * dx + dy * dy < 70 * 70;
  if (near && holdingInteract) {
    thief.lifting += dt;
    if (thief.lifting >= 1.2) {
      state.sapphireTaken = true;
      state.callingCard = true;
      state.lootValue += 10000;
      thief.lifting = 0;
      state.sparkles.push({ x: plinth.cx, y: plinth.cy - 20, t: 0 });
      state.sound.chime();
    }
  } else {
    thief.lifting = Math.max(0, thief.lifting - dt * 2);
  }
}
