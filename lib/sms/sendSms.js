import { createHmac, randomBytes } from "crypto";
import { normalizeSmsSenderForApi } from "@/lib/sms/smsDisplay";
import {
  formatSolapiDomesticPhone,
  isValidSolapiMobile,
} from "@/lib/sms/solapiPhone";

/**
 * @param {{ toE164: string, message: string }} params
 * @returns {Promise<{ ok: true, devCode?: string } | { ok: false, message: string, providerCode?: string }>}
 */
export async function sendSms({ toE164, message }) {
  if (process.env.BRICLOG_SMS_DEV_MODE === "true") {
    const m = message.match(/\d{6}/);
    return { ok: true, devCode: m?.[0] };
  }

  const apiKey = (process.env.SOLAPI_API_KEY ?? "").trim();
  const apiSecret = (process.env.SOLAPI_API_SECRET ?? "").trim();
  const from = normalizeSmsSenderForApi(process.env.SOLAPI_SENDER_PHONE);

  if (apiKey && apiSecret && from) {
    return sendViaSolapi({ apiKey, apiSecret, from, toE164, message });
  }

  const sid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const twilioFrom = (process.env.TWILIO_FROM_NUMBER ?? "").trim();
  if (sid && token && twilioFrom) {
    return sendViaTwilio({ sid, token, from: twilioFrom, toE164, message });
  }

  return {
    ok: false,
    message:
      "SMS 발송 설정이 없습니다. 운영자에게 SOLAPI 또는 BRICLOG_SMS_DEV_MODE 설정을 요청해 주세요.",
  };
}

function parseSolapiSendResponse(body) {
  if (!body || typeof body !== "object") {
    return { ok: true };
  }

  if (body.errorCode || body.errorMessage) {
    return {
      ok: false,
      message: body.errorMessage || "인증 문자를 보내지 못했습니다.",
      providerCode: String(body.errorCode || ""),
    };
  }

  const failed = body.failedMessageList;
  if (Array.isArray(failed) && failed.length > 0) {
    const first = failed[0];
    return {
      ok: false,
      message:
        first.statusMessage ||
        "인증 문자 접수에 실패했습니다. 발신번호·수신번호를 확인해 주세요.",
      providerCode: String(first.statusCode || ""),
    };
  }

  const list = body.messageList;
  if (Array.isArray(list)) {
    const bad = list.find(
      (m) => m.statusCode && String(m.statusCode) !== "2000"
    );
    if (bad) {
      return {
        ok: false,
        message:
          bad.statusMessage ||
          "인증 문자 접수에 실패했습니다. Solapi 콘솔 발신번호 승인 상태를 확인해 주세요.",
        providerCode: String(bad.statusCode || ""),
      };
    }
  } else if (list && typeof list === "object") {
    const entries = Object.values(list);
    const bad = entries.find(
      (m) => m?.statusCode && String(m.statusCode) !== "2000"
    );
    if (bad) {
      return {
        ok: false,
        message:
          bad.statusMessage ||
          "인증 문자 접수에 실패했습니다. Solapi 콘솔 발신번호 승인 상태를 확인해 주세요.",
        providerCode: String(bad.statusCode || ""),
      };
    }
  }

  if (body.statusCode && String(body.statusCode) !== "2000") {
    return {
      ok: false,
      message: body.statusMessage || "인증 문자를 보내지 못했습니다.",
      providerCode: String(body.statusCode),
    };
  }

  return { ok: true };
}

async function sendViaSolapi({ apiKey, apiSecret, from, toE164, message }) {
  const to = formatSolapiDomesticPhone(toE164);
  const fromDigits = from.replace(/\D/g, "");

  if (!isValidSolapiMobile(to)) {
    return {
      ok: false,
      message: "수신 휴대폰 번호 형식을 확인해 주세요. (010으로 시작)",
    };
  }
  if (!fromDigits || fromDigits.length < 8) {
    return {
      ok: false,
      message: "발신번호(SOLAPI_SENDER_PHONE) 설정을 확인해 주세요.",
    };
  }

  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  const payload = {
    messages: [
      {
        to,
        from: fromDigits,
        text: message,
        type: "SMS",
        country: "82",
      },
    ],
    showMessageList: true,
  };

  const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    console.error("[sms/solapi]", res.status, body);
    const msg =
      body?.errorMessage ||
      body?.statusMessage ||
      "인증 문자를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return {
      ok: false,
      message: msg,
      providerCode: String(body?.errorCode || body?.statusCode || res.status),
    };
  }

  const parsed = parseSolapiSendResponse(body);
  if (!parsed.ok) {
    console.error("[sms/solapi] send rejected", parsed.providerCode, body);
    return parsed;
  }

  return { ok: true };
}

async function sendViaTwilio({ sid, token, from, toE164, message }) {
  const to = toE164.startsWith("0")
    ? `+82${toE164.slice(1)}`
    : toE164.startsWith("+")
      ? toE164
      : `+${toE164}`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
  if (!res.ok) {
    console.error("[sms/twilio]", res.status);
    return { ok: false, message: "인증 문자를 보내지 못했습니다." };
  }
  return { ok: true };
}

export function isSmsConfigured() {
  if (process.env.BRICLOG_SMS_DEV_MODE === "true") return true;
  const solapi =
    process.env.SOLAPI_API_KEY &&
    process.env.SOLAPI_API_SECRET &&
    process.env.SOLAPI_SENDER_PHONE;
  const twilio =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER;
  return Boolean(solapi || twilio);
}
