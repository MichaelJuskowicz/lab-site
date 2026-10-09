// Site build (runs on Netlify: `node scripts/build.mjs`).
// Inputs : data/lock.json (pinned commits), local-projects/ (hand-made entries), site/ (templates and assets).
// Output : dist/  (static files only). Projects that fail validation are skipped, never fatal.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { validateManifest } from "./lib/validate.mjs";
import { readTarGz } from "./lib/tar.mjs";

const cfg = JSON.parse(readFileSync("lab.config.json", "utf8"));
const lock = existsSync("data/lock.json") ? JSON.parse(readFileSync("data/lock.json", "utf8")) : { projects: [] };
const blocklist = existsSync("blocklist.json") ? JSON.parse(readFileSync("blocklist.json", "utf8")) : [];
const token = process.env.LAB_GH_TOKEN || "";
const ALLOWED = new Set(cfg.allowedExtensions);
const L = cfg.limits;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const warn = (m) => console.log("  ! " + m);

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/demo", { recursive: true });
cpSync("site/assets", "dist/assets", { recursive: true });

/** Copy a validated set of files into dist/demo/<slug>/, enforcing size and extension rules. */
function installFiles(slug, files) {
  let total = 0, count = 0;
  for (const f of files) {
    if (!f.path.startsWith("demo/")) continue;
    const ext = extname(f.path).slice(1).toLowerCase();
    if (!ALLOWED.has(ext)) { warn(`${slug}: dropped ${f.path} (type .${ext} not allowed)`); continue; }
    if (f.data.length > L.maxFileMB * 1048576) { warn(`${slug}: dropped ${f.path} (over ${L.maxFileMB} MB)`); continue; }
    total += f.data.length;
    if (total > L.maxProjectMB * 1048576) { warn(`${slug}: stopped at ${L.maxProjectMB} MB`); break; }
    const out = join("dist/demo", slug, f.path.slice(5));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, f.data); count++;
  }
  return { total, count };
}

function walk(dir, base = dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, base) : [{ path: p.slice(base.length + 1).split("\\").join("/"), data: readFileSync(p) }];
  });
}

const projects = [];
const slugs = new Set();

function addProject(manifest, files, meta) {
  if (slugs.has(manifest.slug)) return warn(`duplicate slug ${manifest.slug}`);
  if (!files.some((f) => f.path === manifest.entry)) return warn(`${manifest.slug}: entry ${manifest.entry} not found`);
  const { total, count } = installFiles(manifest.slug, files);
  if (!count) return warn(`${manifest.slug}: nothing installable`);
  slugs.add(manifest.slug);
  projects.push({ ...manifest, ...meta, bytes: total, files: count });
  console.log(`  + ${manifest.slug} (${count} files, ${(total / 1024).toFixed(0)} KB)`);
}

console.log("local projects");
if (existsSync("local-projects")) {
  for (const d of readdirSync("local-projects")) {
    const root = join("local-projects", d);
    if (!statSync(root).isDirectory() || !existsSync(join(root, "lab.json"))) continue;
    const v = validateManifest(JSON.parse(readFileSync(join(root, "lab.json"), "utf8")), { repoName: d });
    if (!v.ok) { warn(`${d}: ${v.errors.join("; ")}`); continue; }
    addProject(v.manifest, walk(root), { source: "local", repo: "", sha: "", added: v.manifest.date });
  }
}

