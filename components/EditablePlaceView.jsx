"use client";

import { useEffect, useState } from "react";
import EditableField from "./EditableField";
import FullCopyButton from "./FullCopyButton";
import HumanEditBar from "./HumanEditBar";
import VerificationStatus from "./VerificationStatus";
import { parseHashtagsInput } from "@/lib/content/reapplyPack";

export default function EditablePlaceView({
  place,
  onCopy,
  onChange,
  onSave,
}) {
  const [draft, setDraft] = useState(place);
  const [savedFlash, setSavedFlash] = useState(false);

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
    <div className="space-y-3">
      <HumanEditBar
        onSave={() => {
          onSave?.(draft);
          setSavedFlash(true);
        }}
        saved={savedFlash || draft._edited}
      />
      <div className="flex justify-end">
        <FullCopyButton
          text={draft.fullCopyText}
          onCopy={() => onCopy?.(draft.fullCopyText)}
        />
      </div>
      <VerificationStatus
        verification={draft.qualityReport?.verification}
        factCheck={draft.qualityReport?.factCheck}
      />
      <EditableField
        label="제목"
        value={draft.title}
        rows={2}
        onChange={(v) => patch({ title: v })}
      />
      <EditableField
        label="한 줄 공지"
        value={draft.shortNotice || draft.shortBody}
        rows={2}
        onChange={(v) => patch({ shortNotice: v, shortBody: v })}
      />
      <EditableField
        label="상세 본문"
        value={draft.detailBody || ""}
        rows={5}
        onChange={(v) => patch({ detailBody: v, body: `${draft.shortNotice || draft.shortBody}\n\n${v}` })}
      />
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
        onChange={(v) => patch({ hashtags: parseHashtagsInput(v) })}
      />
    </div>
  );
}
