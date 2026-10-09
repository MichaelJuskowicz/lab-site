// Strict validation of a project's lab.json. Everything coming from another repo is untrusted data.
const KINDS = ["demo", "tool", "game", "viz", "other"];
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateManifest(raw, { repoName = "" } = {}) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["lab.json is not an object"] };
  const slug = str(raw.slug || repoName, 41).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) errors.push("slug must be 2-41 chars: a-z, 0-9, hyphen");
  const title = str(raw.title, 80);
  if (title.length < 2) errors.push("title missing");
  const tagline = str(raw.tagline, 160);
  if (tagline.length < 4) errors.push("tagline missing");
  const kind = KINDS.includes(raw.kind) ? raw.kind : "demo";
  const tags = (Array.isArray(raw.tags) ? raw.tags : []).map((t) => str(t, 24).toLowerCase()).filter((t) => /^[a-z0-9][a-z0-9 -]*$/.test(t)).slice(0, 6);
  const entry = str(raw.entry || "demo/index.html", 200);
  if (!/^demo\/[A-Za-z0-9_./-]+$/.test(entry) || entry.includes("..")) errors.push("entry must be a path inside demo/");
  const thumb = raw.thumbnail ? str(raw.thumbnail, 200) : "";
  if (thumb && (!/^demo\/[A-Za-z0-9_./-]+$/.test(thumb) || thumb.includes(".."))) errors.push("thumbnail must be a path inside demo/");
  let paper = null;
  if (raw.paper && typeof raw.paper === "object") {
    const arxiv = str(raw.paper.arxiv, 20);
    paper = {
      title: str(raw.paper.title, 220),
      arxiv: /^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})$/.test(arxiv) ? arxiv : "",
      authors: (Array.isArray(raw.paper.authors) ? raw.paper.authors : []).map((a) => str(a, 60)).filter(Boolean).slice(0, 8),
      url: /^https:\/\/[^\s"'<>]+$/.test(str(raw.paper.url, 300)) ? str(raw.paper.url, 300) : "",
    };
    if (!paper.title && !paper.arxiv) paper = null;
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    manifest: {
      slug, title, tagline, kind, tags, entry, thumbnail: thumb,
      description: str(raw.description, 3000),
      novelty: str(raw.novelty, 400),
      howItWorks: str(raw.howItWorks, 1500),
      controls: str(raw.controls, 300),
      builtBy: str(raw.builtBy, 80),
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.date, 10)) ? raw.date : "",
      paper,
    },
  };
}
