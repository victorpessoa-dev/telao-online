"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Link2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppFooter from "@/components/shared/app-footer";
import { HoverTip } from "@/components/shared/hover-tip";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";
import {
  deleteUploadedMediaBatch,
  uploadMedia,
} from "@/services/supabase/upload";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const suggestedSlug = (name, city) =>
  slugify([name, city].filter(Boolean).join("-")) || "nova-igreja";

function formatWhatsAppUrl(value) {
  const contact = String(value || "").trim();
  if (!contact) return "";
  if (/^https?:\/\//i.test(contact)) return contact;
  return `https://wa.me/${contact.replace(/\D/g, "")}`;
}

function getErrorMessage(cause, fallback) {
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === "object" && typeof cause.message === "string") {
    return cause.message;
  }
  return fallback;
}

function ImageField({
  id,
  label,
  hint,
  value,
  onUrlChange,
  file,
  onFileChange,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const selectFile = (nextFile) => {
    if (nextFile?.type.startsWith("image/")) onFileChange(nextFile);
  };
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`${id}-url`}>
          {label}{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-input bg-muted/20 hover:border-primary/60 hover:bg-muted/40"}`}
      >
        <UploadCloud className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">
          Arraste uma imagem ou clique para enviar
        </span>
        <span className="text-xs text-muted-foreground">PNG, JPG ou WebP</span>
      </button>
      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2 truncate">
            <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
            {file.name}
          </span>
          <HoverTip label={`Remover ${label}`}>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={`Remover ${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </HoverTip>
        </div>
      ) : (
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${id}-url`}
            type="url"
            value={value}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="ou cole o link da imagem"
            className="pl-9"
          />
        </div>
      )}
    </div>
  );
}

