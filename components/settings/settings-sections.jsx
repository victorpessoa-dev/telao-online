"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { HoverTip } from "@/components/shared/hover-tip";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BrandPreview,
  DesignAdjustmentDrop,
} from "@/components/settings/settings-page-parts";
import {
  defaultSponsorSettings,
  MAX_TELAO_DURATION_SECONDS,
} from "@/lib/mappers/settings";

export function SettingsHeader({ onReset, onSave, hasChanges, isSaving, isChurchReady }) {
  return (
    <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-muted-foreground">Ajuste as preferências gerais do sistema.</p>
      </div>
      <div className="flex w-full flex-col gap-2 xs:w-auto xs:flex-row">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2 xs:w-auto" disabled={!isChurchReady || isSaving}>
              <RotateCcw className="h-4 w-4" /> Restaurar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar configurações?</AlertDialogTitle>
              <AlertDialogDescription>Isso descarta os ajustes ainda não salvos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={onSave} disabled={!isChurchReady || !hasChanges || isSaving} className="w-full gap-2 xs:w-auto">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </header>
  );
}

export function SettingsTabs({ children }) {
  return <div className="space-y-6">{children}</div>;
}

export function AccountSettingsSection({ account, onAccountChange, onSaveAccount, isLoading, isSaving }) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordMismatch = Boolean(account.newPassword && account.confirmPassword && account.newPassword !== account.confirmPassword);
  const passwordButton = (visible, onToggle, label) => (
    <HoverTip label={label}>
      <button type="button" onClick={onToggle} disabled={isLoading || isSaving} aria-label={label} className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </HoverTip>
  );
  return (
    <Card>
      <CardHeader><CardTitle>Dados de login</CardTitle><CardDescription>Atualize o e-mail, o nome do perfil e a senha de acesso.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="account-email">E-mail de acesso</Label><Input id="account-email" type="email" autoComplete="email" value={account.email} onChange={(event) => onAccountChange("email", event.target.value)} disabled={isLoading || isSaving} /></div>
          <div className="space-y-2"><Label htmlFor="account-name">Nome do perfil</Label><Input id="account-name" autoComplete="name" value={account.displayName} onChange={(event) => onAccountChange("displayName", event.target.value)} disabled={isLoading || isSaving} /></div>
        </div>
        <div className="grid gap-5 rounded-lg border border-border p-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="account-new-password">Nova senha</Label><div className="relative"><Input id="account-new-password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={account.newPassword} onChange={(event) => onAccountChange("newPassword", event.target.value)} disabled={isLoading || isSaving} className="pr-10" />{passwordButton(showNewPassword, () => setShowNewPassword((value) => !value), showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha")}</div></div>
          <div className="space-y-2"><Label htmlFor="account-confirm-password">Confirmar nova senha</Label><div className="relative"><Input id="account-confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={account.confirmPassword} onChange={(event) => onAccountChange("confirmPassword", event.target.value)} disabled={isLoading || isSaving} aria-invalid={passwordMismatch} className="pr-10" />{passwordButton(showConfirmPassword, () => setShowConfirmPassword((value) => !value), showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha")}</div>{passwordMismatch ? <p className="text-xs text-destructive">As senhas não conferem.</p> : null}</div>
        </div>
        <Button onClick={onSaveAccount} disabled={isLoading || isSaving || passwordMismatch} className="w-full gap-2 sm:w-auto">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isSaving ? "Salvando..." : "Salvar dados de login"}</Button>
      </CardContent>
    </Card>
  );
}

