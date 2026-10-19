import { cn } from "@/lib/utils/cn";

export default function AppFooter({ className }) {
  return (
    <footer
      aria-label="Rodapé"
      className={cn("border-t border-slate-200 px-6 py-6", className)}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-2 text-center text-xs text-slate-500 sm:flex-row sm:gap-3 sm:text-sm">
        <span
          role="img"
          aria-label="Virtus Sistemas"
          className="h-7 w-7 shrink-0 bg-slate-500"
          style={{
            maskImage: "url('/brand/virtus-sistemas-emblema.png')",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskImage: "url('/brand/virtus-sistemas-emblema.png')",
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
          }}
        />
        <span className="min-w-0 leading-relaxed">
          © {new Date().getFullYear()} <span className="font-brand font-extrabold">vPlayCast</span>. Desenvolvido por Virtus
          Sistemas.
        </span>
      </div>
    </footer>
  );
}
