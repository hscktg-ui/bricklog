"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditableField from "@/components/EditableField";
import { useOptionalBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import {
  DETAIL_PAGE_LENGTHS,
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_DEFAULT_ACCENT,
  DETAIL_PAGE_SECTION_LABELS,
} from "@/lib/product/detailPageCatalog";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "@/lib/product/detailPageCompanyPresets";
import {
  DETAIL_PAGE_STANDARD_RULES,
  applyEditedDetailPageSections,
} from "@/lib/product/detailPageStandard";
import {
  DETAIL_PAGE_MAX_PHOTOS,
  listDetailPagePhotoSlots,
  normalizeDetailPagePhotos,
} from "@/lib/product/detailPagePhotos";
import {
  DETAIL_PAGE_ASSET_ROLES,
  assignDetailPageAssetRoles,
} from "@/lib/product/detailPageAssets";
import { DETAIL_PAGE_MALLS } from "@/lib/product/detailPageCompeteWins";
import {
  renderDetailPageBodyHtml,
  wrapDetailPageImageStackHtml,
  wrapMallHtml,
  packToPlainText,
} from "@/lib/product/detailPageHtml";
import {
  applyHeadlineSubhead,
  listDetailPageFixTargets,
} from "@/lib/product/detailPageRevise";
import {
  CHANNEL_WORKSPACE_SHELL,
  CHANNEL_MOBILE_CTA_FOOTER,
  channelFormPaneClass,
  channelFormScrollClass,
  channelResultPaneClass,
} from "@/lib/workspace/channelWorkspaceLayout";
import { VISION_CTA_ACCENT, VISION_INPUT, VISION_SPINNER } from "@/lib/landing/vision2030Styles";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assessDetailPageSuccess } from "@/lib/product/detailPageSuccessStandard";
import {
  captureDetailPageSections,
  captureNodeImage,
  sectionDownloadLabel,
  sectionFileName,
  triggerDataUrlDownloads,
} from "@/components/detailPageCapture";

