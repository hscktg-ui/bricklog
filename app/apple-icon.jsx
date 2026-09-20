import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Next 16 apple-icon은 jpg/png만 — iOS 홈화면용 PNG 마크 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F8FA",
          borderRadius: 44,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            display: "flex",
            position: "relative",
            background: "#F7F8FA",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 40,
              width: 46,
              height: 46,
              borderRadius: 12,
              border: "8px solid #111111",
              background: "#F7F8FA",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 94,
              top: 40,
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "#111111",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 67,
              top: 94,
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "#03C75A",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
