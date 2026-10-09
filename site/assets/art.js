// Procedural thumbnail for experiments that do not ship one: a deterministic line-field seeded by the slug.
window.labArt = function (canvas, seed) {
  const W = (canvas.width = 640), H = (canvas.height = 400), g = canvas.getContext("2d");
  let s = 2166136261; for (const ch of seed) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); }
  const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), ((s >>> 0) % 100000) / 100000);
  const hue = Math.floor(rnd() * 360), hue2 = (hue + 70 + rnd() * 120) % 360;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, `hsl(${hue} 55% 7%)`); bg.addColorStop(1, `hsl(${hue2} 60% 12%)`);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const A = 1 + Math.floor(rnd() * 4), B = 1 + Math.floor(rnd() * 5), ph = rnd() * 6.28, n = 90 + Math.floor(rnd() * 60);
  g.lineWidth = 1.1; g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const u = i / n; g.beginPath();
    for (let k = 0; k <= 160; k++) {
      const t = (k / 160) * 6.2832;
      const x = W / 2 + Math.sin(A * t + ph + u * 3) * (W * 0.42) * (0.35 + u * 0.65);
      const y = H / 2 + Math.sin(B * t + u * 5) * (H * 0.40) * (0.35 + u * 0.65) + Math.sin(t * 7 + u * 9) * 6;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = `hsla(${hue + u * (hue2 - hue)} 90% ${55 + u * 15}% / ${0.05 + 0.1 * (1 - Math.abs(u - 0.5) * 2)})`; g.stroke();
  }
  g.globalCompositeOperation = "source-over";
};
