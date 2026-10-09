// Background: a domain-warped flow field in a fragment shader that bends toward the pointer. Falls back to nothing (CSS bg) if WebGL is unavailable.
(() => {
  const cv = document.getElementById("bg"); if (!cv) return;
  if (document.body.classList.contains("project")) { cv.style.display = "none"; return; } // keep the GPU free for the experiment itself
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }); if (!gl) return;
  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `precision mediump float;uniform vec2 R;uniform float T;uniform vec2 M;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){
    vec2 uv=gl_FragCoord.xy/R; vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
    vec2 m=(M-.5*R)/R.y;
    float d=length(p-m); p+=normalize(p-m+1e-4)*.06*exp(-d*4.);
    float t=T*.045;
    vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6+vec2(5.2,1.3)-t));
    vec2 r=vec2(fbm(p*2.2+3.*q+vec2(1.7,9.2)+t*1.4),fbm(p*2.2+3.*q+vec2(8.3,2.8)-t*1.2));
    float f=fbm(p*1.8+3.5*r);
    vec3 ink=vec3(.022,.027,.04);
    vec3 a=vec3(.30,1.,.80), b=vec3(.55,.49,1.);
    vec3 col=ink+(a*smoothstep(.55,.95,f)*.20+b*smoothstep(.35,.8,r.x)*.16)*smoothstep(1.2,.0,uv.y*.9+.05);
    float ridge=smoothstep(.015,0.,abs(fract(f*9.)-.5)-.47)*.5; col+=a*ridge*.05*smoothstep(.2,.9,f);
    float grid=(smoothstep(.02,0.,abs(fract(p.x*14.)-.5)-.49)+smoothstep(.02,0.,abs(fract(p.y*14.)-.5)-.49))*.012; col+=grid;
    col+=a*exp(-d*7.)*.07;
    col*=1.-.55*length(uv-.5);
    gl_FragColor=vec4(col,1.);}`;
  const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
  const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs); if (!v || !f) return;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, "R"), uT = gl.getUniformLocation(pr, "T"), uM = gl.getUniformLocation(pr, "M");
  const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.6; // render small, let the browser upscale: it is a soft background
  let mx = 0.6, my = 0.35, tx = mx, ty = my;
  const size = () => { cv.width = Math.max(2, Math.floor(innerWidth * scale)); cv.height = Math.max(2, Math.floor(innerHeight * scale)); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener("resize", size); size();
  addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }, { passive: true });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let vis = true, t0 = performance.now(), last = 0;
  document.addEventListener("visibilitychange", () => { vis = !document.hidden; if (vis) requestAnimationFrame(frame); });
  function frame(now) {
    if (!vis) return;
    if (now - last > 30) { // ~30 fps is plenty for a backdrop
      last = now; mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 12 : (now - t0) / 1000); gl.uniform2f(uM, mx * cv.width, my * cv.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
