"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { encryptedFetch } from "@/lib/encrypted-fetch";

type EncryptedImageProps = Pick<
  ImageProps,
  "src" | "alt" | "fill" | "sizes" | "className" | "priority" | "unoptimized"
>;

export default function EncryptedImage(props: EncryptedImageProps) {
  const { src, alt, ...imageProps } = props;
  const imageUrl = typeof src === "string" ? src : "";
  const [loadedImage, setLoadedImage] = useState<{ url: string; src: string } | null>(null);
  const encryptedImage = imageUrl.startsWith("/api/image");
  const resolvedSrc = encryptedImage
    ? loadedImage?.url === imageUrl
      ? loadedImage.src
      : null
    : src;

  useEffect(() => {
    if (!imageUrl.startsWith("/api/image")) return;

    const controller = new AbortController();
    let objectUrl: string | undefined;

    encryptedFetch(imageUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Image request failed (${response.status})`);
        objectUrl = URL.createObjectURL(await response.blob());
        if (!controller.signal.aborted) {
          setLoadedImage({ url: imageUrl, src: objectUrl });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Unable to load encrypted image", error);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  if (!resolvedSrc) {
    return <span aria-hidden="true" className="absolute inset-0 bg-white/5" />;
  }

  return <Image {...imageProps} src={resolvedSrc} alt={alt} />;
}
