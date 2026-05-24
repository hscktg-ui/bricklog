import {
  isMissingProfilesTable,
  isNicknameTaken,
} from "@/lib/auth/profileServer";
import {
  isMissingNicknameRpc,
  parseNicknameRpcPayload,
} from "@/lib/auth/nicknameRpc";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

/** anon · authenticated RPC (서비스 롤 불필요) */
async function checkViaRpc(client, nickname, excludeUserId) {
  const { data, error } = await client.rpc("check_nickname_available", {
    p_nickname: nickname,
    p_exclude_user_id: excludeUserId || null,
  });
  if (error) {
    if (isMissingNicknameRpc(error)) return { missingRpc: true };
    throw error;
  }
  const parsed = parseNicknameRpcPayload(data);
  if (parsed) return parsed;
  return { missingRpc: true };
}

/**
 * @param {string} [accessToken]
 * @returns {Promise<
 *   | { ok: true, available: boolean, valid: boolean, deferred?: boolean }
 *   | { ok: false, reason: "config" | "profiles_table" | "unknown", message: string }
 * >}
 */
export async function resolveNicknameAvailability(
  nickname,
  excludeUserId = null,
  accessToken = null
) {
  const service = createServiceSupabase();

  if (service) {
    try {
      const taken = await isNicknameTaken(service, nickname, excludeUserId);
      return {
        ok: true,
        available: !taken,
        valid: true,
        deferred: false,
      };
    } catch (err) {
      if (!isMissingProfilesTable(err)) throw err;
    }
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return {
      ok: false,
      reason: "config",
      message: "닉네임 확인을 지금 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const client = createServerSupabase(accessToken || undefined);
  try {
    const rpc = await checkViaRpc(client, nickname, excludeUserId);
    if (!rpc.missingRpc && rpc.available !== undefined) {
      return {
        ok: true,
        available: rpc.available,
        valid: rpc.valid !== false,
        deferred: false,
      };
    }
  } catch (err) {
    if (!isMissingProfilesTable(err) && !isMissingNicknameRpc(err)) {
      throw err;
    }
  }

  return {
    ok: true,
    available: true,
    valid: true,
    deferred: true,
  };
}
