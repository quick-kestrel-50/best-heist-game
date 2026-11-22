// The HUD strip: the gold VELVET FOX badge, the wide ALARM bar, the loot
// counter and the timer, plus the objective line under the strip.
export function drawHud(ctx, state) {
  ctx.save();
  // Strip.
  ctx.fillStyle = '#10142a';
  ctx.fillRect(0, 0, 1280, 64);
  ctx.fillStyle = '#2c355e';
  ctx.fillRect(0, 62, 1280, 2);

  // Left: gold title badge.
  ctx.fillStyle = '#f2c94c';
  roundRect(ctx, 18, 12, 218, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#1b2340';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VELVET FOX', 127, 33);

  // Centre: ALARM label and the wide segmented bar.
  const alarm = state.alarm;
  ctx.fillStyle = '#eef1f5';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ALARM', 468, 34);
  const barX = 484;
  const barY = 16;
  const barW = 320;
  const barH = 32;
  ctx.fillStyle = '#05070f';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  const band = alarm < 35 ? '#3fae5a' : alarm < 70 ? '#e8a13a' : '#e5534b';
  ctx.fillStyle = band;
  const fillW = Math.max(0, Math.min(barW, (barW * alarm) / 100));
  ctx.fillRect(barX, barY, fillW, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 1; i < 10; i += 1) ctx.fillRect(barX + (barW * i) / 10 - 1, barY, 2, barH);
  if (alarm >= 70) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 10);
    ctx.strokeStyle = 'rgba(229,83,75,' + (0.4 + 0.6 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
  }

  // Right: loot counter, coin count and the timer.
  const taken = state.lootTaken.filter(Boolean).length + (state.sapphireTaken ? 1 : 0);
  ctx.fillStyle = '#f2c94c';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('◆ ' + taken + '/4  $' + state.lootValue.toLocaleString('en-US'), 850, 26);
  ctx.fillStyle = '#9fd8e8';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('◉ ' + state.coins + ' coins', 850, 52);
  ctx.fillStyle = '#eef1f5';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(state.time), 1262, 34);

  // Objective line under the strip.
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = state.sapphireTaken ? '#7fe3d0' : '#f2c94c';
  const objective = state.sapphireTaken
    ? 'Sapphire lifted — Escape through the door!'
    : 'Steal the Moonlight Sapphire — then reach the door.';
  ctx.fillText(objective, 640, 102);

  // Controls footer on the south wall band.
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(238,241,245,0.55)';
  ctx.fillText('WASD / arrows move · Shift sprint · Click toss a coin · E interact · R restart', 700, 792);
  ctx.restore();
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
