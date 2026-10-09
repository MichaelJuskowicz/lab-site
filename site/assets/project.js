(() => {
  const f = document.getElementById("frame"), stage = document.getElementById("stage"), btn = document.getElementById("full");
  const ICON_ENTER = "\u26F6", ICON_EXIT = "\u2715";
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  let pseudo = false; // fallback for browsers (iOS Safari) that cannot fullscreen a div
  function render() {
    const on = fsEl() === stage || pseudo;
    stage.classList.toggle("is-full", on);
    document.body.classList.toggle("no-scroll", pseudo);
    btn.textContent = on ? ICON_EXIT : ICON_ENTER;
    btn.title = btn.ariaLabel = on ? "Exit fullscreen (Esc)" : "Fullscreen";
    exit.hidden = !on;
  }
  // a big, always-visible way out that sits on top of the experiment
  const exit = document.createElement("button");
  exit.type = "button"; exit.className = "exit-full mono"; exit.hidden = true; exit.textContent = "\u2715  Exit fullscreen";
  stage.appendChild(exit);
  function enter() {
    const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) { Promise.resolve(req.call(stage)).catch(() => { pseudo = true; render(); }); }
    else { pseudo = true; render(); }
  }
  function leave() {
    pseudo = false;
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    render();
  }
  const toggle = () => (fsEl() === stage || pseudo ? leave() : enter());
  btn.onclick = toggle; exit.onclick = leave;
  document.addEventListener("fullscreenchange", render); document.addEventListener("webkitfullscreenchange", render);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pseudo) leave(); if ((e.key === "f" || e.key === "F") && e.target === document.body) toggle(); });
  document.getElementById("reload").onclick = () => { f.src = f.src; };
  render();
})();