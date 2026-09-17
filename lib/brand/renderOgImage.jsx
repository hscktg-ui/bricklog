import { ImageResponse } from "next/og";
import {
  BRAND_META_DESCRIPTION,
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
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#FCFCFA",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 72,
            right: 72,
            height: 1,
            background: "#E7ECE8",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 24,
                background: "#F7F8FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: "1px solid #E7ECE8",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 18,
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: "4px solid #111111",
                  background: "#F7F8FA",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 48,
                  top: 18,
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "#111111",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 33,
                  top: 48,
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "#03C75A",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 700,
                  color: "#111111",
                  letterSpacing: "-0.03em",
                }}
              >
                {BRAND_META_TITLE_KO}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#03C75A",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Intent Before Output
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "14px 22px",
              borderRadius: 999,
              border: "1px solid #D7DDD9",
              color: "#5F6B66",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            briclog.ai
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 980,
          }}
        >
          <div
            style={{
            display: "flex",
            flexDirection: "column",
              fontSize: 78,
              fontWeight: 700,
              color: "#111111",
              lineHeight: 1.08,
              letterSpacing: "-0.06em",
            }}
          >
                Discover what is moving in AI rankings.
                <br />
                Apply it to your brand.
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "#4F5A56",
              lineHeight: 1.5,
              maxWidth: 940,
            }}
          >
            {BRAND_META_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {["TREND SEARCH", "BRIEF", "BLOG", "SMARTPLACE", "INSTAGRAM"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "12px 18px",
                  borderRadius: 999,
                  border: "1px solid #D7DDD9",
                  background: label === "BRIEF" ? "#03C75A" : "#FFFFFF",
                  color: label === "BRIEF" ? "#FFFFFF" : "#111111",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 22,
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
