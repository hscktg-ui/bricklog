/**
 * 몰 붙여넣기용 캡처. 통이미지(한 장)가 실패하면 칸별로 나눈다.
 * 제디터·미리캔버스와 같이 860 폭 섹션 PNG/JPEG.
 */
import { DETAIL_PAGE_WIDTH, DETAIL_PAGE_SECTION_LABELS } from "@/lib/product/detailPageCatalog";

export function sectionDownloadLabel(type) {
  return DETAIL_PAGE_SECTION_LABELS[type] || type || "칸";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img_load_failed"));
    img.src = src;
  });
}

async function srcToDataUrl(src) {
  if (!src || String(src).startsWith("data:")) return src;
  try {
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return src;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

async function inlineImages(root) {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || img.currentSrc || "";
      const data = await srcToDataUrl(src);
      if (data) img.setAttribute("src", data);
    })
  );
}

function paintCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

async function captureViaSvg(node, width, height) {
  const clone = node.cloneNode(true);
  await inlineImages(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;background:#ffffff">${clone.outerHTML}</div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const { canvas, ctx } = paintCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function captureViaHtml2Canvas(node, width, height) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(node, {
    width,
    height,
    windowWidth: width,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: false,
    scale: 1,
    logging: false,
    imageTimeout: 8_000,
  });
}

function canvasToDataUrl(canvas, type = "png") {
  if (!canvas || canvas.width < 8 || canvas.height < 8) return "";
  if (type === "jpeg") {
    return canvas.toDataURL("image/jpeg", 0.92);
  }
  const png = canvas.toDataURL("image/png");
  if (png.length > 2_400_000) {
    return canvas.toDataURL("image/jpeg", 0.9);
  }
  return png;
}

export async function captureNodeImage(node, { maxHeight = 2400, type = "png" } = {}) {
  if (!node) return "";
  const width = DETAIL_PAGE_WIDTH;
  const measured = Math.ceil(
    Math.max(node.scrollHeight, node.offsetHeight, node.getBoundingClientRect().height || 0)
  );
  const height = Math.min(Math.max(measured, 1), maxHeight);
  if (height < 8) return "";
  let canvas = null;
  try {
    canvas = await captureViaHtml2Canvas(node, width, height);
  } catch {
    try {
      canvas = await captureViaSvg(node, width, height);
    } catch {
      canvas = null;
    }
  }
  if (!canvas) return "";
  return canvasToDataUrl(canvas, type);
}

function photoFallback(child) {
  const img = child.querySelector("img");
  const src = img?.currentSrc || img?.src || "";
  if (!src) return null;
  return {
    src,
    type: child.getAttribute("data-section") || "block",
    alt: img.alt || "상품",
    fallback: true,
  };
}

export async function captureDetailPageSections(article) {
  if (!article) return { sections: [], full: "" };
  const kids = [...article.querySelectorAll(":scope > [data-section]")];
  const sections = [];
  for (const child of kids.length ? kids : [...article.children]) {
    try {
      const src = await captureNodeImage(child, { maxHeight: 2800 });
      if (src && src.length > 2_400) {
        sections.push({
          src,
          type: child.getAttribute("data-section") || "block",
          alt: (child.querySelector("h1, h2")?.textContent || "상세 칸").trim(),
        });
        continue;
      }
    } catch {
      /* fallback below */
    }
    const shot = photoFallback(child);
    if (shot) sections.push(shot);
  }
  let full = "";
  const tall = Math.max(article.scrollHeight, article.offsetHeight);
  if (tall <= 7200) {
    try {
      full = await captureNodeImage(article, { maxHeight: 7200 });
      if (full && full.length < 8_000) full = "";
    } catch {
      full = "";
    }
  }
  return { sections, full };
}

export function triggerDataUrlDownloads(files, delayMs = 420) {
  return (async () => {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const a = document.createElement("a");
      a.href = file.src;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (i < files.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  })();
}

export function sectionFileName(slug, type, index, src = "") {
  const ext = String(src).startsWith("data:image/jpeg") ? "jpg" : "png";
  const label = String(type || "칸").replace(/[^\w가-힣-]+/g, "");
  return `${slug}-${String(index).padStart(2, "0")}-${label || "칸"}.${ext}`;
}
