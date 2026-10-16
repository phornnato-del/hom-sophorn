import { ALLOWED_FOLDERS } from "./folders";

export function imageSrc(image?: string | null) {
  if (!image) return "/default-avatar.png";
  if (image.startsWith("http")) return image;
  if (!ALLOWED_FOLDERS.some((folder) => image.startsWith(folder))) {
    console.error(`Image path "${image}" is not in allowed folders`);
    return "/default-avatar.png";
  }

  return `/api/image?pathname=${encodeURIComponent(image)}`;
}