console.log("pinned org projects");
for (const p of lock.projects.slice(0, L.maxProjects)) {
  if (blocklist.includes(p.repo) || blocklist.includes(p.repo.split("/")[1])) { warn(`${p.repo}: blocklisted`); continue; }
  if (!/^[0-9a-f]{40}$/.test(p.sha) || !/^[\w.-]+\/[\w.-]+$/.test(p.repo)) { warn(`bad lock entry ${p.repo}`); continue; }
  try {
    const r = await fetch(`https://codeload.github.com/${p.repo}/tar.gz/${p.sha}`, { headers: token ? { Authorization: `Bearer ${token}`, "User-Agent": "juskowicz-lab" } : { "User-Agent": "juskowicz-lab" } });
    if (!r.ok) { warn(`${p.repo}@${p.sha.slice(0, 7)}: HTTP ${r.status}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > L.maxTarballMB * 1048576) { warn(`${p.repo}: tarball too large`); continue; }
    const files = readTarGz(buf, { maxBytes: L.maxTarballMB * 1048576 });
    const mf = files.find((f) => f.path === "lab.json");
    if (!mf) { warn(`${p.repo}: no lab.json at ${p.sha.slice(0, 7)}`); continue; }
    const v = validateManifest(JSON.parse(mf.data.toString("utf8")), { repoName: p.repo.split("/")[1] });
    if (!v.ok) { warn(`${p.repo}: ${v.errors.join("; ")}`); continue; }
    if (v.manifest.slug !== p.slug) { warn(`${p.repo}: slug changed since pin`); continue; }
    addProject(v.manifest, files, { source: "org", repo: p.repo, sha: p.sha, added: (p.firstSeen || "").slice(0, 10) });
  } catch (e) { warn(`${p.repo}: ${e.message}`); }
}

projects.sort((a, b) => (b.date || b.added || "").localeCompare(a.date || a.added || ""));
const index = projects.map(({ description, howItWorks, ...p }) => p);
writeFileSync("dist/projects.json", JSON.stringify({ built: new Date().toISOString(), site: cfg.siteName, projects: index }));

// ---- pages
const layout = readFileSync("site/layout.html", "utf8");
const page = ({ title, desc, body, script, depth = 0, bodyClass = "" }) =>
  layout.replaceAll("{{BASE}}", depth < 0 ? "/" : depth ? "../".repeat(depth) : "./").replace("{{TITLE}}", esc(title)).replace("{{DESC}}", esc(desc))
    .replace("{{BODYCLASS}}", bodyClass).replace("{{BODY}}", body).replace("{{SCRIPT}}", script || "");

const jsonForScript = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
writeFileSync("dist/index.html", page({
  title: `${cfg.siteName} - ${cfg.tagline}`, desc: "Experiments built from brand-new research papers by an autonomous AI studio.",
  body: readFileSync("site/index.body.html", "utf8").replace("{{COUNT}}", String(projects.length)),
  script: `<script>window.__LAB__=${jsonForScript({ site: cfg.siteName, projects: index })}</script><script src="assets/home.js" defer></script>`,
  bodyClass: "home",
}));

const projTpl = readFileSync("site/project.body.html", "utf8");
for (const p of projects) {
  const paras = (t) => esc(t).split(/\n{2,}/).map((x) => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("");
  const paper = p.paper ? `<section class="panel"><h3>The paper</h3>${p.paper.title ? `<p class="ptitle">${esc(p.paper.title)}</p>` : ""}${p.paper.authors.length ? `<p class="muted">${esc(p.paper.authors.join(", "))}</p>` : ""}<p class="links">${p.paper.arxiv ? `<a href="https://arxiv.org/abs/${esc(p.paper.arxiv)}" rel="noopener">arXiv:${esc(p.paper.arxiv)}</a>` : ""}${p.paper.url ? `<a href="${esc(p.paper.url)}" rel="noopener">paper page</a>` : ""}</p></section>` : "";
  const body = projTpl
    .replaceAll("{{SLUG}}", esc(p.slug)).replaceAll("{{TITLE}}", esc(p.title)).replaceAll("{{TAGLINE}}", esc(p.tagline))
    .replaceAll("{{ENTRY}}", esc(p.entry.slice(5))).replaceAll("{{KIND}}", esc(p.kind))
    .replace("{{TAGS}}", p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(""))
    .replace("{{PAPER}}", paper)
    .replace("{{NOVELTY}}", p.novelty ? `<section class="panel"><h3>What is new here</h3><p>${esc(p.novelty)}</p></section>` : "")
    .replace("{{ABOUT}}", p.description ? `<section class="panel"><h3>About</h3>${paras(p.description)}</section>` : "")
    .replace("{{HOW}}", p.howItWorks ? `<section class="panel"><h3>How it works</h3>${paras(p.howItWorks)}</section>` : "")
    .replace("{{CONTROLS}}", p.controls ? `<p class="controls"><b>Controls</b> ${esc(p.controls)}</p>` : "")
    .replace("{{META}}", [p.builtBy && `Built by ${esc(p.builtBy)}`, p.date && esc(p.date), p.repo && `<a href="https://github.com/${esc(p.repo)}" rel="noopener">source${p.sha ? " @" + esc(p.sha.slice(0, 7)) : ""}</a>`].filter(Boolean).join(" &middot; "));
  mkdirSync(`dist/p/${p.slug}`, { recursive: true });
  writeFileSync(`dist/p/${p.slug}/index.html`, page({ title: `${p.title} - ${cfg.siteName}`, desc: p.tagline, body, depth: 2, script: `<script src="../../assets/project.js" defer></script>`, bodyClass: "project" }));
}
writeFileSync("dist/404.html", page({ depth: -1, title: "Not found", desc: "", body: `<main class="wrap empty"><h1>Signal lost</h1><p>That experiment is not in the lab (yet). <a href="/">Back to the lab</a></p></main>` }));
writeFileSync("dist/robots.txt", "User-agent: *\nAllow: /\n");
console.log(`done: ${projects.length} project(s)`);
