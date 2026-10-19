export default function BrandLogo({
  className = "",
  alt = "vPlayCast",
  markOnly = false,
  animated = false,
}) {
  const lightAsset = "/brand/virtus-playcast-mark.png";
  const darkAsset = "/brand/virtus-playcast-white-mark.png";

  return (
    <span
      className={`relative inline-flex items-center ${animated ? "brand-logo-motion" : ""} ${className}`}
    >
      <span className="relative flex h-full items-center gap-2.5">
        {!markOnly ? (
          <span className="font-brand text-[0.72em] font-extrabold tracking-tight text-foreground">
            vPlayCast
          </span>
        ) : null}
        <span
          className={
            markOnly
              ? "relative h-full aspect-square"
              : "relative h-full aspect-square shrink-0"
          }
        >
          <img
            src={lightAsset}
            alt={markOnly ? alt : ""}
            className="brand-logo-light h-full w-full object-contain"
          />
          <img
            src={darkAsset}
            alt=""
            className="brand-logo-dark absolute inset-0 h-full w-full object-contain"
          />
        </span>
      </span>
    </span>
  );
}
