import { Github, Instagram, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const contactLinks = [
  {
    label: "GitHub",
    href: "https://github.com/victorpessoa-dev",
    Icon: Github,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/victorpessoa.dev/",
    Icon: Instagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/victor-pessoa-b93703241/?isSelfProfile=true",
    Icon: Linkedin,
  },
];

export default function AppFooter({ className }) {
  return (
    <footer
      aria-label="Rodapé"
      className={cn("bg-white py-8", className)}
    >
      <div className="mx-auto flex w-[min(80%,1600px)] flex-col gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left max-md:w-full max-md:items-center max-md:px-4">
        <div className="max-md:flex max-md:flex-col max-md:items-center">
          <img
            src="/brand/emblema-telao-online.webp"
            alt="Telão Online"
            className="h-14 w-auto max-w-[12rem] object-contain"
          />
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Transparência para as parcerias que apoiam novenários e festas
            paroquiais.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} Telão Online · Desenvolvido por Victor
            Pessoa.
          </p>
        </div>
        <nav
          aria-label="Canais de contato"
          className="flex justify-center gap-2 sm:justify-end"
        >
          {contactLinks.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
