import { cn } from "@/lib/utils/cn";

export default function PageContainer({
  children,
  className,
  size = "default",
}) {
  const maxWidth = size === "narrow" ? "max-w-6xl" : "max-w-[1600px]";

  return (
    <div
      className={cn(
        "mx-auto w-[min(80%,1600px)] min-w-0 space-y-6 py-6 md:space-y-8 md:py-8 lg:py-10 max-md:w-full max-md:px-4",
        maxWidth,
        className,
      )}
    >
      {children}
    </div>
  );
}
