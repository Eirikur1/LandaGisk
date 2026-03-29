"use client";

import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Set when the avatar is likely the LCP element (e.g. hero profile). */
  priority?: boolean;
};

/**
 * Supabase storage URLs go through `next/image` so Vercel serves resized WebP/AVIF
 * instead of full-size originals for tiny UI avatars.
 * Blob/data URLs (account upload preview) stay as a plain img element.
 */
export function OptimizedAvatar({ src, alt, width, height, className, priority }: Props) {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} className={className} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={`${width}px`}
      priority={priority}
    />
  );
}
