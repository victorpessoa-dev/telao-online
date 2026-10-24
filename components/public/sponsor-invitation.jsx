import Link from "next/link";
import { ArrowUpRight, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SponsorInvitation({ church, slug }) {
  const interestPath = `/${slug}/patrocinar`;
  const qrValue =
    typeof window === "undefined"
      ? interestPath
      : `${window.location.origin}${interestPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(qrValue)}`;

  return (
    <section
      aria-labelledby="sponsor-invitation-title"
      className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10 lg:flex lg:min-h-80 lg:items-center lg:pr-[25rem]"
    >
      <div className="absolute -left-20 top-0 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-100">
          <Handshake className="h-3.5 w-3.5" />
          Seja um parceiro desta festa
        </p>
        <h2
          id="sponsor-invitation-title"
          className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Divulgue sua empresa e apoie a comunidade.
        </h2>
        <p className="mt-3 max-w-xl leading-7 text-slate-200">
          Conheça as modalidades de patrocínio da {church.name} e veja como
          divulgar sua empresa durante a festa.
        </p>
        <Button
          asChild
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Link href={interestPath}>
            Quero ser parceiro
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Link
        href={interestPath}
        aria-label="Abrir formulário para ser parceiro"
        className="absolute right-8 top-1/2 hidden -translate-y-1/2 rounded-2xl border-2 border-cyan-300 bg-white p-4 shadow-2xl shadow-black/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 lg:inline-flex"
      >
        <img
          src={qrUrl}
          alt="QR Code para abrir o formulário de interesse em patrocínio"
          className="h-36 w-36"
        />
      </Link>
    </section>
  );
}
