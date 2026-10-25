import { BRAND } from "@/lib/constants/brand";

/** Renders the reusable Telão Online mark or complete wordmark. */
export default function BrandLogo({
  className = "",
  alt = BRAND.name,
  markOnly = false,
  animated = false,
}) {
  return (
    <span
      className={`relative inline-flex items-center ${animated ? "brand-logo-motion" : ""} ${className}`}
    >
      <img
        src={markOnly ? BRAND.markAsset : BRAND.wordmarkAsset}
        alt={alt}
        className={
          markOnly
            ? "h-full aspect-square object-contain"
            : "h-full w-auto max-w-full object-contain"
        }
      />
    </span>
  );
}
