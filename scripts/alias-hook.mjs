import { pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";

const root = pathResolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function resolveFilePath(basePath) {
  if (!existsSync(basePath)) return null;
  try {
    if (statSync(basePath).isFile()) return basePath;
    if (statSync(basePath).isDirectory()) {
      const idx = pathResolve(basePath, "index.js");
      return existsSync(idx) ? idx : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(js|mjs|cjs|json)$/.test(specifier)
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = pathResolve(dirname(parentPath), specifier);
    const hit =
      resolveFilePath(`${base}.js`) ||
      resolveFilePath(base);
    if (hit) {
      return nextResolve(pathToFileURL(hit).href, context);
    }
  }

  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }
  const rel = specifier.slice(2);
  const candidates = [
    pathResolve(root, rel),
    pathResolve(root, `${rel}.js`),
    pathResolve(root, rel, "index.js"),
  ];
  let hit = candidates.find((p) => {
    if (!existsSync(p)) return false;
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });
  const dirPath = pathResolve(root, rel);
  if (!hit && existsSync(dirPath)) {
    try {
      if (statSync(dirPath).isDirectory()) {
        const idx = pathResolve(dirPath, "index.js");
        if (existsSync(idx)) hit = idx;
      }
    } catch {
      /* ignore */
    }
  }
  if (!hit) {
    return nextResolve(specifier, context);
  }
  return nextResolve(pathToFileURL(hit).href, context);
}
