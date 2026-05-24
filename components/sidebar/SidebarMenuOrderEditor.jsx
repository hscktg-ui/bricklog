"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SIDEBAR_MENU_ORDER,
  CHANNEL_PRODUCTS,
} from "@/lib/channels/channelProducts";
import {
  getSidebarMenuOrder,
  saveSidebarMenuOrder,
} from "@/lib/user/userPreferences";

function labelFor(id) {
  return CHANNEL_PRODUCTS[id]?.menuLabel || id;
}

export default function SidebarMenuOrderEditor({ userId, onSaved, onToast }) {
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState([...DEFAULT_SIDEBAR_MENU_ORDER]);

  useEffect(() => {
    if (!userId) return;
    setOrder(getSidebarMenuOrder(userId));
  }, [userId]);

  const move = (index, dir) => {
    const next = [...order];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setOrder(next);
  };

  const handleDone = () => {
    if (!userId) return;
    saveSidebarMenuOrder(userId, order);
    onSaved?.(order);
    setEditing(false);
    onToast?.("메뉴 순서를 저장했습니다.", "success");
  };

  const handleReset = () => {
    setOrder([...DEFAULT_SIDEBAR_MENU_ORDER]);
  };

  if (!userId) return null;

  return (
    <div className="rounded-lg border border-[#E8EBED] bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#4E5968]">좌측 메뉴 순서</p>
        <button
          type="button"
          onClick={() => setEditing((o) => !o)}
          className="text-[11px] font-medium text-[#03A94D] hover:underline"
        >
          {editing ? "취소" : "바꾸기"}
        </button>
      </div>
      {editing && (
        <>
          <ul className="mt-2 max-h-[200px] space-y-1 overflow-y-auto">
            {order.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-1 rounded-md bg-[#F7F8FA] px-2 py-1"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#4E5968]">
                  {labelFor(id)}
                </span>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-[#8B95A1] hover:bg-white disabled:opacity-30"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-[#8B95A1] hover:bg-white disabled:opacity-30"
                  aria-label="아래로"
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleDone}
              className="flex-1 rounded-lg bg-[#03C75A] py-2 text-[12px] font-semibold text-white hover:bg-[#02B350]"
            >
              완료
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-[#E8EBED] px-3 py-2 text-[11px] text-[#8B95A1] hover:bg-[#F7F8FA]"
            >
              기본
            </button>
          </div>
        </>
      )}
    </div>
  );
}
