import { ImageResponse } from "next/og";
import { BRAND_META_TITLE_KO, BRICLOG_SLOGAN } from "@/lib/brand/copy";

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

/** Vision 2040 OG — mark + one Korean line. No pill strip, no SEO paragraph dump. */
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
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#FCFCFA",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 26,
                background: "#F7F8FA",
                display: "flex",
                position: "relative",
                border: "1px solid #E7ECE8",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 20,
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: "4px solid #111111",
                  background: "#F7F8FA",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 52,
                  top: 20,
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#111111",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 36,
                  top: 52,
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#03C75A",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.02em",
              }}
            >
              {BRAND_META_TITLE_KO}
            </div>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#8A948F",
            }}
          >
            briclog.ai
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 700,
              color: "#111111",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
            }}
          >
            AI 순위·랭킹,
            <br />
            지금을 읽다.
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 400,
              color: "#5F6B66",
              lineHeight: 1.45,
              maxWidth: 860,
            }}
          >
            움직이는 도구를 보고, 브랜드 초안까지.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "#03C75A",
            }}
          >
            Intent before output
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#8A948F",
              fontWeight: 400,
            }}
          >
            {BRICLOG_SLOGAN}
          </div>
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
