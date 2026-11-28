"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingState from "@/components/shared/loading-state";
import TelaoPlayer from "@/components/sponsors/telao-player";
import AnuncianteDetalhePage from "@/components/public/advertiser-detail-page";

function useChurchFromSlug() {
  const params = useParams();
  const slug = typeof params?.churchSlug === "string" ? params.churchSlug : "";
  const [state, setState] = useState({
    church: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    if (!slug) return undefined;
    fetch(`/api/igreja/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || "Igreja não encontrada");
        if (!cancelled)
          setState({ church: payload.church, loading: false, error: "" });
      })
      .catch((cause) => {
        if (!cancelled)
          setState({
            church: null,
            loading: false,
            error:
              cause instanceof Error ? cause.message : "Igreja não encontrada",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { ...state, slug };
}

function ChurchGate({ children }) {
  const context = useChurchFromSlug();
  if (context.loading)
    return <LoadingState fullScreen label="Carregando igreja..." />;
  if (!context.church)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center text-destructive">
        {context.error}
      </main>
    );
  return children(context);
}

export function ChurchTelaoPage() {
  const params = useParams();
  const slug = typeof params?.churchSlug === "string" ? params.churchSlug : "";

  return (
    <TelaoPlayer
      kind="ALL"
      backgroundMode="always"
      churchSlug={slug}
    />
  );
}

export function ChurchAdvertiserPage() {
  const params = useParams();
  const churchSlug =
    typeof params?.churchSlug === "string" ? params.churchSlug : "";
  const sponsorSlug =
    typeof params?.sponsorSlug === "string" ? params.sponsorSlug : "";

  return (
    <ChurchGate>
      {({ church }) => (
        <AnuncianteDetalhePage
          churchId={church.id}
          churchSlug={churchSlug}
          sponsorSlug={sponsorSlug}
        />
      )}
    </ChurchGate>
  );
}
