"use client";

import { useEffect, useState } from "react";
import EditableField from "./EditableField";
import FullCopyButton from "./FullCopyButton";
import HumanEditBar from "./HumanEditBar";
import VerificationStatus from "./VerificationStatus";
import { parseHashtagsInput } from "@/lib/content/reapplyPack";
import { VISION_WORKSPACE_PANEL } from "@/lib/landing/vision2030Styles";

export default function EditablePlaceView({
  place,
  onCopy,
  onChange,
  onSave,
  mobileView = false,
  conciseView = false,
}) {
  const [draft, setDraft] = useState(place);
  const [savedFlash, setSavedFlash] = useState(false);
  const mobileSimple = mobileView || conciseView;

  useEffect(() => {
    setDraft(place);
    setSavedFlash(false);
  }, [place]);

  if (!draft) return null;

  const patch = (partial) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    onChange?.(next);
  };

  const tags = (draft.hashtags || [])
    .map((t) => (String(t).startsWith("#") ? t.slice(1) : t))
    .join(" ");

  return (
    <div className={`space-y-3 ${mobileSimple ? VISION_WORKSPACE_PANEL + " p-3 md:p-4" : ""}`}>
      <HumanEditBar
        onSave={() => {
          onSave?.(draft);
          setSavedFlash(true);
        }}
        saved={savedFlash || draft._edited}
      />
      {!mobileSimple ? (
        <div className="flex justify-end">
          <FullCopyButton
            text={draft.fullCopyText}
            onCopy={() => onCopy?.(draft.fullCopyText)}
          />
        </div>
      ) : null}
      {!mobileSimple ? (
        <VerificationStatus
          verification={draft.qualityReport?.verification}
          factCheck={draft.qualityReport?.factCheck}
        />
      ) : null}
      <EditableField
        label="제목"
        value={draft.title}
        rows={mobileSimple ? 1 : 2}
        onChange={(v) => patch({ title: v })}
      />
      <EditableField
        label="한 줄 공지"
        value={draft.shortNotice || draft.shortBody}
        rows={mobileSimple ? 2 : 2}
        onChange={(v) => patch({ shortNotice: v, shortBody: v })}
      />
      <EditableField
        label="상세 본문"
        value={draft.detailBody || ""}
        rows={mobileSimple ? 8 : 5}
        onChange={(v) =>
          patch({
            detailBody: v,
            body: `${draft.shortNotice || draft.shortBody}\n\n${v}`,
          })
        }
      />
      {!mobileSimple ? (
        <>
          <EditableField
            label="CTA"
            value={draft.cta}
            rows={2}
            onChange={(v) => patch({ cta: v })}
          />
          <EditableField
            label="해시태그"
            value={tags}
            rows={2}
            hint="# 없이 쉼표로 구분"
            onChange={(v) => patch({ hashtags: parseHashtagsInput(v) })}
          />
        </>
      ) : (
        <EditableField
          label="해시태그"
          value={tags}
          rows={2}
          hint="# 없이 쉼표로 구분"
          onChange={(v) => patch({ hashtags: parseHashtagsInput(v) })}
        />
      )}
    </div>
  );
}
