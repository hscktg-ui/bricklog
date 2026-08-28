"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import EditableField from "@/components/EditableField";
import { useOptionalBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import {
  DETAIL_PAGE_LENGTHS,
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_DEFAULT_ACCENT,
  DETAIL_PAGE_SECTION_LABELS,
  DETAIL_PAGE_PASTE_STEPS,
} from "@/lib/product/detailPageCatalog";
import { DETAIL_PAGE_COMPANY_PRESETS, DETAIL_PAGE_OPEN_EXAMPLES } from "@/lib/product/detailPageCompanyPresets";
import {
  DETAIL_PAGE_STANDARD_RULES,
  applyEditedDetailPageSections,
} from "@/lib/product/detailPageStandard";
import {
  DETAIL_PAGE_MAX_PHOTOS,
  listDetailPagePhotoSlots,
} from "@/lib/product/detailPagePhotos";
import { renderDetailPageBodyHtml, wrapSmartstoreHtml, packToPlainText } from "@/lib/product/detailPageHtml";
import {
  CHANNEL_WORKSPACE_SHELL,
  channelFormPaneClass,
  channelFormScrollClass,
  channelResultPaneClass,
} from "@/lib/workspace/channelWorkspaceLayout";
import { VISION_CTA_ACCENT, VISION_INPUT } from "@/lib/landing/vision2030Styles";

async function filesToDataUrls(fileList) {
  const files = Array.from(fileList || []).slice(0, DETAIL_PAGE_MAX_PHOTOS);
  const out = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const url = await readAsDataUrl(file);
    out.push(await shrinkDataUrl(url, 1200));
  }
  return out;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function shrinkDataUrl(dataUrl, maxEdge) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPreviewPng(node, filename) {
  if (!node) return;
  const width = DETAIL_PAGE_WIDTH;
  const height = Math.max(node.scrollHeight, node.offsetHeight);
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px">${node.outerHTML}</div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) {
          reject(new Error("png_failed"));
          return;
        }
        const href = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(href);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg_draw_failed"));
    };
    img.src = url;
  });
}