export function TelaoSettingsSection({ settings, updateSettings }) {
  return <Card><CardHeader><CardTitle>Comportamento do telão</CardTitle><CardDescription>Defina a duração padrão para cada tipo de mídia.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">{[["defaultDurationImage", "imagem", "Aplicada a imagens dos patrocinadores."], ["defaultDurationVideo", "vídeo", "Define o trecho exibido para vídeos."]].map(([key, label, help]) => <div key={key} className="space-y-3 rounded-xl border border-border p-4"><Label>Duração de {label} ({settings.telao[key]}s)</Label><Slider value={[settings.telao[key]]} onValueChange={([value]) => updateSettings("telao", key, value)} min={3} max={MAX_TELAO_DURATION_SECONDS} step={1} /><p className="text-xs text-muted-foreground">{help}</p></div>)}</CardContent></Card>;
}

export function SponsorDesignSection({ sponsorSettings, onDesignChange, onDesignBatchChange, onUploadBackground }) {
  const [profile, setProfile] = useState("DESKTOP");
  const profiles = { MOBILE: "Mobile", TABLET: "Tablet", DESKTOP: "Desktop" };
  const settings = sponsorSettings.designs?.[profile] || defaultSponsorSettings.designs[profile];
  const defaults = defaultSponsorSettings.designs[profile];
  return <Card><CardHeader><CardTitle>Design dos patrocínios</CardTitle><CardDescription>Ajuste o fundo e a área de mídia do telão.</CardDescription></CardHeader><CardContent><div className="mb-5 grid grid-cols-3 gap-2" role="group" aria-label="Tamanho de tela">{Object.entries(profiles).map(([key, label]) => <Button key={key} type="button" size="sm" variant={profile === key ? "default" : "outline"} onClick={() => setProfile(key)}>{label}</Button>)}</div><DesignAdjustmentDrop profileLabel={profiles[profile]} previewClassName={profile === "MOBILE" ? "aspect-[9/16] max-w-[20rem]" : profile === "TABLET" ? "aspect-[4/3]" : "aspect-video"} settings={settings} onChange={(key, value) => onDesignChange(profile, key, value)} onModeChange={(checked) => onDesignBatchChange(profile, { enabled: checked, backgroundEnabled: checked })} onUpload={(file) => onUploadBackground(profile, file)} onRestore={() => onDesignBatchChange(profile, { contentWidth: defaults.contentWidth, contentHeight: defaults.contentHeight, x: defaults.x, y: defaults.y, objectFit: defaults.objectFit })} /></CardContent></Card>;
}

export function AppearanceSettingsSection({ settings, updateSettings, onUploadParishLogo, onUploadParishCover }) {
  const appearance = settings.appearance;
  const links = Array.isArray(appearance.parishSocialLinks) ? appearance.parishSocialLinks : [];
  const update = (key, value) => updateSettings("appearance", key, value);
  return <Card><CardHeader><CardTitle>Visual público</CardTitle><CardDescription>Organize a identidade e os dados da paróquia.</CardDescription></CardHeader><CardContent className="space-y-6"><BrandPreview parishName={appearance.parishName} parishCity={appearance.parishCity} parishLogoUrl={appearance.parishLogoUrl} parishCoverUrl={appearance.parishCoverUrl} socialLinks={{ extra: links }} /><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-4"><div className="space-y-2"><Label>Nome da paróquia</Label><Input value={appearance.parishName} onChange={(event) => update("parishName", event.target.value)} /></div><div className="space-y-2"><Label>Cidade</Label><Input value={appearance.parishCity} onChange={(event) => update("parishCity", event.target.value)} /></div><div className="space-y-2"><Label>Logo da paróquia</Label><Input value={appearance.parishLogoUrl} onChange={(event) => update("parishLogoUrl", event.target.value)} /><FileDropzone accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onFileSelect={onUploadParishLogo} title="Enviar logo" /></div><div className="space-y-2"><Label>Capa pública</Label><Input value={appearance.parishCoverUrl} onChange={(event) => update("parishCoverUrl", event.target.value)} /><FileDropzone accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onFileSelect={onUploadParishCover} title="Enviar capa" /></div></div><div className="space-y-4"><div className="space-y-2"><Label>Orientações para patrocinadores</Label><Textarea value={appearance.parishSponsorshipGuidelines} onChange={(event) => update("parishSponsorshipGuidelines", event.target.value)} className="min-h-36" /></div><div className="space-y-2"><Label>WhatsApp para patrocínios</Label><Input type="tel" value={appearance.parishSponsorshipWhatsApp || ""} onChange={(event) => update("parishSponsorshipWhatsApp", event.target.value)} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Redes sociais</Label><Button type="button" size="sm" variant="outline" onClick={() => update("parishSocialLinks", [...links, { label: "", url: "" }])}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></div>{links.map((link, index) => <div key={index} className="flex gap-2"><Input value={link.label || ""} placeholder="Nome" onChange={(event) => update("parishSocialLinks", links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><Input value={link.url || ""} placeholder="https://" onChange={(event) => update("parishSocialLinks", links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /><Button type="button" size="icon" variant="outline" aria-label="Remover rede social" onClick={() => update("parishSocialLinks", links.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div></div></CardContent></Card>;
}

