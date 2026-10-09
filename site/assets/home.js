(() => {
  const data = window.__LAB__ || { projects: [] };
  const P = data.projects;
  const $ = (id) => document.getElementById(id);
  const grid = $("grid"), q = $("q"), chips = $("chips");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const papers = new Set(P.filter((p) => p.paper).map((p) => p.paper.arxiv || p.paper.title));
  $("n-papers").textContent = papers.size;
  $("n-proj").textContent = P.length;
  const newest = P.map((p) => p.date || p.added).filter(Boolean).sort().pop();
  if (newest) $("updated").textContent = "last drop " + newest;

  let kind = "all", tag = "", text = "";
  const kinds = [...new Set(P.map((p) => p.kind))];
  const tags = [...new Set(P.flatMap((p) => p.tags))].slice(0, 14);
  const mkChip = (label, on, fn) => { const b = document.createElement("button"); b.className = "chip"; b.type = "button"; b.textContent = label; b.setAttribute("aria-pressed", on); b.onclick = fn; return b; };
  function drawChips() {
    chips.textContent = "";
    chips.append(mkChip("all", kind === "all" && !tag, () => { kind = "all"; tag = ""; update(); }));
    kinds.forEach((k) => chips.append(mkChip(k, kind === k, () => { kind = kind === k ? "all" : k; update(); })));
    tags.forEach((t) => chips.append(mkChip("#" + t, tag === t, () => { tag = tag === t ? "" : t; update(); })));
  }
  const isNew = (p) => { const d = Date.parse(p.date || p.added || ""); return d && Date.now() - d < 7 * 864e5; };
  function card(p) {
    const a = document.createElement("a"); a.className = "card"; a.href = "p/" + p.slug + "/";
    const th = p.thumbnail ? `<img loading="lazy" alt="" src="demo/${esc(p.slug)}/${esc(p.thumbnail.slice(5))}">` : `<canvas data-seed="${esc(p.slug)}"></canvas>`;
    a.innerHTML = `<div class="thumb"><span class="kind badge ${isNew(p) ? "new" : ""}">${isNew(p) ? "new" : esc(p.kind)}</span>${th}</div>
      <div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.tagline)}</p>
      <div class="tags">${p.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="foot2 mono"><span>${esc(p.date || p.added || "")}</span>${p.paper && p.paper.arxiv ? `<span class="ar">arXiv:${esc(p.paper.arxiv)}</span>` : "<span></span>"}</div></div>`;
    const c = a.querySelector("canvas"); if (c && window.labArt) window.labArt(c, p.slug);
    return a;
  }
  function update() {
    drawChips(); grid.textContent = "";
    const s = text.trim().toLowerCase();
    const list = P.filter((p) => (kind === "all" || p.kind === kind) && (!tag || p.tags.includes(tag)) &&
      (!s || [p.title, p.tagline, p.paper && p.paper.title, p.tags.join(" ")].join(" ").toLowerCase().includes(s)));
    if (!list.length) {
      grid.innerHTML = `<div class="signal"><div class="scope"><i></i><i></i><i></i></div><h3>${P.length ? "Nothing matches" : "Listening for the first signal"}</h3>
        <p>${P.length ? "Try a different search or clear the filters." : "The agents are reading this week's papers right now. The first experiment will appear here the moment it is built and checked."}</p></div>`;
      return;
    }
    list.forEach((p) => grid.append(card(p)));
  }
  q.addEventListener("input", () => { text = q.value; update(); });
  if (!P.length) $("controls").style.display = "none";
  update();
})();
