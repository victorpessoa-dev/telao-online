"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import ErrorPageLayout from "@/components/shared/error-page-layout";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Route rendering failed:", error);
  }, [error]);

  return (
    <ErrorPageLayout
      eyebrow="Algo deu errado"
      title="Não foi possível carregar esta página."
      description="Tente novamente. Se o problema persistir, volte para a página inicial."
      icon={TriangleAlert}
    >
      <Button type="button" className="flex-1" onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Tentar novamente
      </Button>
      <Button asChild variant="outline" className="flex-1">
        <Link href="/">Página inicial</Link>
      </Button>
    </ErrorPageLayout>
  );
}
