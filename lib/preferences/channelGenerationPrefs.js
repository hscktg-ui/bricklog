const STORAGE_KEY = "briclog-workspace-gen-prefs-v1";

const DEFAULTS = {
  blog: { blogOnly: false },
  place: { preferStandalone: true },
  insta: { preferStandalone: true },
  image: { preferStandalone: true },
};

function readAll() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      blog: { ...DEFAULTS.blog, ...parsed.blog },
      place: { ...DEFAULTS.place, ...parsed.place },
      insta: { ...DEFAULTS.insta, ...parsed.insta },
      image: { ...DEFAULTS.image, ...parsed.image },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeAll(all) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/** @param {'blog'|'place'|'insta'|'image'} channel */
export function loadChannelGenPref(channel) {
  return readAll()[channel] || DEFAULTS[channel];
}

/** @param {'blog'|'place'|'insta'|'image'} channel */
export function saveChannelGenPref(channel, partial) {
  const all = readAll();
  all[channel] = { ...all[channel], ...partial };
  writeAll(all);
}

/** @deprecated use loadChannelGenPref('blog').blogOnly */
export function loadBlogOnlyPref() {
  return loadChannelGenPref("blog").blogOnly !== false;
}

/** @deprecated use saveChannelGenPref('blog', { blogOnly }) */
export function saveBlogOnlyPref(blogOnly) {
  saveChannelGenPref("blog", { blogOnly: !!blogOnly });
}
