"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { mapSponsorStoreRow } from "@/lib/mappers/sponsors";
import {
  defaultAdminSettings,
  defaultSponsorSettings,
  mergeAdminSettings,
  mergeSponsorSettings,
} from "@/lib/mappers/settings";
import { deleteSponsorById, listSponsors } from "@/lib/repositories/sponsors";
import {
  createSponsorForAdmin,
  updateSponsorForAdmin,
} from "@/lib/services/sponsors";
import { getAppSetting, upsertAppSetting } from "@/lib/repositories/settings";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";
import { deleteUploadedMediaBatch } from "@/services/supabase/upload";
import { withTimeout } from "@/lib/utils/async";

const StoreContext = createContext(null);
const INITIAL_LOAD_TIMEOUT_MS = 15_000;

export function StoreProvider({ children }) {
  const [ads, setAds] = useState([]);
  const [sponsorSettings, setSponsorSettings] = useState(
    defaultSponsorSettings,
  );
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [churchId, setChurchId] = useState("");
  const [churchSlug, setChurchSlug] = useState("");
  const [publicViews, setPublicViews] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await withTimeout(
        supabase.auth.getUser(),
        INITIAL_LOAD_TIMEOUT_MS,
        "A sessão demorou demais para responder. Tente novamente.",
      );
      if (!user) throw new Error("Sessão administrativa não encontrada");

      const { data: church, error: associationError } = await withTimeout(
        supabase
          .from("churches")
          .select("id, slug, public_views")
          .eq("admin_id", user.id)
          .maybeSingle(),
        INITIAL_LOAD_TIMEOUT_MS,
        "A igreja demorou demais para responder. Tente novamente.",
      );

      if (associationError) throw associationError;
      if (!church?.id) throw new Error("Nenhuma igreja vinculada a esta conta");
      setChurchId(church.id);
      setChurchSlug(church.slug || "");
      setPublicViews(Number(church.public_views) || 0);

      const [sponsorRows, sponsorSettingsValue, adminSettingsValue] =
        await withTimeout(
          Promise.all([
            listSponsors(supabase, church.id),
            getAppSetting(supabase, "sponsor_settings", church.id),
            getAppSetting(supabase, "admin_settings", church.id),
          ]),
          INITIAL_LOAD_TIMEOUT_MS,
          "O painel demorou demais para carregar. Tente novamente.",
        );

      setAds(sponsorRows.map(mapSponsorStoreRow));
      setSponsorSettings(mergeSponsorSettings(sponsorSettingsValue));
      setAdminSettings(mergeAdminSettings(adminSettingsValue));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao carregar dados do Supabase",
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createAd = useCallback(
    async (ad) => {
      const supabase = createSupabaseBrowserClient();
      const newAd = await createSponsorForAdmin(supabase, ad, churchId);
      setAds((prev) => [newAd, ...prev]);
      return newAd;
    },
    [churchId],
  );

  const updateAd = useCallback(
    async (id, updates) => {
      const current = ads.find((ad) => ad.id === id);
      if (!current) throw new Error("Patrocínio não encontrado para atualizar");

      const supabase = createSupabaseBrowserClient();
      const mapped = await updateSponsorForAdmin(
        supabase,
        current,
        updates,
        churchId,
      );
      setAds((prev) => prev.map((ad) => (ad.id === id ? mapped : ad)));
      return mapped;
    },
    [ads, churchId],
  );

  const deleteAd = useCallback(
    async (id) => {
      const ad = ads.find((item) => item.id === id);
      const supabase = createSupabaseBrowserClient();
      await deleteSponsorById(supabase, id, churchId);
      setAds((prev) => prev.filter((ad) => ad.id !== id));
      return {
        storageErrors: await deleteUploadedMediaBatch([ad?.src]),
      };
    },
    [ads, churchId],
  );

  const updateSponsorSettings = useCallback(
    async (updates) => {
      const previous = sponsorSettings;
      const merged = mergeSponsorSettings({
        ...sponsorSettings,
        ...updates,
        designs: {
          ...sponsorSettings.designs,
          ...(updates.designs || {}),
        },
      });

      setSponsorSettings(merged);

      const supabase = createSupabaseBrowserClient();
      try {
        await upsertAppSetting(supabase, "sponsor_settings", merged, churchId);
      } catch (requestError) {
        setSponsorSettings(previous);
        throw requestError;
      }
    },
    [churchId, sponsorSettings],
  );

  const value = {
    data: { ads, sponsorSettings, adminSettings },
    error,
    isLoaded,
    ads,
    sponsorSettings,
    adminSettings,
    churchId,
    churchSlug,
    publicViews,
    reload: loadData,
    createAd,
    updateAd,
    deleteAd,
    updateSponsorSettings,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
