import { validateNickname } from "@/lib/auth/signupProfile";
import { getAccessToken } from "@/lib/api/clientAuth";

/**
 * @param {string} rawNickname
 * @param {{ excludeUserId?: string | null }} [opts]
 * @returns {Promise<{ ok: boolean, available: boolean, status: 'idle'|'invalid'|'checking'|'available'|'taken'|'error', message: string }>}
 */
export async function checkNicknameAvailability(rawNickname, opts = {}) {
  const check = validateNickname(rawNickname);
  if (!check.ok) {
    return {
      ok: false,
      available: false,
      status: "invalid",
      message: check.message,
    };
  }

  const q = new URLSearchParams({ nickname: check.value });
  if (opts.excludeUserId) q.set("excludeUserId", opts.excludeUserId);

  try {
    const token = await getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/auth/check-nickname?${q}`, { headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok && !data.ok) {
      return {
        ok: false,
        available: false,
        status: "error",
        message:
          data.userMessage ||
          (res.status === 503
            ? "닉네임 확인을 준비 중입니다. 잠시 후 다시 시도해 주세요."
            : "닉네임을 확인하지 못했습니다."),
      };
    }

    if (!data.ok) {
      return {
        ok: false,
        available: false,
        status: "error",
        message: data.userMessage || "닉네임을 확인하지 못했습니다.",
      };
    }

    if (!data.valid) {
      return {
        ok: true,
        available: false,
        status: "invalid",
        message: data.userMessage || check.message,
      };
    }

    if (!data.available) {
      return {
        ok: true,
        available: false,
        status: "taken",
        message:
          data.userMessage ||
          "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.",
      };
    }

    if (data.deferred) {
      return {
        ok: true,
        available: true,
        status: "deferred",
        message:
          data.userMessage ||
          "지금은 바로 확인하기 어렵습니다. 저장할 때 중복을 다시 확인해요.",
      };
    }

    return {
      ok: true,
      available: true,
      status: "available",
      message: data.userMessage || "사용 가능한 닉네임입니다.",
    };
  } catch {
    return {
      ok: false,
      available: false,
      status: "error",
      message: "닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