export default function AdminChurchConfiguration() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "",
    logoUrl: "",
    coverUrl: "",
    sponsorshipGuidelines: "",
    sponsorshipWhatsApp: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugMessage, setSlugMessage] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (!slugEdited && (field === "name" || field === "city"))
        next.slug = suggestedSlug(next.name, next.city);
      return next;
    });
    if (field === "slug") {
      setSlugEdited(true);
      setSlugMessage("");
    }
  };
  async function validateSlug() {
    const slug = form.slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) return false;
    try {
      const response = await fetch(
        `/api/igrejas/slug-disponivel?slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSlugMessage(
        data.available
          ? "Slug disponível."
          : `Este slug já existe. Sugestão: ${suggestedSlug(form.name, form.city)}`,
      );
      return data.available;
    } catch (cause) {
      setSlugMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível validar o slug",
      );
      return false;
    }
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    const slug = form.slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug))
      return setError("Use um slug com letras minúsculas, números e hífens.");
    if (!(await validateSlug()))
      return setError("Escolha outro slug para continuar.");
    if (step === 1) return setStep(2);
    setSaving(true);
    const uploaded = [];
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("Faça login para configurar uma igreja.");
      const { data: existing, error: existingChurchError } = await supabase
        .from("churches")
        .select("id")
        .eq("admin_id", user.id)
        .maybeSingle();
      if (existingChurchError) throw existingChurchError;
      if (existing) return router.replace("/admin");
      const { data: church, error: createError } = await supabase
        .from("churches")
        .insert({
          name: form.name.trim(),
          slug,
          city: form.city.trim(),
          logo_url: form.logoUrl.trim() || null,
          cover_url: form.coverUrl.trim() || null,
          social_links: form.sponsorshipWhatsApp.trim()
            ? [
                {
                  label: "WhatsApp para patrocínios",
                  url: formatWhatsAppUrl(form.sponsorshipWhatsApp),
                },
              ]
            : [],
          sponsorship_guidelines: form.sponsorshipGuidelines.trim(),
          is_active: true,
          setup_completed_at: new Date().toISOString(),
          admin_id: user.id,
        })
        .select("id")
        .single();
      if (createError || !church)
        throw createError || new Error("Não foi possível criar a igreja.");
      const logoUrl = logoFile
        ? await uploadMedia(logoFile, "branding", church.id)
        : form.logoUrl.trim();
      if (logoFile) uploaded.push(logoUrl);
      const coverUrl = coverFile
        ? await uploadMedia(coverFile, "branding", church.id)
        : form.coverUrl.trim();
      if (coverFile) uploaded.push(coverUrl);
      if (logoFile || coverFile) {
        const { error: updateError } = await supabase
          .from("churches")
          .update({ logo_url: logoUrl || null, cover_url: coverUrl || null })
          .eq("id", church.id);
        if (updateError) throw updateError;
      }
      // The admin gate verifies the new church before rendering the dashboard.
      // Replace setup in history so a completed onboarding cannot be reopened
      // with the browser Back action.
      router.replace("/admin");
    } catch (cause) {
      if (uploaded.length) await deleteUploadedMediaBatch(uploaded);
      setError(
        cause instanceof Error
          ? cause.message
          : getErrorMessage(cause, "Não foi possível criar a igreja."),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-muted/25">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="back-link mb-7">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>
        <Card className="overflow-hidden border-border/80 shadow-lg">
          <div className="border-b bg-card px-6 py-7 sm:px-8">
            <p className="text-sm font-medium text-primary">Primeiros passos</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Configure sua igreja
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você poderá alterar tudo depois no painel.
            </p>
            <div className="mt-6 flex gap-2">
              {[1, 2].map((number) => (
                <div
                  key={number}
                  className={`h-1.5 flex-1 rounded-full ${number <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Dados da igreja</span>
              <span>Identidade visual</span>
            </div>
          </div>
          <CardContent className="p-6 sm:p-8">
            <form className="space-y-5" onSubmit={submit}>
              {step === 1 ? (
                <>
                  <div>
                    <Label htmlFor="church-name">Nome da igreja</Label>
                    <Input
                      id="church-name"
                      required
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="Paróquia Sagrada Eucaristia"
                    />
                  </div>
                  <div>
                    <Label htmlFor="church-slug">Endereço da página</Label>
                    <Input
                      id="church-slug"
                      required
                      value={form.slug}
                      onChange={(event) =>
                        updateField("slug", event.target.value)
                      }
                      onBlur={validateSlug}
                      placeholder="paroquia-sagrada-eucaristia"
                    />
                    {slugMessage ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {slugMessage}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="church-city">Cidade</Label>
                    <Input
                      id="church-city"
                      required
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      placeholder="Sua cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sponsorship-whatsapp">
                      WhatsApp para contato de patrocínios
                    </Label>
                    <Input
                      id="sponsorship-whatsapp"
                      value={form.sponsorshipWhatsApp}
                      onChange={(event) =>
                        updateField("sponsorshipWhatsApp", event.target.value)
                      }
                      placeholder="5599999999999 ou https://wa.me/5599999999999"
                    />
                    <p className="mt-1 text-sm text-muted-foreground">
                      Este será o canal usado quando uma empresa concluir o
                      formulário de interesse em patrocínio.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="font-semibold">Identidade visual</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Estes dados são opcionais e podem ser adicionados depois.
                    </p>
                  </div>
                  <ImageField
                    id="church-logo"
                    label="Logotipo"
                    hint="Envie a marca da igreja ou informe uma URL."
                    value={form.logoUrl}
                    onUrlChange={(value) => updateField("logoUrl", value)}
                    file={logoFile}
                    onFileChange={setLogoFile}
                  />
                  <ImageField
                    id="church-cover"
                    label="Capa"
                    hint="Envie uma capa para a página pública ou informe uma URL."
                    value={form.coverUrl}
                    onUrlChange={(value) => updateField("coverUrl", value)}
                    file={coverFile}
                    onFileChange={setCoverFile}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="sponsorship-guidelines">
                      Orientações para patrocinadores
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Opcional. Inclua valores, entregas e instruções; use uma
                      linha para cada orientação.
                    </p>
                    <Textarea
                      id="sponsorship-guidelines"
                      value={form.sponsorshipGuidelines}
                      onChange={(event) =>
                        updateField("sponsorshipGuidelines", event.target.value)
                      }
                      placeholder="A partir de R$ 300: divulgação nas redes sociais e no telão."
                    />
                  </div>
                </>
              )}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-3 pt-2">
                {step === 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={saving}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                ) : null}
                <Button type="submit" className="flex-1" disabled={saving}>
                  {step === 1 ? (
                    "Continuar"
                  ) : saving ? (
                    "Salvando…"
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Criar igreja
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
