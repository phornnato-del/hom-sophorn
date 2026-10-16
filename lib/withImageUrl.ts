export function withImageUrl<T extends { image?: string | null }>(item: T) {
  return {
    ...item,
    imageUrl: item.image
      ? `/api/image?pathname=${encodeURIComponent(item.image)}`
      : null,
  };
}