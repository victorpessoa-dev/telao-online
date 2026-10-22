# Documentação - vPlayCast

## Comece Aqui

- [O que e o projeto e como funciona](./projeto-como-funciona.md)
- [Visao geral e arquitetura](./visao-geral.md)
- [Guia do usuario](./guia-do-usuario.md)
- [Guia do desenvolvedor](./guia-do-desenvolvedor.md)
- [Configuração de ambiente passo a passo](./configuracao-de-ambiente.md)

## Referencias Tecnicas

- [Estrutura de pastas](./estrutura-de-pastas.md)
- [Fluxos da aplicacao](./fluxos.md)
- [Banco de dados](./banco-de-dados.md)
- [APIs](./apis.md)
- [Componentes, hooks, services e providers](./componentes-hooks-services.md)
- [Cache e midia](./cache-e-midia.md)
- [Grade TV administrativa](./atualizacao-futura-grade-tv.md)
- [Plano de integracao Cloudflare R2](./plano-cloudflare-r2.md)
- [Plano de execucao da integracao Cloudflare R2](./plano-execucao-cloudflare-r2.md)
- [Planejamento versionado do projeto](./planejamento/README.md)
- [Autenticacao, seguranca, logs e operacao](./seguranca-operacao.md)
- [Deploy, ambientes e operacao](./deploy.md)
- [Docker, build e testes](./devops-testes.md)
- [Backup e restore Supabase](./backup-restore-supabase.md)
- [Smoke test pos-deploy](./smoke-test-pos-deploy.md)
- [Convencoes, FAQ e glossario](./convencoes-faq-glossario.md)
- [Relatorio tecnico e roadmap](./relatorio-tecnico.md)

## Mapa Rapido

```mermaid
flowchart TD
  A[Operação vPlayCast] --> B[Painel admin]
  B --> C[Patrocinadores]
  B --> D[Overlays]
  C --> E[Telao NORMAL e MASTER]
  E --> F[Metricas e relatorios publicos]
  D --> G[Links /{slug}/shared para transmissao]
```

## Convencao

Os documentos descrevem o estado atual do projeto. Quando uma migration, rota ou regra de negocio mudar, atualize a pagina correspondente junto com o codigo.
