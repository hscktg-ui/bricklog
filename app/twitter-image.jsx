import { renderOgImage, OG_IMAGE_ALT, OG_IMAGE_SIZE } from "@/lib/brand/renderOgImage";

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function TwitterImage() {
  return renderOgImage();
}
