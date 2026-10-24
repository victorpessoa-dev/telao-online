import Link from "next/link";
import { ArrowLeft, LogIn, SearchX } from "lucide-react";
import ErrorPageLayout from "@/components/shared/error-page-layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ErrorPageLayout
      eyebrow="Erro 404"
      title="Esta página não foi encontrada."
      description="O endereço pode ter sido alterado, removido ou digitado incorretamente."
      icon={SearchX}
    >
      <Button asChild className="flex-1">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Página inicial
        </Link>
      </Button>
      <Button asChild variant="outline" className="flex-1">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Entrar no painel
        </Link>
      </Button>
    </ErrorPageLayout>
  );
}