export default function DetailPageGenerator({ onCopy, onToast }) {
  const workspace = useOptionalBrandWorkspace();
  const activeBrand = workspace?.activeBrand;
  const previewRef = useRef(null);
  const [productName, setProductName] = useState("");
  const [target, setTarget] = useState("");
  const [searchIntent, setSearchIntent] = useState("");
  const [features, setFeatures] = useState("");
  const [pageLength, setPageLength] = useState("standard");
  const [accent, setAccent] = useState(DETAIL_PAGE_DEFAULT_ACCENT);
  const [presetId, setPresetId] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const product = CHANNEL_PRODUCTS.detailPage;

  const filledProduct = productName.trim() || activeBrand?.mainKeyword || "";

  const previewHtml = useMemo(() => {
    if (!pack) return "";
    return renderDetailPageBodyHtml(pack, photos);
  }, [pack, photos]);

  const photoSlots = useMemo(() => {
    const length = DETAIL_PAGE_LENGTHS[pageLength] || DETAIL_PAGE_LENGTHS.standard;
    return listDetailPagePhotoSlots(length.sectionIds);
  }, [pageLength]);

  const handlePhotos = useCallback(async (event) => {
    try {
      const next = await filesToDataUrls(event.target.files);
      setPhotos(next);
    } catch {
      onToast?.("사진을 읽지 못했습니다.");
    }
  }, [onToast]);

  const movePhoto = useCallback((idx, dir) => {
    setPhotos((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);

  const removePhoto = useCallback((idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const applyPreset = useCallback((preset) => {
    setPresetId(preset.id);
    setProductName(preset.productName);
    setTarget(preset.target);
    setSearchIntent(preset.searchIntent || "");
    setFeatures(preset.features);
    setAccent(preset.accent || DETAIL_PAGE_DEFAULT_ACCENT);
    setPageLength(preset.pageLength || "standard");
    setPack(null);
    setCopied(false);
    setEditing(false);
  }, []);

  const startBlank = useCallback(() => {
    setPresetId("");
    setProductName("");
    setTarget("");
    setSearchIntent("");
    setFeatures("");
    setAccent(DETAIL_PAGE_DEFAULT_ACCENT);
    setPageLength("standard");
    setPack(null);
    setError("");
    setCopied(false);
    setEditing(false);
  }, []);

  const runGenerate = useCallback(async () => {
    const name = filledProduct;
    if (!name) {
      setError("상품명을 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        productName: name,
        topic: name,
        target,
        searchIntent,
        features,
        pageLength,
        accent,
        presetId,
        imageCount: photos.length,
        brandName: activeBrand?.brandName || "",
        brandId: activeBrand?.id || "",
        region: activeBrand?.region || "",
        industry: activeBrand?.industry || "",
        brandDescription: activeBrand?.brandDescription || "",
        phone: activeBrand?.phone || "",
        hours: activeBrand?.hours || "",
        address: activeBrand?.address || "",
        storeFeatures: activeBrand?.storeFeatures || "",
      };
      const data = await fetchWithAuth("/api/content/detail-page", {
        method: "POST",
        timeoutMs: 90_000,
        body: JSON.stringify(payload),
      });
      if (!data?.ok || !data.pack) {
        throw new Error(data?.userMessage || "상세페이지를 만들지 못했습니다.");
      }
      setPack(data.pack);
      setEditing(false);
      setCopied(false);
    } catch (err) {
      setError(err.message || "상세페이지를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [
    filledProduct,
    target,
    searchIntent,
    features,
    presetId,
    pageLength,
    accent,
    photos.length,
    activeBrand,
  ]);

  const copyHtml = useCallback(async () => {
    if (!pack) return;
    const html = wrapSmartstoreHtml(renderDetailPageBodyHtml(pack, photos));
    await navigator.clipboard.writeText(html);
    setCopied(true);
    onCopy?.(html);
    onToast?.("HTML을 복사했습니다. 아래 순서로 붙여넣으세요.");
  }, [pack, photos, onCopy, onToast]);

  const downloadHtml = useCallback(() => {
    if (!pack) return;
    const html = wrapSmartstoreHtml(renderDetailPageBodyHtml(pack, photos));
    const slug = (pack.productName || "detail").slice(0, 24);
    downloadText(`${slug}-상세.html`, html, "text/html;charset=utf-8");
  }, [pack, photos]);

  const downloadTxt = useCallback(() => {
    if (!pack) return;
    downloadText(
      `${(pack.productName || "detail").slice(0, 24)}-상세.txt`,
      packToPlainText(pack),
      "text/plain;charset=utf-8"
    );
  }, [pack]);

  const updateSection = useCallback((idx, field, val) => {
    setPack((prev) => {
      if (!prev?.sections) return prev;
      const sections = prev.sections.map((s, i) => {
        if (i !== idx) return s;
        if (field === "title") return { ...s, title: val, heading: val };
        if (field === "body") return { ...s, body: val };
        if (field === "kicker") return { ...s, kicker: val };
        if (field === "bulletText") return { ...s, bullets: val };
        if (field === "rowText") return { ...s, rows: val };
        return { ...s, [field]: val };
      });
      return applyEditedDetailPageSections(prev, sections, {
        brandName: prev.brandName || activeBrand?.brandName || "",
      });
    });
  }, [activeBrand]);

  const removeSection = useCallback((idx) => {
    setPack((prev) => {
      if (!prev?.sections || prev.sections.length <= 4) return prev;
      return applyEditedDetailPageSections(
        prev,
        prev.sections.filter((_, i) => i !== idx),
        { brandName: prev.brandName || activeBrand?.brandName || "" }
      );
    });
  }, [activeBrand]);

  const downloadPng = useCallback(async () => {
    try {
      await downloadPreviewPng(
        previewRef.current?.querySelector("article") || previewRef.current,
        `${(pack?.productName || "detail").slice(0, 24)}-상세.png`
      );
    } catch {
      onToast?.("PNG 저장에 실패했습니다. HTML을 복사해 주세요.");
    }
  }, [pack, onToast]);

  return (
    <div className={CHANNEL_WORKSPACE_SHELL} aria-label={product.headerTitle}>
      <aside className={channelFormPaneClass({ width: "wide" })}>
        <div className={channelFormScrollClass("", true)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-muted)]">
            상품 상세
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
            {product.emptyTitle}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--vision-muted)]">
            {product.emptyDesc}
          </p>

          <p className="mt-5 text-[12px] font-medium text-[var(--vision-muted)]">
            바로 채워보기
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startBlank}
              className={`min-h-[40px] rounded-full border px-3 text-[13px] font-medium ${
                !presetId
                  ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                  : "border-[var(--vision-line)] bg-white"
              }`}
            >
              내 상품으로
            </button>
            {DETAIL_PAGE_OPEN_EXAMPLES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`min-h-[40px] rounded-full border px-3 text-[13px] font-medium ${
                  presetId === preset.id
                    ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                    : "border-[var(--vision-line)] bg-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <details className="mt-4 rounded-2xl border border-[var(--vision-line)] bg-white px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-medium">
              해신·BRICLOG·HOME100 양식
            </summary>
            <div className="mt-2 flex flex-col gap-2 pb-1">
              {DETAIL_PAGE_COMPANY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`min-h-[44px] rounded-2xl border px-3 py-2 text-left text-[13px] leading-snug ${
                    presetId === preset.id
                      ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                      : "border-[var(--vision-line)] bg-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </details>

          <label className="mt-5 block text-[13px] font-medium">
            상품명
            <input
              className={VISION_INPUT}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={activeBrand?.mainKeyword || "예: 여주 쌀 10kg"}
            />
          </label>
          <label className="mt-4 block text-[13px] font-medium">
            누가 고르나요
            <input
              className={VISION_INPUT}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="예: 집밥 차리는 손님, 선물용"
            />
          </label>
          <label className="mt-4 block text-[13px] font-medium">
            고를 때 막히는 점
            <input
              className={VISION_INPUT}
              value={searchIntent}
              onChange={(e) => setSearchIntent(e.target.value)}
              placeholder="예: 스펙은 봤는데, 누워보기 전에 뭘 봐야 할지 모르겠다"
            />
          </label>
          <label className="mt-4 block text-[13px] font-medium">
            특징 · 쓰임 (줄바꿈으로 구분)
            <textarea
              className={`${VISION_INPUT} min-h-[120px] py-3`}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"당일 도정\n진공 포장\n여주 수확"}
            />
          </label>
          <label className="mt-4 block text-[13px] font-medium">
            상품 사진 (최대 {DETAIL_PAGE_MAX_PHOTOS}장, 위부터 배치)
            <input
              className="mt-2 block w-full text-[13px]"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotos}
            />
          </label>
          {photos.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {photos.map((src, i) => (
                <li key={`${i}-${src.slice(-12)}`} className="flex items-center gap-2">
                  <img src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">
                      {i + 1}. {photoSlots[i]?.label || "남는 사진"}
                    </p>
                    <p className="text-[11px] text-[var(--vision-muted)]">
                      {photoSlots[i]
                        ? `${DETAIL_PAGE_SECTION_LABELS[photoSlots[i].type] || photoSlots[i].type} 칸`
                        : "맨 아래 모아 붙임"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--vision-line)] px-2 py-1 text-[11px]"
                      onClick={() => movePhoto(i, -1)}
                      disabled={i === 0}
                    >
                      위
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[var(--vision-line)] px-2 py-1 text-[11px]"
                      onClick={() => movePhoto(i, 1)}
                      disabled={i === photos.length - 1}
                    >
                      아래
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[var(--vision-line)] px-2 py-1 text-[11px]"
                      onClick={() => removePhoto(i)}
                    >
                      빼기
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex gap-2">
            {Object.values(DETAIL_PAGE_LENGTHS).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPageLength(opt.id)}
                className={`min-h-[40px] flex-1 rounded-full border px-3 text-[13px] font-medium ${
                  pageLength === opt.id
                    ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                    : "border-[var(--vision-line)] bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-3 text-[13px] font-medium">
            포인트 색
            <input
              type="color"
              value={accent}
              onChange={(e) => {
                const next = e.target.value;
                setAccent(next);
                setPack((prev) => (prev ? { ...prev, accent: next } : prev));
              }}
              className="h-9 w-12 cursor-pointer rounded border border-[var(--vision-line)]"
            />
          </label>

          {error ? (
            <p className="mt-4 text-[13px] text-red-700">{error}</p>
          ) : null}

          <button
            type="button"
            className={`${VISION_CTA_ACCENT} mt-5`}
            disabled={busy}
            onClick={runGenerate}
          >
            {busy ? "만드는 중…" : "상세페이지 만들기"}
          </button>
        </div>
      </aside>

      <section className={channelResultPaneClass()}>
        {!pack && !busy ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
            <Icon name="bag" className="h-8 w-8 text-[var(--vision-muted)]" />
            <p className="mt-3 text-[15px] text-[var(--vision-muted)]">
              상품명과 특징만 있으면 됩니다. 사진은 선택입니다.
            </p>
          </div>
        ) : null}
        {busy ? (
          <p className="text-[15px] text-[var(--vision-muted)]">
            상품명과 특징으로 상세페이지를 맞추고 있습니다.
          </p>
        ) : null}
        {pack ? (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={copyHtml}>
                HTML 복사
              </button>
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={downloadHtml}>
                HTML 저장
              </button>
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={downloadPng}>
                PNG 저장
              </button>
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={downloadTxt}>
                텍스트
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
                  editing
                    ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                    : "border-[var(--vision-line)] bg-white"
                }`}
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "미리보기만" : "문장 고치기"}
              </button>
            </div>
            <ol
              className={`mb-4 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
                copied
                  ? "border-[var(--vision-ink)] bg-white"
                  : "border-[var(--vision-line)] bg-white"
              }`}
            >
              <li className="mb-1 text-[12px] font-medium text-[var(--vision-muted)]">
                {copied ? "복사됨 · 붙여넣기" : "스토어에 붙이는 순서"}
              </li>
              {DETAIL_PAGE_PASTE_STEPS.map((step, i) => (
                <li key={step}>
                  {i + 1}. {step}
                </li>
              ))}
            </ol>
            <p className="mb-3 text-[12px] text-[var(--vision-muted)]">
              {pack._meta?.mode === "llm"
                ? "GPT-5.6 Sol 1회"
                : pack._meta?.mode === "llm-edited" || pack._meta?.edited
                  ? "문장 수정본"
                  : "기준 초안"}
              {" · "}
              {pack._meta?.standard?.ok ? "브릭로그 기준 통과" : "기준 보완 필요"}
              {" · "}
              {pack.sections?.length || 0}개 섹션 · {DETAIL_PAGE_WIDTH}px
            </p>
            {pack._meta?.standard ? (
              <ul className="mb-4 grid gap-1 text-[12px] text-[var(--vision-muted)]">
                {DETAIL_PAGE_STANDARD_RULES.map((rule) => {
                  const passed = pack._meta.standard.rules
                    ? pack._meta.standard.rules[rule.id]
                    : pack._meta.standard.ok;
                  return (
                    <li key={rule.id}>
                      {passed ? "통과" : "실패"} · {rule.label}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {editing ? (
              <div className="mb-5 space-y-3">
                <p className="text-[13px] font-medium">섹션 문장 고치기</p>
                {(pack.sections || []).map((section, idx) => (
                  <div key={`${section.type}-${idx}`} className="space-y-2">
                    <EditableField
                      label={`${idx + 1}. ${DETAIL_PAGE_SECTION_LABELS[section.type] || section.type}`}
                      value={section.title}
                      rows={2}
                      onChange={(v) => updateSection(idx, "title", v)}
                      onDelete={
                        (pack.sections?.length || 0) > 4
                          ? () => removeSection(idx)
                          : undefined
                      }
                    />
                    <EditableField
                      label="본문"
                      value={section.body}
                      rows={4}
                      onChange={(v) => updateSection(idx, "body", v)}
                    />
                    {(section.type === "usp" ||
                      section.type === "feature" ||
                      (section.bullets || []).length > 0) ? (
                      <EditableField
                        label="항목 (줄마다 하나)"
                        value={(section.bullets || []).join("\n")}
                        rows={4}
                        onChange={(v) => updateSection(idx, "bulletText", v)}
                      />
                    ) : null}
                    {section.type === "spec" ? (
                      <EditableField
                        label="표 (항목: 값)"
                        value={(section.rows || [])
                          .map((r) => (Array.isArray(r) ? `${r[0]}: ${r[1]}` : ""))
                          .filter(Boolean)
                          .join("\n")}
                        rows={5}
                        onChange={(v) => updateSection(idx, "rowText", v)}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mb-2 text-[12px] text-[var(--vision-muted)]">
              스마트스토어 상세 폭 {DETAIL_PAGE_WIDTH}px
              {photos.length ? ` · 사진 ${photos.length}장 배치` : " · 사진 없음"}
            </p>
            <div
              ref={previewRef}
              className="overflow-x-auto rounded-[1.25rem] border border-[var(--vision-line)] bg-[#efece7] p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
