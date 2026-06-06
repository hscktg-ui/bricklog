import { ImageResponse } from "next/og";
import {
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
  BRAND_META_TITLE_KO,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = `브릭로그 BRICLOG — ${BRICLOG_SLOGAN}`;

const FONT_REGULAR =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf";
const FONT_BOLD =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf";

async function loadFonts() {
  const [regular, bold] = await Promise.all([
    fetch(FONT_REGULAR).then((res) => res.arrayBuffer()),
    fetch(FONT_BOLD).then((res) => res.arrayBuffer()),
  ]);
  return { regular, bold };
}

export async function renderOgImage() {
  const { regular, bold } = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background:
            "linear-gradient(145deg, #f7f8fa 0%, #eef9f2 48%, #f7f8fa 100%)",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(3, 199, 90, 0.12)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "#03C75A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            B
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#191f28",
                letterSpacing: "-0.02em",
              }}
            >
              {BRAND_META_TITLE_KO}
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#03C75A",
                letterSpacing: "0.04em",
              }}
            >
              {BRAND_META_TITLE}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "#191f28",
            lineHeight: 1.35,
            marginBottom: 20,
          }}
        >
          {BRICLOG_SLOGAN}
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: "#4e5968",
            lineHeight: 1.45,
            maxWidth: 920,
          }}
        >
          {BRAND_META_DESCRIPTION}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 80,
            fontSize: 24,
            color: "#8b95a1",
            fontWeight: 400,
          }}
        >
          briclog.ai
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