async function filesToDataUrls(fileList) {
  const files = Array.from(fileList || []);
  const out = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const url = await readAsDataUrl(file);
    out.push({ src: await shrinkDataUrl(url, 1200), caption: "" });
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

function cropHeroDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = Math.min(DETAIL_PAGE_WIDTH, img.width);
      const h = Math.min(980, img.height);
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function FieldGroup({ n, title, hint, children }) {
  return (
    <section className="mt-6" aria-labelledby={`detail-g-${n}`}>
      <h3 id={`detail-g-${n}`} className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold tabular-nums tracking-[0.08em] text-[var(--vision-muted)]">
          {n}
        </span>
        <span className="text-[13px] font-semibold tracking-tight">{title}</span>
      </h3>
      {hint ? (
        <p className="mt-1 text-[12px] leading-snug text-[var(--vision-muted)]">{hint}</p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function DetailPageGenerator({ onCopy, onToast, surface: _surface = "workspace" }) {
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
  const [price, setPrice] = useState("");
  const [options, setOptions] = useState("");
  const [shipping, setShipping] = useState("");
  const [dispatch, setDispatch] = useState("");
  const [producer, setProducer] = useState("");
  const [storage, setStorage] = useState("");
  const [highlights, setHighlights] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [improveNote, setImproveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState("");
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [editing, setEditing] = useState(false);
  const [copiedMall, setCopiedMall] = useState("");
  const [pageImage, setPageImage] = useState("");
  const [sectionImages, setSectionImages] = useState([]);
  const [designerVision, setDesignerVision] = useState(null);
  const photoInputRef = useRef(null);

  const product = CHANNEL_PRODUCTS.detailPage;

  const filledProduct = productName.trim() || activeBrand?.mainKeyword || "";

  const photosNorm = useMemo(
    () => assignDetailPageAssetRoles(normalizeDetailPagePhotos(photos)),
    [photos]
  );

  const previewHtml = useMemo(() => {
    if (!pack) return "";
    return renderDetailPageBodyHtml(pack, photosNorm);
  }, [pack, photosNorm]);

  const successView = useMemo(() => {
    if (!pack) return null;
    return assessDetailPageSuccess({
      pack,
      html: previewHtml,
      photoCount: photosNorm.length,
      input: {
        brandName: pack.brandName,
        pageLength: pack.pageLength,
      },
      screenshots: pageImage ? { hero: pageImage, full: pageImage } : undefined,
      requirePageImage: Boolean(pageImage),
      designerVision,
    });
  }, [pack, previewHtml, photosNorm.length, pageImage, designerVision]);

  useEffect(() => {
    if (!pack || !previewHtml) {
      setPageImage("");
      setSectionImages([]);
      setDesignerVision(null);
      return undefined;
    }
    let cancelled = false;
    setPageImage("");
    setSectionImages([]);
    setDesignerVision(null);
    const timer = setTimeout(() => {
      const article = previewRef.current?.querySelector("article");
      if (!article) return;
      (async () => {
        try {
          const captured = await captureDetailPageSections(article);
          if (cancelled) return;
          const stack = captured.sections || [];
          const heroShot =
            stack.find((item) => item.type === "hero")?.src || stack[0]?.src || "";
          const fullShot = captured.full || heroShot;
          setSectionImages(stack);
          setPageImage(fullShot || heroShot);
          if (!heroShot && !fullShot) {
            setDesignerVision(null);
            return;
          }
          const hero = await cropHeroDataUrl(heroShot || fullShot);
          const data = await fetchWithAuth("/api/content/detail-page", {
            method: "POST",
            timeoutMs: 45_000,
            body: JSON.stringify({
              action: "review-image",
              productName: pack.productName,
              brandName: pack.brandName,
              screenshots: { hero, full: fullShot || hero },
            }),
          });
          if (!cancelled && data?.vision) setDesignerVision(data.vision);
        } catch {
          if (!cancelled) setDesignerVision(null);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pack, previewHtml]);

  const briefInput = useCallback(
    () => ({
      productName: filledProduct,
      topic: filledProduct,
      target,
      searchIntent,
      features,
      highlights,
      mustInclude,
      pageLength,
      accent,
      presetId,
      imageCount: photosNorm.length,
      photos: photosNorm,
      photoCaptions: photosNorm.map((p) => p.caption).filter(Boolean),
      price,
      options,
      shipping,
      dispatch,
      producer,
      storage,
      brandName: activeBrand?.brandName || "",
      brandId: activeBrand?.id || "",
      region: activeBrand?.region || "",
      industry: activeBrand?.industry || "",
      brandDescription: activeBrand?.brandDescription || "",
      phone: activeBrand?.phone || "",
      hours: activeBrand?.hours || "",
      address: activeBrand?.address || "",
      storeFeatures: activeBrand?.storeFeatures || "",
    }),
    [
      filledProduct,
      target,
      searchIntent,
      features,
      highlights,
      mustInclude,
      pageLength,
      accent,
      presetId,
      photosNorm,
      price,
      options,
      shipping,
      dispatch,
      producer,
      storage,
      activeBrand,
    ]
  );

  const photoSlots = useMemo(() => {
    const length = DETAIL_PAGE_LENGTHS[pageLength] || DETAIL_PAGE_LENGTHS.standard;
    return listDetailPagePhotoSlots(length.sectionIds);
  }, [pageLength]);

  const handlePhotos = useCallback(async (event) => {
    try {
      const next = await filesToDataUrls(event.target.files);
      setPhotos((prev) =>
        assignDetailPageAssetRoles(
          normalizeDetailPagePhotos([...prev, ...next])
        ).slice(0, DETAIL_PAGE_MAX_PHOTOS)
      );
      if (event.target) event.target.value = "";
    } catch {
      onToast?.("사진을 읽지 못했습니다.");
    }
  }, [onToast]);

  const handlePhotoDrop = useCallback(async (event) => {
    event.preventDefault();
    try {
      const next = await filesToDataUrls(event.dataTransfer?.files);
      setPhotos((prev) =>
        assignDetailPageAssetRoles(
          normalizeDetailPagePhotos([...prev, ...next])
        ).slice(0, DETAIL_PAGE_MAX_PHOTOS)
      );
    } catch {
      onToast?.("사진을 읽지 못했습니다.");
    }
  }, [onToast]);

  const updatePhotoRole = useCallback((idx, role) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, role } : p))
    );
  }, []);

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
    setHighlights(preset.highlights || "");
    setMustInclude(preset.mustInclude || "");
    setPrice(preset.price || "");
    setOptions(preset.options || "");
    setShipping(preset.shipping || "");
    setDispatch(preset.dispatch || "");
    setProducer(preset.producer || "");
    setStorage(preset.storage || "");
    setPhotos([
      { src: `/detail-sample/${preset.id}-hero.png`, slot: "hero", role: "packshot" },
      { src: `/detail-sample/${preset.id}-observe.png`, slot: "observe", role: "detail" },
      { src: `/detail-sample/${preset.id}-feature.png`, slot: "feature", role: "detail" },
      { src: `/detail-sample/${preset.id}-img-03.png`, slot: "scene", role: "usage" },
    ]);
    setAccent(preset.accent || DETAIL_PAGE_DEFAULT_ACCENT);
    setPageLength(preset.pageLength || "standard");
    setPack(null);
    setCopiedMall("");
    setEditing(false);
  }, []);

  const startBlank = useCallback(() => {
    setPresetId("");
    setProductName("");
    setTarget("");
    setSearchIntent("");
    setFeatures("");
    setHighlights("");
    setMustInclude("");
    setPrice("");
    setOptions("");
    setShipping("");
    setDispatch("");
    setProducer("");
    setStorage("");
    setImproveNote("");
    setAccent(DETAIL_PAGE_DEFAULT_ACCENT);
    setPageLength("standard");
    setPack(null);
    setError("");
    setCopiedMall("");
    setEditing(false);
    setPhotos([]);
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
      const data = await fetchWithAuth("/api/content/detail-page", {
        method: "POST",
        timeoutMs: 180_000,
        body: JSON.stringify(briefInput()),
      });
      if (!data?.ok || !data.pack) {
        throw new Error(data?.userMessage || "상세페이지를 만들지 못했습니다.");
      }
      setPack(data.pack);
      if (Array.isArray(data.shots) && data.shots.length) {
        setPhotos(data.shots);
      }
      setEditing(false);
      setCopiedMall("");
      setImproveNote("");
    } catch (err) {
      setError(err.message || "상세페이지를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [filledProduct, briefInput]);

  const runCatchFixes = useCallback(async () => {
    if (!pack) return;
    setRevising("catch");
    setError("");
    try {
      const data = await fetchWithAuth("/api/content/detail-page", {
        method: "POST",
        timeoutMs: 60_000,
        body: JSON.stringify({ ...briefInput(), action: "catch", pack }),
      });
      if (!data?.ok || !data.pack) {
        throw new Error(data?.userMessage || "수정을 잡지 못했습니다.");
      }
      setPack(data.pack);
      setEditing(false);
      onToast?.("기준에 안 맞는 문장을 정리했습니다.");
    } catch (err) {
      setError(err.message || "수정을 잡지 못했습니다.");
    } finally {
      setRevising("");
    }
  }, [pack, briefInput, onToast]);

  const runImprove = useCallback(async () => {
    if (!pack) return;
    if (!improveNote.trim()) {
      setError("고칠 방향을 한 줄 적어 주세요.");
      return;
    }
    setRevising("improve");
    setError("");
    try {
      const data = await fetchWithAuth("/api/content/detail-page", {
        method: "POST",
        timeoutMs: 90_000,
        body: JSON.stringify({
          ...briefInput(),
          action: "improve",
          pack,
          improveNote,
        }),
      });
      if (!data?.ok || !data.pack) {
        throw new Error(data?.userMessage || "개선하지 못했습니다.");
      }
      setPack(data.pack);
      setEditing(false);
      onToast?.("지시대로 다듬었습니다. 미리보기에서 확인해 주세요.");
    } catch (err) {
      setError(err.message || "개선하지 못했습니다.");
    } finally {
      setRevising("");
    }
  }, [pack, improveNote, briefInput, onToast]);

  const mallImages = useMemo(() => {
    if (sectionImages.length) return sectionImages;
    if (pageImage) return [{ src: pageImage, alt: pack?.productName || "상품" }];
    return [];
  }, [sectionImages, pageImage, pack?.productName]);

  const copyForMall = useCallback(async (mallId) => {
    if (!pack) return;
    const mall = DETAIL_PAGE_MALLS.find((m) => m.id === mallId) || DETAIL_PAGE_MALLS[0];
    const images = mallImages.length
      ? mallImages
      : [{ src: pageImage, alt: pack.productName || "상품" }].filter((item) => item.src);
    const html = images.length
      ? wrapDetailPageImageStackHtml(images, pack, mall.id)
      : "";
    if (!html) {
      onToast?.("상세 이미지가 아직입니다. 잠시 후 다시 저장해 주세요.");
      return;
    }
    await navigator.clipboard.writeText(html);
    setCopiedMall(mall.id);
    onCopy?.(html);
    onToast?.(
      `${mall.label}용 상세 이미지를 복사했습니다. 아래에서 이미지를 올리세요.`
    );
  }, [pack, mallImages, pageImage, onCopy, onToast]);

  const downloadHtml = useCallback(() => {
    if (!pack || !previewHtml) {
      onToast?.("상세가 아직입니다.");
      return;
    }
    const html = wrapMallHtml(previewHtml, pack, "smartstore");
    const slug = (pack.productName || "detail").slice(0, 24);
    downloadText(`${slug}-상세.html`, html, "text/html;charset=utf-8");
  }, [pack, previewHtml, onToast]);

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

  const updateHeadline = useCallback((field, val) => {
    setPack((prev) =>
      applyHeadlineSubhead(
        prev,
        field === "headline" ? val : prev?.headline,
        field === "subhead" ? val : prev?.subhead,
        { brandName: prev?.brandName || activeBrand?.brandName || "" }
      )
    );
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
      const slug = (pack?.productName || "detail").slice(0, 24);
      let images = mallImages.filter((item) => item?.src);
      if (!images.length) {
        const article = previewRef.current?.querySelector("article") || previewRef.current;
        const captured = await captureDetailPageSections(article);
        images = captured.sections.length
          ? captured.sections
          : captured.full
            ? [{ src: captured.full, type: "full" }]
            : [];
        if (captured.sections.length) setSectionImages(captured.sections);
        if (captured.full) setPageImage(captured.full);
      }
      if (!images.length) {
        onToast?.("칸 이미지를 만들지 못했습니다. 아래 화면에서 칸마다 다시 저장해 보세요.");
        return;
      }
      await triggerDataUrlDownloads(
        images.map((img, i) => ({
          src: img.src,
          name: sectionFileName(slug, img.type || "칸", i, img.src),
        }))
      );
      onToast?.(
        images.length === 1
          ? "상세 이미지 1장을 저장했습니다."
          : `칸 ${images.length}장을 저장했습니다. 몰 상세에 위에서부터 올리세요.`
      );
    } catch {
      onToast?.("이미지 저장에 실패했습니다. 칸마다 나눠 저장해 보세요.");
    }
  }, [pack, onToast, mallImages]);

  const downloadOneSection = useCallback(
    async (index) => {
      const slug = (pack?.productName || "detail").slice(0, 24);
      const ready = mallImages[index];
      if (ready?.src) {
        await triggerDataUrlDownloads([
          { src: ready.src, name: sectionFileName(slug, ready.type, index, ready.src) },
        ]);
        onToast?.(`${sectionDownloadLabel(ready.type)} 칸을 저장했습니다.`);
        return;
      }
      const article = previewRef.current?.querySelector("article");
      const node = article?.querySelectorAll(":scope > [data-section]")[index];
      if (!node) {
        onToast?.("이 칸을 찾지 못했습니다.");
        return;
      }
      try {
        const src = await captureNodeImage(node, { maxHeight: 2800 });
        if (!src) throw new Error("empty");
        await triggerDataUrlDownloads([
          { src, name: sectionFileName(slug, node.getAttribute("data-section"), index, src) },
        ]);
        onToast?.(`${sectionDownloadLabel(node.getAttribute("data-section"))} 칸을 저장했습니다.`);
      } catch {
        onToast?.("이 칸 저장에 실패했습니다.");
      }
    },
    [pack, mallImages, onToast]
  );

  const downloadFullPage = useCallback(async () => {
    try {
      if (pageImage && pageImage.length > 8_000) {
        const slug = (pack?.productName || "detail").slice(0, 24);
        await triggerDataUrlDownloads([{ src: pageImage, name: `${slug}-상세-전체.png` }]);
        onToast?.("한 장으로 저장했습니다.");
        return;
      }
      const article = previewRef.current?.querySelector("article");
      const full = await captureNodeImage(article, { maxHeight: 7200 });
      if (!full) {
        onToast?.("한 장으로 담기엔 깁니다. 칸별로 저장하세요.");
        return;
      }
      const slug = (pack?.productName || "detail").slice(0, 24);
      await triggerDataUrlDownloads([{ src: full, name: `${slug}-상세-전체.png` }]);
      onToast?.("한 장으로 저장했습니다.");
    } catch {
      onToast?.("통이미지는 길어서 실패했습니다. 칸별로 저장하세요.");
    }
  }, [pack, pageImage, onToast]);

  return (
    <div className={CHANNEL_WORKSPACE_SHELL} aria-label={product.headerTitle}>
      <aside className={channelFormPaneClass({ width: "wide" })}>
        <div className={channelFormScrollClass("", true)}>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--vision-muted)]">
            {DETAIL_PAGE_PRODUCT.eyebrow} · {DETAIL_PAGE_PRODUCT.place}
          </p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight md:text-[22px]">
            {DETAIL_PAGE_PRODUCT.headline}
            <span className="mt-0.5 block text-[var(--vision-muted)]">
              {DETAIL_PAGE_PRODUCT.headlineBreak}
            </span>
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--vision-muted)] md:text-[14px]">
            {DETAIL_PAGE_PRODUCT.sub}
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

          <FieldGroup
            n={DETAIL_PAGE_PRODUCT.fieldGroups[0].n}
            title={DETAIL_PAGE_PRODUCT.fieldGroups[0].title}
            hint={DETAIL_PAGE_PRODUCT.fieldGroups[0].hint}
          >
            <label className="block text-[13px] font-medium">
              상품명
              <input
                className={VISION_INPUT}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={activeBrand?.mainKeyword || "예: 여주 쌀 10kg"}
              />
            </label>
            <label className="block text-[13px] font-medium">
              특징 · 쓰임 (줄바꿈으로 구분)
              <textarea
                className={`${VISION_INPUT} min-h-[120px] py-3`}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder={"당일 도정\n진공 포장\n여주 수확"}
              />
            </label>
            <label className="block text-[13px] font-medium">
              가격
              <input
                className={VISION_INPUT}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="예: 32,900원"
              />
            </label>
            <label className="block text-[13px] font-medium">
              판매 옵션
              <input
                className={VISION_INPUT}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="예: 10kg / 20kg"
              />
            </label>
            <label className="block text-[13px] font-medium">
              배송비
              <input
                className={VISION_INPUT}
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                placeholder="예: 3,000원 · 3만원 이상 무료"
              />
            </label>
            <label className="block text-[13px] font-medium">
              출고
              <input
                className={VISION_INPUT}
                value={dispatch}
                onChange={(e) => setDispatch(e.target.value)}
                placeholder="예: 평일 오후 2시 이전 주문 당일 출고"
              />
            </label>
            <label className="block text-[13px] font-medium">
              생산자 또는 제조자
              <input
                className={VISION_INPUT}
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="예: 우리쌀가게"
              />
            </label>
            <label className="block text-[13px] font-medium">
              보관
              <input
                className={VISION_INPUT}
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                placeholder="예: 직사광선을 피한 서늘한 곳"
              />
            </label>
            <div>
              <p className="text-[13px] font-medium">
                상품 사진 (최대 {DETAIL_PAGE_MAX_PHOTOS}장)
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
                제품 전체·디테일·사용·구성·치수를 나눠 올립니다. 한글은 사진에 그리지 않습니다. 빈 칸은 포장 앞면만 생성합니다. 가짜 모델컷은 그리지 않습니다.
              </p>
              <ol className="mt-2 grid gap-1 text-[12px] text-[var(--vision-muted)]">
                {photoSlots.slice(0, 3).map((slot) => (
                  <li key={slot.type}>
                    {slot.n} {slot.shot}
                    {slot.hint ? ` · ${slot.hint}` : ""}
                  </li>
                ))}
              </ol>
              <label
                className="mt-2 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--vision-line)] bg-white px-3 py-4 text-center text-[13px] text-[var(--vision-muted)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePhotoDrop}
              >
                사진을 끌어다 놓거나 눌러서 첨부
                <input
                  ref={photoInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                />
              </label>
            </div>
            {photosNorm.length > 0 ? (
              <ul className="space-y-2">
                {photosNorm.map((photo, i) => {
                  const slot = photoSlots[i];
                  return (
                  <li key={`${i}-${photo.src.slice(-18)}`} className="rounded-2xl border border-[var(--vision-line)] bg-white p-2">
                    <div className="flex items-center gap-2">
                      <img src={photo.src} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">
                          {slot ? `${slot.n}. ${slot.shot}` : "남는 사진"}
                        </p>
                        <p className="text-[11px] text-[var(--vision-muted)]">
                          {slot
                            ? `${DETAIL_PAGE_SECTION_LABELS[slot.type] || slot.type} 칸`
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
                          disabled={i === photosNorm.length - 1}
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
                    </div>
                    <label className="mt-2 block text-[11px] text-[var(--vision-muted)]">
                      이 사진의 역할
                      <select
                        className={`${VISION_INPUT} mt-1 min-h-[42px] text-[13px]`}
                        value={photo.role || "packshot"}
                        onChange={(e) => updatePhotoRole(i, e.target.value)}
                      >
                        {DETAIL_PAGE_ASSET_ROLES.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                  );
                })}
              </ul>
            ) : null}
          </FieldGroup>

          <FieldGroup
            n={DETAIL_PAGE_PRODUCT.fieldGroups[1].n}
            title={DETAIL_PAGE_PRODUCT.fieldGroups[1].title}
            hint={DETAIL_PAGE_PRODUCT.fieldGroups[1].hint}
          >
            <label className="block text-[13px] font-medium">
              누가 고르나요
              <input
                className={VISION_INPUT}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="예: 집밥 차리는 손님, 선물용"
              />
            </label>
            <label className="block text-[13px] font-medium">
              고를 때 막히는 점
              <input
                className={VISION_INPUT}
                value={searchIntent}
                onChange={(e) => setSearchIntent(e.target.value)}
                placeholder="예: 스펙은 봤는데, 누워보기 전에 뭘 봐야 할지 모르겠다"
              />
            </label>
          </FieldGroup>

          <FieldGroup
            n={DETAIL_PAGE_PRODUCT.fieldGroups[2].n}
            title={DETAIL_PAGE_PRODUCT.fieldGroups[2].title}
            hint={DETAIL_PAGE_PRODUCT.fieldGroups[2].hint}
          >
            <label className="block text-[13px] font-medium">
              강조 문구 (줄마다 하나)
              <textarea
                className={`${VISION_INPUT} min-h-[88px] py-3`}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder={"여주에서 당일 도정\n진공 포장 그대로 집까지"}
              />
            </label>
            <label className="block text-[13px] font-medium">
              꼭 넣을 내용
              <textarea
                className={`${VISION_INPUT} min-h-[88px] py-3`}
                value={mustInclude}
                onChange={(e) => setMustInclude(e.target.value)}
                placeholder="반드시 넣을 문장·안내. 없는 사실은 쓰지 않습니다."
              />
            </label>
          </FieldGroup>

          <FieldGroup
            n={DETAIL_PAGE_PRODUCT.fieldGroups[3].n}
            title={DETAIL_PAGE_PRODUCT.fieldGroups[3].title}
            hint={DETAIL_PAGE_PRODUCT.fieldGroups[3].hint}
          >
            <div className="flex gap-2">
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
            <label className="flex items-center gap-3 text-[13px] font-medium">
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
          </FieldGroup>

          {error && !pack ? (
            <p className="mt-4 text-[13px] text-red-700">{error}</p>
          ) : null}
        </div>
        <div className={`${CHANNEL_MOBILE_CTA_FOOTER} md:border-t md:bg-white md:px-5 md:py-4`}>
          <button
            type="button"
            className={VISION_CTA_ACCENT}
            disabled={busy}
            onClick={runGenerate}
          >
            {busy ? "만드는 중…" : pack ? "다시 만들기" : product.generateLabel}
          </button>
        </div>
      </aside>

      <section className={channelResultPaneClass()}>
        {!pack && !busy ? (
          <div className="mx-auto flex h-full min-h-[320px] max-w-sm flex-col justify-center text-left">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--vision-muted)]">
              {DETAIL_PAGE_PRODUCT.place}
            </p>
            <p className="mt-2 text-[18px] font-semibold tracking-tight">
              {DETAIL_PAGE_PRODUCT.emptyResult}
            </p>
            <ol className="mt-5 space-y-3">
              {DETAIL_PAGE_PRODUCT.pillars.map((item, i) => (
                <li key={item.title} className="flex gap-3">
                  <span className="text-[11px] font-bold tabular-nums text-[var(--vision-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--vision-muted)]">
                      {item.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {busy ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
            <div className={VISION_SPINNER} aria-hidden />
            <p className="mt-4 text-[15px] text-[var(--vision-muted)]">
              {DETAIL_PAGE_PRODUCT.busyLine}
            </p>
          </div>
        ) : null}
        {pack ? (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {DETAIL_PAGE_MALLS.map((mall) => (
                <button
                  key={mall.id}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
                    copiedMall === mall.id
                      ? "border-[var(--vision-ink)] bg-[var(--vision-ink)] text-white"
                      : "border-[var(--vision-line)] bg-white"
                  }`}
                  onClick={() => copyForMall(mall.id)}
                >
                  {mall.copyLabel}
                </button>
              ))}
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={downloadHtml}>
                이미지 HTML
              </button>
              <button type="button" className="rounded-full border border-[var(--vision-ink)] bg-[var(--vision-ink)] px-4 py-2 text-[13px] font-medium text-white" onClick={downloadPng}>
                칸별로 저장
              </button>
              <button type="button" className="rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium" onClick={downloadFullPage}>
                한 장으로 저장
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
            <p className="mb-3 text-[12px] text-[var(--vision-muted)]">
              {successView?.ok
                ? DETAIL_PAGE_PRODUCT.successOk
                : DETAIL_PAGE_PRODUCT.successNeed}
              {successView?.score != null ? ` · 성공 ${successView.score}` : ""}
              {pack._meta?.sqv?.score != null
                ? ` · ${DETAIL_PAGE_PRODUCT.engineGradeHint} ${pack._meta.sqv.score}`
                : ""}
              {" · "}
              {pack._meta?.mode === "llm"
                ? "GPT-5.6 Sol 1회"
                : pack._meta?.mode === "llm-edited" || pack._meta?.edited
                  ? "문장 수정본"
                  : "기준 초안"}
              {" · "}
              {pack.sections?.length || 0}개 섹션 · {DETAIL_PAGE_WIDTH}px
              {pack._meta?.typePairing?.label
                ? ` · ${pack._meta.typePairing.label}`
                : ""}
            </p>
            {error ? (
              <p className="mb-3 text-[13px] text-red-700">{error}</p>
            ) : null}
            <p className="mb-2 text-[12px] text-[var(--vision-muted)]">
              {designerVision?.looked
                ? `${designerVision.designer?.job || "상세 디자이너"} ${designerVision.designer?.name || ""}이 이 이미지를 봤습니다 · ${designerVision.score}점 · ${designerVision.ok ? "출고 가능" : "재심"}`
                : pageImage
                  ? "상세 이미지를 디자이너가 보는 중…"
                  : `스마트스토어·쿠팡 상세 폭 ${DETAIL_PAGE_WIDTH}px`}
              {photosNorm.length ? ` · 사진 ${photosNorm.length}장` : " · 컷 사진 생성"}
              {mallImages.length
                ? ` · 붙일 칸 ${mallImages.length}장`
                : " · 통이미지가 안 되면 칸마다 저장"}
            </p>
            <div
              ref={previewRef}
              className="mb-5 overflow-x-auto rounded-[1.25rem] border border-[var(--vision-line)] bg-[#efece7] p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            {mallImages.length ? (
              <div className="mb-5 rounded-[1.25rem] border border-[var(--vision-line)] bg-white p-4">
                <p className="text-[13px] font-medium">
                  몰에 올릴 칸
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
                  제디터처럼 860 폭으로 나눕니다. 한 장이 안 되면 칸마다 받아 위에서부터 붙이세요.
                </p>
                <ul className="mt-3 grid gap-2">
                  {mallImages.map((img, i) => (
                    <li
                      key={`${img.type || "sec"}-${i}`}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--vision-line)] px-3 py-2"
                    >
                      <img
                        src={img.src}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">
                          {String(i + 1).padStart(2, "0")} {sectionDownloadLabel(img.type)}
                        </p>
                        <p className="text-[11px] text-[var(--vision-muted)]">
                          {img.fallback ? "상품 사진만" : `${DETAIL_PAGE_WIDTH}px`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-[var(--vision-line)] px-3 py-1.5 text-[12px] font-medium"
                        onClick={() => downloadOneSection(i)}
                      >
                        이 칸만
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {DETAIL_PAGE_MALLS.map((mall) => (
                <ol
                  key={mall.id}
                  className={`rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
                    copiedMall === mall.id
                      ? "border-[var(--vision-ink)] bg-white"
                      : "border-[var(--vision-line)] bg-white"
                  }`}
                >
                  <li className="mb-1 text-[12px] font-medium text-[var(--vision-muted)]">
                    {copiedMall === mall.id ? `복사됨 · ${mall.label}` : mall.label}
                  </li>
                  {mall.steps.map((step, i) => (
                    <li key={step}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              ))}
            </div>
            {successView ? (
              <ul className="mb-4 grid gap-1 text-[12px] text-[var(--vision-muted)]">
                {successView.phases.map((phase) => (
                  <li key={phase.id}>
                    {phase.ok ? "통과" : "미달"} · {phase.weight} {phase.label} · {phase.score}
                    {" · "}
                    {phase.meaning}
                  </li>
                ))}
              </ul>
            ) : pack._meta?.standard ? (
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
            {successView && !successView.ok && successView.hardLabels.length ? (
              <div className="mb-4 rounded-2xl border border-[var(--vision-line)] bg-white px-4 py-3">
                <p className="text-[13px] font-medium">성공 기준에서 빠진 것</p>
                <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                  {successView.hardLabels.join(" · ")}
                </p>
              </div>
            ) : null}
            {listDetailPageFixTargets(pack).length > 0 ? (
              <div className="mb-4 rounded-2xl border border-[var(--vision-line)] bg-white px-4 py-3">
                <p className="text-[13px] font-medium">기준에서 빠진 수정</p>
                <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                  {listDetailPageFixTargets(pack)
                    .map((r) => r.fail)
                    .join(" · ")}
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-full border border-[var(--vision-ink)] bg-[var(--vision-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                  disabled={!!revising}
                  onClick={runCatchFixes}
                >
                  {revising === "catch" ? "정리 중…" : "이 실패 잡기"}
                </button>
              </div>
            ) : null}
            <div className="mb-5 rounded-2xl border border-[var(--vision-line)] bg-white px-4 py-3">
              <p className="text-[13px] font-medium">이렇게 고쳐 주세요</p>
              <textarea
                className={`${VISION_INPUT} min-h-[72px] py-3`}
                value={improveNote}
                onChange={(e) => setImproveNote(e.target.value)}
                placeholder="예: 맨 위 제목을 더 짧게, 쇼룸에서 누워 보는 장면만 강조"
              />
              <button
                type="button"
                className="mt-3 rounded-full border border-[var(--vision-line)] bg-white px-4 py-2 text-[13px] font-medium disabled:opacity-50"
                disabled={!!revising}
                onClick={runImprove}
              >
                {revising === "improve" ? "다듬는 중…" : "지시대로 개선"}
              </button>
            </div>
            {editing ? (
              <div className="mb-5 space-y-3">
                <p className="text-[13px] font-medium">섹션 문장 고치기</p>
                <EditableField
                  label="큰 제목"
                  value={pack.headline}
                  rows={2}
                  onChange={(v) => updateHeadline("headline", v)}
                />
                <EditableField
                  label="한 줄 설명"
                  value={pack.subhead}
                  rows={2}
                  onChange={(v) => updateHeadline("subhead", v)}
                />
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
          </div>
        ) : null}
      </section>
    </div>
  );
}
