(() => {
  const f = document.getElementById("frame"), stage = document.getElementById("stage");
  document.getElementById("reload").onclick = () => { f.src = f.src; };
  document.getElementById("full").onclick = () => { (stage.requestFullscreen || stage.webkitRequestFullscreen || (() => {})).call(stage); };
})();
