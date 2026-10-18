"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("vplaycast:theme", theme);
}

export default function DesktopConfigurationGate({ children }) {
  const { churchSlug, isLoaded } = useStore();
  const [config, setConfig] = useState({ theme: "dark", siteUrl: "" });
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [validated, setValidated] = useState(null);
  const [error, setError] = useState("");

  const desktop = typeof window !== "undefined" ? window.vPlaycastDesktop : null;

  useEffect(() => {
    if (!desktop) return;
    desktop.config
      .get()
      .then((saved) => {
        setConfig(saved);
        applyTheme(saved.theme);
        setReady(Boolean(saved.siteUrl));
      })
      .catch(() => setError("Não foi possível abrir a configuração local."));
  }, [desktop]);

  if (!desktop || ready) return children;
  if (!isLoaded) return null;

  const validate = async () => {
    setChecking(true);
    setError("");
    setValidated(null);
    try {
      const result = await desktop.config.validateSite(config.siteUrl, churchSlug);
      setValidated(result);
      if (!result.valid) setError(`A rota retornou HTTP ${result.status || "sem resposta"}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar a rota.");
    } finally {
      setChecking(false);
    }
  };

  const confirm = async () => {
    if (!validated?.valid) return;
    setChecking(true);
    setError("");
    try {
      const saved = await desktop.config.save(config, churchSlug);
      applyTheme(saved.theme);
      setReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a configuração.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5 text-primary" />Configurar V Playcast</CardTitle>
          <CardDescription>Defina a aparência e valide o endereço público da sua igreja antes de abrir o painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: "dark", label: "Escuro", Icon: Moon }, { value: "light", label: "Claro", Icon: Sun }].map(({ value, label, Icon }) => (
                <Button key={value} type="button" variant={config.theme === value ? "default" : "outline"} onClick={() => { setConfig((current) => ({ ...current, theme: value })); setValidated(null); }}>
                  <Icon className="mr-2 h-4 w-4" />{label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desktop-site-url">Link web do site</Label>
            <Input id="desktop-site-url" type="url" value={config.siteUrl} onChange={(event) => { setConfig((current) => ({ ...current, siteUrl: event.target.value })); setValidated(null); }} placeholder="https://seu-site.com" autoComplete="url" />
            <p className="text-xs text-muted-foreground">Vamos verificar <code>{churchSlug ? `/${churchSlug}/ads-telao` : "/{slug}/ads-telao"}</code> nesse domínio.</p>
          </div>
          {validated?.valid ? <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Rota confirmada: {validated.routeUrl}</p> : null}
          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={validate} disabled={checking || !churchSlug}>{checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Testar rota</Button><Button type="button" onClick={confirm} disabled={checking || !validated?.valid}>Confirmar</Button></div>
        </CardContent>
      </Card>
    </main>
  );
}
