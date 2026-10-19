"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, Globe, Monitor, Palette, UserRound } from "lucide-react";
import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStore } from "@/lib/store/store";
import {
  defaultAdminSettings,
  mergeAdminSettings,
} from "@/lib/mappers/settings";
import {
  getAdminSettings,
  resetAdministrativeData,
  resetAdminSettings,
  saveAdminSettings,
} from "@/lib/services/settings";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";
import {
  deleteUploadedMediaBatch,
  uploadMedia,
} from "@/services/supabase/upload";
import {
  getChurchAppearance,
  mapChurchAppearance,
  saveChurchAppearance,
  setChurchRouteActive,
} from "@/lib/services/churches";
import {
  AccountSettingsSection,
  AppearanceSettingsSection,
  DataSettingsSection,
  SettingsHeader,
  SettingsTabs,
  SponsorDesignSection,
  TelaoSettingsSection,
} from "@/components/settings/settings-sections";

export default function ConfiguracoesPage() {
  const [initialTab, setInitialTab] = useState("telao");
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (["telao", "appearance", "data", "account"].includes(requestedTab)) {
      setInitialTab(requestedTab);
    }
  }, []);
  const { sponsorSettings, updateSponsorSettings, ads, churchId, reload } =
    useStore();
  const [settings, setSettings] = useState(defaultAdminSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingStorageCleanup, setPendingStorageCleanup] = useState([]);
  const [account, setAccount] = useState({
    userId: "",
    email: "",
    originalEmail: "",
    displayName: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [isAccountSaving, setIsAccountSaving] = useState(false);
  const [isPublicRouteActive, setIsPublicRouteActive] = useState(false);
  const [isPublicRouteLoading, setIsPublicRouteLoading] = useState(true);

  useEffect(() => {
    if (!churchId) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("churches")
      .select("is_active")
      .eq("id", churchId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        setIsPublicRouteActive(Boolean(data?.is_active));
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar a rota pública",
        ),
      )
      .finally(() => setIsPublicRouteLoading(false));
  }, [churchId]);

  const changePublicRoute = async (active) => {
    const previous = isPublicRouteActive;
    setIsPublicRouteActive(active);
    try {
      await setChurchRouteActive(
        createSupabaseBrowserClient(),
        churchId,
        active,
      );
      toast.success(
        active ? "Página pública ativada" : "Página pública desativada",
      );
    } catch (error) {
      setIsPublicRouteActive(previous);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a rota pública",
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!churchId) return;

      try {
        const supabase = createSupabaseBrowserClient();
        const [loadedSettings, church, userResult] = await Promise.all([
          getAdminSettings(supabase, churchId),
          getChurchAppearance(supabase, churchId),
          supabase.auth.getUser(),
        ]);

        if (userResult.error) throw userResult.error;

        const user = userResult.data.user;
        let displayName = user?.user_metadata?.name || "";

        if (user?.id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError) throw profileError;
          displayName = profile?.display_name || displayName;
        }

        if (mounted) {
          setSettings({
            ...loadedSettings,
            appearance: mapChurchAppearance(church),
          });
          setAccount({
            userId: user?.id || "",
            email: user?.email || "",
            originalEmail: user?.email || "",
            displayName,
            newPassword: "",
            confirmPassword: "",
          });
          setIsAccountLoading(false);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar configurações",
        );
        if (mounted) setIsAccountLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, [churchId]);

  const updateSettings = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const updateAccount = (key, value) => {
    setAccount((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveAccount = async () => {
    const nextEmail = account.email.trim();
    const nextDisplayName = account.displayName.trim();
    const nextPassword = account.newPassword;

    if (!nextEmail) {
      toast.error("Informe um email de acesso");
      return;
    }

    if (nextPassword || account.confirmPassword) {
      if (nextPassword.length < 6) {
        toast.error("A nova senha precisa ter pelo menos 6 caracteres");
        return;
      }

      if (nextPassword !== account.confirmPassword) {
        toast.error("As senhas não conferem");
        return;
      }
    }

    setIsAccountSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const authUpdates = {
        data: {
          name: nextDisplayName,
        },
      };

      if (nextEmail !== account.originalEmail) {
        authUpdates.email = nextEmail;
      }

      if (nextPassword) {
        authUpdates.password = nextPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw authError;

      if (account.userId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ display_name: nextDisplayName || null })
          .eq("id", account.userId);

        if (profileError) throw profileError;
      }

      setAccount((prev) => ({
        ...prev,
        email: nextEmail,
        originalEmail: nextEmail,
        displayName: nextDisplayName,
        newPassword: "",
        confirmPassword: "",
      }));

      toast.success(
        nextEmail !== account.originalEmail
          ? "Dados atualizados. Confirme o novo email se o Supabase solicitar."
          : "Dados de login atualizados",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar dados de login",
      );
    } finally {
      setIsAccountSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!churchId) {
      toast.error("Cadastre sua igreja antes de salvar configurações.");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const [savedSettings, appearance] = await Promise.all([
        saveAdminSettings(supabase, settings, churchId),
        saveChurchAppearance(supabase, churchId, settings.appearance),
      ]);
      const storageErrors = await deleteUploadedMediaBatch(
        pendingStorageCleanup,
      );
      setSettings({ ...savedSettings, appearance });
      setPendingStorageCleanup([]);
      setHasChanges(false);
      await reload();
      if (storageErrors.length)
        toast.warning(
          "Configurações salvas, mas alguns arquivos antigos não puderam ser removidos",
        );
      else toast.success("Configurações salvas com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configurações",
      );
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const resetSettings = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const resetSettingsValue = await resetAdminSettings(supabase, churchId);
      setSettings((current) => ({
        ...resetSettingsValue,
        appearance: current.appearance,
      }));
      setHasChanges(false);
      await reload();
      toast.success("Configurações restauradas");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao restaurar configurações",
      );
    }
  };

  const exportData = () => {
    const data = {
      settings,
      sponsorSettings,
      sponsors: ads,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vplaycast-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados com sucesso");
  };

  const importData = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        if (!data.settings)
          throw new Error("O arquivo não possui configurações válidas");

        const supabase = createSupabaseBrowserClient();
        const importedSettings = mergeAdminSettings(data.settings);
        const [normalizedSettings, appearance] = await Promise.all([
          saveAdminSettings(supabase, importedSettings, churchId),
          saveChurchAppearance(
            supabase,
            churchId,
            data.settings.appearance || settings.appearance,
          ),
        ]);
        setSettings({ ...normalizedSettings, appearance });
        setHasChanges(false);
        await reload();
        toast.success("Configurações importadas com sucesso");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Arquivo inválido",
        );
      }
    };

    reader.readAsText(file);
  };

  const clearAllData = async () => {
    try {
      const storedFiles = [
        ...ads.map((ad) => ad.src),
        sponsorSettings.designs.SHARED?.backgroundUrl,
        sponsorSettings.designs.NORMAL?.backgroundUrl,
        sponsorSettings.designs.MASTER?.backgroundUrl,
      ];
      const supabase = createSupabaseBrowserClient();
      const resetSettingsValue = await resetAdministrativeData(
        supabase,
        churchId,
      );
      const storageErrors = await deleteUploadedMediaBatch(storedFiles);
      setSettings((current) => ({
        ...resetSettingsValue,
        appearance: current.appearance,
      }));
      setHasChanges(false);
      await reload();
      if (storageErrors.length)
        toast.warning(
          "Dados redefinidos, mas alguns arquivos não puderam ser removidos",
        );
      else
        toast.success(
          "Patrocínios e configurações administrativas foram redefinidos",
        );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao apagar dados",
      );
    }
  };

  const updateSponsorDesignValues = async (values) => {
    try {
      await updateSponsorSettings({
        designs: {
          SHARED: {
            ...sponsorSettings.designs.SHARED,
            ...values,
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar design",
      );
    }
  };

  const updateSponsorDesign = async (key, value) => {
    await updateSponsorDesignValues({ [key]: value });
  };

  const uploadSponsorBackground = async (file) => {
    if (!file) return;
    const previousUrl = sponsorSettings.designs.SHARED?.backgroundUrl || "";
    if (
      previousUrl &&
      !window.confirm(
        "Substituir a imagem de fundo? O arquivo antigo será excluído após a confirmação.",
      )
    )
      return;
    try {
      const url = await uploadMedia(file, "sponsors");
      await updateSponsorDesign("backgroundUrl", url);
      const storageErrors = await deleteUploadedMediaBatch([previousUrl]);
      if (storageErrors.length) {
        toast.warning(
          "Nova imagem salva, mas o arquivo antigo não pôde ser removido",
        );
        return;
      }
      toast.success("Imagem de fundo enviada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao enviar a imagem de fundo",
      );
    }
  };

  const uploadParishLogo = async (file) => {
    if (!file) return;
    const previousUrl = settings.appearance.parishLogoUrl;
    if (
      previousUrl &&
      !window.confirm(
        "Substituir a logo? O arquivo antigo será excluído quando as configurações forem salvas.",
      )
    )
      return;
    try {
      const url = await uploadMedia(file, "branding", churchId);
      updateSettings("appearance", "parishLogoUrl", url);
      setPendingStorageCleanup((current) => [...current, previousUrl]);
      toast.success("Logo enviada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar logo",
      );
    }
  };

  const uploadParishCover = async (file) => {
    if (!file) return;
    const previousUrl = settings.appearance.parishCoverUrl;
    if (
      previousUrl &&
      !window.confirm(
        "Substituir a capa? O arquivo antigo será excluído quando as configurações forem salvas.",
      )
    )
      return;
    try {
      const url = await uploadMedia(file, "branding", churchId);
      updateSettings("appearance", "parishCoverUrl", url);
      setPendingStorageCleanup((current) => [...current, previousUrl]);
      toast.success("Capa enviada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar capa",
      );
    }
  };

  return (
    <PageContainer>
      <SettingsHeader
        onReset={resetSettings}
        onSave={saveSettings}
        hasChanges={hasChanges}
        isSaving={isSaving}
        isChurchReady={isClientReady && Boolean(churchId)}
      />
      {!churchId && (
        <div className="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Cadastre sua igreja para habilitar as configurações.</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/configurar-igreja">Cadastrar igreja</Link>
          </Button>
        </div>
      )}

      <Tabs key={initialTab} defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="telao" className="gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Telão</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">Conta</span>
          </TabsTrigger>
        </TabsList>

        <SettingsTabs>
          <TabsContent value="telao" className="space-y-6">
            <TelaoSettingsSection
              settings={settings}
              updateSettings={updateSettings}
            />
            <SponsorDesignSection
              sponsorSettings={sponsorSettings}
              onDesignChange={updateSponsorDesign}
              onDesignBatchChange={updateSponsorDesignValues}
              onUploadBackground={uploadSponsorBackground}
            />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Globe className="h-4 w-4 text-primary" />
                    Página pública da igreja
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Quando ativa, sua igreja aparece na landing page e libera /
                    {`{slug}`}, /ads-telao e /anunciantes.
                  </p>
                </div>
                <Switch
                  checked={isPublicRouteActive}
                  disabled={isPublicRouteLoading || !churchId}
                  onCheckedChange={changePublicRoute}
                  aria-label="Ativar página pública"
                  className="self-start sm:self-auto"
                />
              </div>
            </section>
            <AppearanceSettingsSection
              settings={settings}
              updateSettings={updateSettings}
              onUploadParishLogo={uploadParishLogo}
              onUploadParishCover={uploadParishCover}
            />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataSettingsSection
              onExport={exportData}
              onImport={importData}
              onClearData={clearAllData}
            />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <AccountSettingsSection
              account={account}
              onAccountChange={updateAccount}
              onSaveAccount={saveAccount}
              isLoading={isAccountLoading}
              isSaving={isAccountSaving}
            />
          </TabsContent>
        </SettingsTabs>
      </Tabs>
    </PageContainer>
  );
}
