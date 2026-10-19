"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import ErrorPageLayout from "@/components/shared/error-page-layout";
import { Button } from "@/components/ui/button";

export default function PageError({
  title = "Não foi possível carregar esta página.",
  description = "Tente novamente. Se o problema persistir, volte para a página inicial.",
  onRetry,
  homeHref = "/",
  homeLabel = "Página inicial",
  eyebrow = "Algo deu errado",
}) {
  return (
    <ErrorPageLayout
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={TriangleAlert}
    >
      {onRetry ? (
        <Button type="button" className="flex-1" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      ) : null}
      <Button asChild variant="outline" className="flex-1">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </ErrorPageLayout>
  );
}
