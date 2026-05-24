"use client";

import { useMemo } from "react";
import { buildLocationIntel } from "@/lib/location/locationIntelligence";

const OPTIONS = [
  { key: "includeAddress", label: "주소 포함" },
  { key: "includePhone", label: "연락처 포함" },
  { key: "includeHours", label: "운영시간 포함" },
  { key: "includeParking", label: "주차 포함" },
  { key: "locationBlock", label: "본문 하단 정보 블록" },
];

export default function LocationIntelPanel({ values, onChange }) {
  const intel = useMemo(
    () =>
      buildLocationIntel({
        region: values.region,
        brandName: values.brandName,
        address: values.address,
        phone: values.phone,
        hours: values.hours,
        parking: values.parking,
      }),
    [
      values.region,
      values.brandName,
      values.address,
      values.phone,
      values.hours,
      values.parking,
    ]
  );

  const setOpt = (key, val) => onChange({ ...values, [key]: val });

  return (
    <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-3 space-y-3">
      <p className="text-[12px] font-semibold text-[#4E5968]">위치 정보 (확인된 것만)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-lg border border-[#E8EBED] px-2 py-1.5 text-[12px]"
          placeholder="주소 (확인 시)"
          value={values.address || ""}
          onChange={(e) => setOpt("address", e.target.value)}
        />
        <input
          className="rounded-lg border border-[#E8EBED] px-2 py-1.5 text-[12px]"
          placeholder="전화 (확인 시)"
          value={values.phone || ""}
          onChange={(e) => setOpt("phone", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.key}
            className="flex items-center gap-1.5 text-[11px] text-[#4E5968]"
          >
            <input
              type="checkbox"
              checked={!!values[o.key]}
              onChange={(e) => setOpt(o.key, e.target.checked)}
              disabled={
                o.key === "includeAddress"
                  ? !intel.hasAddress
                  : o.key === "includePhone"
                    ? !intel.hasPhone
                    : false
              }
            />
            {o.label}
            {o.key === "includeAddress" && !intel.hasAddress && (
              <span className="text-[#B0B8C1]">(미입력)</span>
            )}
          </label>
        ))}
      </div>
      <p className="text-[10px] text-[#8B95A1]">{intel.disclaimer}</p>
    </div>
  );
}
