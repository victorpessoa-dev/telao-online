"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import AppFooter from "@/components/shared/app-footer";
import LoadingState from "@/components/shared/loading-state";
import PageError from "@/components/shared/page-error";
import PublicNavbar from "@/components/shared/public-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getWhatsAppUrl(socialLinks = []) {
  const contact = socialLinks.find((item) =>
    /whatsapp|\bzap\b|wa\.me|api\.whatsapp/i.test(
      `${item?.label || ""} ${item?.url || ""}`,
    ),
  );
  if (!contact?.url) return "";

  const phoneMatch = String(contact.url).match(
    /(?:wa\.me\/|phone=)(\d{8,15})/i,
  );
  if (phoneMatch) return `https://wa.me/${phoneMatch[1]}`;
  return contact.url;
}

export default function SponsorInterestPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    responsibleName: "",
    companyName: "",
    socialOrWebsite: "",
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/igreja/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.church)
          throw new Error(payload.error || "Igreja não encontrada.");
        if (!cancelled) setChurch(payload.church);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar esta igreja.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const whatsappUrl = useMemo(
    () => getWhatsAppUrl(church?.social_links),
    [church?.social_links],
  );
  const sponsorshipGuidelines = useMemo(
    () =>
      String(church?.sponsorship_guidelines || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [church?.sponsorship_guidelines],
  );

  if (loading) {
    return <LoadingState fullScreen label="Preparando formulário..." />;
  }

  if (!church) {
    return (
      <PageError
        title="Igreja não encontrada."
        description={error || "Confira o endereço acessado."}
        homeHref="/igrejas"
        homeLabel="Ver igrejas"
      />
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!whatsappUrl) return;
    const socialOrWebsite = form.socialOrWebsite.trim();
    const contactDetails = socialOrWebsite
      ? `\nRedes sociais ou site: ${socialOrWebsite}`
      : "";
    const message = `Olá! Me chamo ${form.responsibleName.trim()} e represento a empresa ${form.companyName.trim()}. Tenho interesse em apoiar a ${church.name} e divulgar nossa marca no novenário/festa.${contactDetails}\nPodemos conversar sobre as opções de patrocínio?`;
    const separator = whatsappUrl.includes("?") ? "&" : "?";
    window.open(
      `${whatsappUrl}${separator}text=${encodeURIComponent(message)}`,
      "_self",
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar projectBrand />
      <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 py-8 sm:px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/${slug}`} className="back-link">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página da igreja
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-right text-sm font-medium text-muted-foreground">
            <span className="truncate">{church.name}</span>
            <img
              src={church.logo_url || "/brand/logo-telao-online.webp"}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-border bg-card object-cover"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[.86fr_1.14fr]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="eyebrow text-primary">Como funciona</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Seja parceiro da festa.
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">
              Sua colaboração ajuda a realizar a programação e sua empresa ganha
              visibilidade junto à comunidade.
            </p>
            {sponsorshipGuidelines.length ? (
              <ul className="mt-7 space-y-4 text-sm leading-6 text-muted-foreground">
                {sponsorshipGuidelines.map((guideline) => (
                  <InfoItem key={guideline} text={guideline} />
                ))}
              </ul>
            ) : (
              <p className="mt-7 rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
                Esta igreja ainda não publicou as orientações de patrocínio.
                Entre em contato para receber as informações atualizadas.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="eyebrow text-primary">Manifestar interesse</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Vamos conversar sobre sua parceria.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Estes dados não são salvos. Ao concluir, você será direcionado ao
              WhatsApp da igreja.
            </p>
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="responsible-name">Nome do responsável</Label>
                <Input
                  id="responsible-name"
                  required
                  value={form.responsibleName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsibleName: event.target.value,
                    }))
                  }
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da empresa</Label>
                <Input
                  id="company-name"
                  required
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social-or-website">
                  Redes sociais ou site (opcional)
                </Label>
                <Input
                  id="social-or-website"
                  type="url"
                  value={form.socialOrWebsite}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      socialOrWebsite: event.target.value,
                    }))
                  }
                  placeholder="https://instagram.com/suaempresa ou https://suaempresa.com"
                />
                <p className="text-xs text-muted-foreground">
                  Informe um perfil de rede social ou o site da empresa para a
                  equipe de patrocínios.
                </p>
              </div>
              {whatsappUrl ? (
                <Button type="submit" className="w-full">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Continuar no WhatsApp
                </Button>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  O WhatsApp desta igreja ainda não foi configurado. Procure a
                  equipe responsável para conhecer as opções de patrocínio.
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function InfoItem({ text }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      {text}
    </li>
  );
}