export function DataSettingsSection({
  onExport,
  onImport,
  onClearData,
  onResetDisplayStatistics,
}) {
  const [file, setFile] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const canReset = confirmation.trim().toUpperCase() === "ZERAR EXIBIÇÕES";

  const confirmReset = async () => {
    if (!canReset || isResetting) return;
    setIsResetting(true);
    try {
      await onResetDisplayStatistics();
      setResetOpen(false);
      setConfirmation("");
    } catch {
      // The caller reports the service error through a toast and leaves the
      // dialog open so the administrator can read it and try again safely.
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Tabs defaultValue="backup" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="backup">Backup</TabsTrigger>
        <TabsTrigger value="danger">Perigo</TabsTrigger>
      </TabsList>
      <TabsContent value="backup">
        <Card>
          <CardHeader>
            <CardTitle>Backup e restauração</CardTitle>
            <CardDescription>
              Exporte ou importe as configurações e o conteúdo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button variant="outline" onClick={onExport} className="w-full gap-2">
              <Download className="h-4 w-4" /> Exportar dados
            </Button>
            <FileDropzone accept="application/json,.json" onFileSelect={setFile} title="Selecione um backup" description="Arquivo JSON exportado pelo Telão Online" />
            {file ? <Button onClick={() => { onImport(file); setFile(null); }} className="w-full">Importar backup</Button> : null}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="danger" className="space-y-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Zona de perigo</CardTitle>
            <CardDescription>Ações irreversíveis sobre os dados administrativos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium">Redefinir dados administrativos</p><p className="text-sm text-muted-foreground">Apaga patrocínios e redefine as configurações.</p></div>
            <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Redefinir dados</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isso apagará os patrocínios e redefinirá as configurações administrativas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive-hover">Sim, redefinir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><RotateCcw className="h-5 w-5" />Zerar estatísticas de exibição</CardTitle>
            <CardDescription>Remove as contagens e o histórico de exibições, sem apagar os patrocinadores.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">A contagem deve estar desativada e não pode haver sessões ativas no telão.</p>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>Zerar estatísticas</Button>
          </CardContent>
        </Card>
      </TabsContent>
      <AlertDialog open={resetOpen} onOpenChange={(open) => { if (!isResetting) { setResetOpen(open); if (!open) setConfirmation(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Zerar estatísticas de exibição?</AlertDialogTitle><AlertDialogDescription>Esta ação apaga todos os totais e o histórico de exibições desta igreja. Digite <strong>ZERAR EXIBIÇÕES</strong> para confirmar.</AlertDialogDescription></AlertDialogHeader>
          <Label htmlFor="reset-statistics-confirmation">Confirmação</Label>
          <Input id="reset-statistics-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ZERAR EXIBIÇÕES" disabled={isResetting} autoComplete="off" />
          <AlertDialogFooter><AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); confirmReset(); }} disabled={!canReset || isResetting} className="bg-destructive text-destructive-foreground hover:bg-destructive-hover">{isResetting ? "Zerando..." : "Zerar estatísticas"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
