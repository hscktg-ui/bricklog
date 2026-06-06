"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { StatCard } from "@/components/admin/AdminCharts";
import AdminFeedbackPanel from "@/components/admin/AdminFeedbackPanel";

function formatKst(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function LiveStatsBar({ live, onRefresh, refreshing }) {
  if (!live) {
    return (
      <p className="text-[13px] text-[#8B95A1]">실시간 현황을 불러오는 중…</p>
    );
  }

  return (
    <section className="rounded-xl border border-[#3182F6]/30 bg-gradient-to-br from-[#3182F6]/8 to-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-bold text-[#191F28]">실시간 현황</h2>
          <p className="mt-0.5 text-[11px] text-[#8B95A1]">
            KST 기준 · {formatKst(live.asOf)} 갱신
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border border-[#E8EBED] bg-white px-3 py-1.5 text-[12px] disabled:opacity-50"
        >
          {refreshing ? "갱신 중…" : "새로고침"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="전체 회원" value={live.totalUsers ?? "—"} />
        <StatCard label="오늘 가입" value={live.signupsToday ?? "—"} />
        <StatCard
          label="현재 접속"
          value={live.onlineNow ?? "—"}
          hint={`최근 ${live.onlineWindowMinutes}분`}
        />
        <StatCard
          label="오늘 활성 회원"
          value={live.activeUsersToday ?? "—"}
          hint="이벤트 기준"
        />
        <StatCard
          label="오늘 방문(페이지뷰)"
          value={live.visitsToday ?? "—"}
          hint={
            live.visitsTableReady === false
              ? "schema-v17 적용 필요"
              : `순방문 ${live.uniqueVisitorsToday ?? "—"}`
          }
        />
        <StatCard label="오늘 오류" value={live.errorsToday ?? "—"} />
      </div>
      {live.onlineUsers?.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-[#4E5968]">접속 중 회원</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {live.onlineUsers.map((u) => (
              <li
                key={u.id}
                className="rounded-full border border-[#E8EBED] bg-white px-3 py-1 text-[11px] text-[#4E5968]"
              >
                {u.name} · {formatKst(u.lastSeenAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function UsersPanel({ onToast }) {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nickname: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth("/api/admin/users?limit=40");
      setUsers(data.users || []);
      setTotalUsers(data.totalUsers);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const data = await fetchWithAuth("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onToast?.(`${data.user.email} 계정이 생성되었습니다.`, "success");
      setForm({ email: "", password: "", nickname: "" });
      await load();
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={createUser}
        className="rounded-xl border border-[#E8EBED] bg-white p-4"
      >
        <h3 className="text-[15px] font-bold">신규 계정 추가</h3>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          운영자가 직접 가입자를 만들 수 있습니다. 비밀번호는 생성 후 전달하세요.
        </p>
        <label className="mt-4 block text-[12px] font-medium text-[#4E5968]">
          이메일
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
          />
        </label>
        <label className="mt-3 block text-[12px] font-medium text-[#4E5968]">
          비밀번호 (8자+)
          <input
            type="text"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
          />
        </label>
        <label className="mt-3 block text-[12px] font-medium text-[#4E5968]">
          닉네임 (선택)
          <input
            type="text"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="mt-4 w-full rounded-lg bg-[#03C75A] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {creating ? "생성 중…" : "계정 생성"}
        </button>
      </form>

      <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">
            최근 가입자 {totalUsers != null ? `(전체 ${totalUsers}명)` : ""}
          </h3>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[12px] text-[#03A94D] hover:underline"
          >
            새로고침
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-[12px] text-[#8B95A1]">불러오는 중…</p>
        ) : (
          <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-[#F2F4F6] px-3 py-2 text-[12px]"
              >
                <p className="font-medium text-[#191F28]">
                  {u.nickname || u.display_name || u.email}
                </p>
                <p className="text-[#4E5968]">{u.email}</p>
                <p className="mt-1 text-[#8B95A1]">
                  가입 {formatKst(u.created_at)}
                  {u.last_seen_at
                    ? ` · 접속 ${formatKst(u.last_seen_at)}`
                    : u.last_login_at
                      ? ` · 로그인 ${formatKst(u.last_login_at)}`
                      : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ErrorsPanel() {
  const [errors, setErrors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/errors?limit=50");
      setErrors(data.errors || []);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (!autoRefresh) return undefined;
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load, autoRefresh]);

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold">오류 로그 (실시간)</h3>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            15초마다 자동 갱신 · 태블릿·PC 어디서나 확인
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-[#4E5968]">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          자동 갱신
        </label>
      </div>
      {loading && errors.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#8B95A1]">불러오는 중…</p>
      ) : errors.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#03A94D]">최근 오류 없음</p>
      ) : (
        <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
          {errors.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-[#E8EBED] p-3 text-[12px]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-semibold text-[#E42939]">{e.route}</span>
                <span className="text-[#8B95A1]">{formatKst(e.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[#4E5968]">{e.message}</p>
              {e.meta && Object.keys(e.meta).length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  className="mt-2 text-[11px] text-[#3182F6] hover:underline"
                >
                  {expanded === e.id ? "상세 접기" : "상세(meta) 보기"}
                </button>
              )}
              {expanded === e.id && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-[#191F28] p-2 text-[10px] text-[#E8EBED]">
                  {JSON.stringify(e.meta, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DevConsolePanel() {
  const [engine, setEngine] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let noteVal = "";
    try {
      noteVal = localStorage.getItem("briclog_admin_dev_note") || "";
    } catch {
      /* ignore */
    }
    setNote(noteVal);
    void fetch("/api/public/engine-status")
      .then((r) => r.json())
      .then(setEngine)
      .catch(() => setEngine({ ok: false }));
  }, []);

  const saveNote = () => {
    try {
      localStorage.setItem("briclog_admin_dev_note", note);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
        <h3 className="text-[15px] font-bold">개발·운영 콘솔</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8B95A1]">
          Cursor처럼 코드 편집은 이 화면에 포함되지 않습니다. 대신 엔진 상태·오류·품질
          테스트를 태블릿·PC에서 바로 확인할 수 있습니다. 코드 수정은 로컬 Cursor +
          배포(`vercel deploy`) 흐름을 사용하세요.
        </p>
        <ul className="mt-3 list-disc pl-5 text-[12px] text-[#4E5968]">
          <li>아래 품질 자동 테스트 · Evolution Lab · 인사이트 승인</li>
          <li>오류 탭에서 meta JSON 확인 후 Cursor에 붙여넣기</li>
          <li>신규 계정은 회원 탭에서 즉시 생성</li>
        </ul>
      </div>

      <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
        <h4 className="text-[14px] font-bold">엔진 상태</h4>
        {!engine ? (
          <p className="mt-2 text-[12px] text-[#8B95A1]">불러오는 중…</p>
        ) : (
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#F7F8FA] p-3 text-[11px] text-[#4E5968]">
            {JSON.stringify(engine, null, 2)}
          </pre>
        )}
      </div>

      <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
        <h4 className="text-[14px] font-bold">운영 메모 (이 기기에만 저장)</h4>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="태블릿에서 본 오류·재현 조건 메모…"
          className="mt-2 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[12px]"
        />
        <button
          type="button"
          onClick={saveNote}
          className="mt-2 rounded-lg border border-[#E8EBED] px-3 py-1.5 text-[12px]"
        >
          메모 저장
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "현황" },
  { id: "feedback", label: "피드백" },
  { id: "users", label: "회원" },
  { id: "errors", label: "오류" },
  { id: "dev", label: "개발" },
];

export default function AdminOpsHub({ onToast }) {
  const [tab, setTab] = useState("overview");
  const [live, setLive] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchWithAuth("/api/admin/live");
      setLive(data.live);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setRefreshing(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadLive();
    const id = setInterval(() => void loadLive(), 30_000);
    return () => clearInterval(id);
  }, [loadLive]);

  return (
    <div className="mb-8 space-y-4">
      <LiveStatsBar live={live} onRefresh={() => void loadLive()} refreshing={refreshing} />

      <div className="flex flex-wrap gap-2 border-b border-[#E8EBED] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium ${
              tab === t.id
                ? "bg-[#191F28] text-white"
                : "bg-white text-[#4E5968] border border-[#E8EBED]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <p className="text-[13px] text-[#4E5968]">
          상단 실시간 카드와 아래 30일 대시보드를 함께 보세요. 접속·방문 집계는{" "}
          <code className="text-[11px]">schema-v17-admin-ops.sql</code> 적용 후 정확해집니다.
        </p>
      )}
      {tab === "feedback" && <AdminFeedbackPanel onToast={onToast} />}
      {tab === "users" && <UsersPanel onToast={onToast} />}
      {tab === "errors" && <ErrorsPanel />}
      {tab === "dev" && <DevConsolePanel />}
    </div>
  );
}
