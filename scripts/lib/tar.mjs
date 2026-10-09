// Minimal, defensive tar reader (GitHub tarballs). No symlinks, no traversal; returns regular files only.
import { gunzipSync } from "node:zlib";

export function readTarGz(buf, { maxBytes = 120 * 1024 * 1024 } = {}) {
  const tar = gunzipSync(buf, { maxOutputLength: maxBytes });
  const files = [];
  let off = 0, nextName = null;
  const text = (b, s, e) => b.toString("utf8", s, e).replace(/\0.*$/s, "");
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512);
    if (h.every((x) => x === 0)) break;
    let name = text(h, 0, 100);
    const prefix = text(h, 345, 500);
    if (prefix) name = prefix + "/" + name;
    const size = parseInt(text(h, 124, 136).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    off += 512;
    const body = tar.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;
    if (type === "x") { // pax header: look for path=
      const m = /\d+ path=([^\n]+)\n/.exec(body.toString("utf8")); if (m) nextName = m[1]; continue;
    }
    if (type === "g") continue;
    if (type === "L") { nextName = body.toString("utf8").replace(/\0.*$/s, ""); continue; }
    if (nextName) { name = nextName; nextName = null; }
    if (type !== "0" && type !== "\0") continue; // skip dirs, symlinks, hardlinks, devices
    const parts = name.split("/");
    parts.shift(); // strip the <repo>-<sha>/ root
    const rel = parts.join("/");
    if (!rel || rel.split("/").some((p) => p === ".." || p === "" || p === ".")) continue;
    files.push({ path: rel, data: Buffer.from(body) });
  }
  return files;
}
