"use client";

import { useEffect, useState } from "react";
import EditableField from "./EditableField";
import FullCopyButton from "./FullCopyButton";
import HumanEditBar from "./HumanEditBar";
import VerificationStatus from "./VerificationStatus";
import { parseHashtagsInput } from "@/lib/content/reapplyPack";
import { VISION_WORKSPACE_PANEL } from "@/lib/landing/vision2030Styles";

export default function EditableInstaView({
  insta,
  onCopy,
  onChange,
  onSave,
  mobileView = false,
  conciseView = false,
}) {
  const [draft, setDraft] = useState(insta);
  const [savedFlash, setSavedFlash] = useState(false);
  const mobileSimple = mobileView || conciseView;

  useEffect(() => {
    setDraft(insta);
    setSavedFlash(false);
  }, [insta]);

  if (!draft) return null;

  const patch = (partial) => {
    const next = { ...draft, ...partial };
    if (next.hook !== undefined || next.body !== undefined || next.ending !== undefined) {
      const parts = [next.hook, next.body, next.ending].filter(Boolean);
      next.lineBreakBody = parts.join("\n\n");
    }
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
        label="Hook (첫 줄)"
        value={draft.hook}
        rows={2}
        onChange={(v) => patch({ hook: v })}
      />
      <EditableField
        label="본문"
        value={draft.body}
        rows={mobileSimple ? 10 : 8}
        hint="줄바꿈은 빈 줄로 구분"
        onChange={(v) => patch({ body: v })}
      />
      {!mobileSimple ? (
        <EditableField
          label="마무리"
          value={draft.ending}
          rows={2}
          onChange={(v) => patch({ ending: v })}
        />
      ) : null}
      <EditableField
        label="해시태그"
        value={tags}
        rows={2}
        hint="# 없이 쉼표로 구분"
        onChange={(v) => patch({ hashtags: parseHashtagsInput(v) })}
      />
    </div>
  );
}
