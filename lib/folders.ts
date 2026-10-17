export const ALLOWED_FOLDERS = [
  "avatars",
  "projects",
  "banners",
  "documents",
  "categories",
  "uploads",
];

export function isAllowedImagePath(pathname: string): boolean {
  const [folder, filename, ...extraSegments] = pathname.split("/");
  return Boolean(
    ALLOWED_FOLDERS.includes(folder) &&
    filename &&
    !extraSegments.length &&
    /^[\w-]+\.(jpe?g|png|webp)$/i.test(filename),
  );
}
