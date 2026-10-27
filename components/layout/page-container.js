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
        "mx-auto w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 md:space-y-8 md:px-8 md:py-8 lg:px-10 lg:py-10",
        maxWidth,
        className,
      )}
    >
      {children}
    </div>
  );
}
