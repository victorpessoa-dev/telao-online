/**
 * The home hero always sits on a dark photographic background. It therefore
 * uses a fixed high-contrast asset instead of the theme-aware logo used by
 * cards, navigation and other page surfaces.
 */
export default function HeroBrandLogo({ className = "", alt = "vPlayCast" }) {
  return (
    <span className={`flex items-center justify-center gap-4 ${className}`}>
      <span className="font-brand text-[clamp(2.25rem,7vw,5.25rem)] font-extrabold tracking-tight text-white">
        vPlayCast
      </span>
      <img
        src="/brand/virtus-playcast-white-mark.png"
        alt=""
        className="h-full aspect-square object-contain"
      />
    </span>
  );
}
