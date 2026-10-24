# Relatório Técnico e Direção do Projeto

## Estado atual

Telão Online é um sistema web multi-igreja. A aplicação centraliza patrocinadores, mídias, telões e relatórios, com dados separados por igreja no Supabase.

## Fluxo técnico

```mermaid
flowchart LR
  Admin[Painel administrativo] --> Sponsors[Patrocinadores e mídias]
  Sponsors --> Schedule[Agenda do telão]
  Schedule --> Player[Telão público]
  Player --> Metrics[Métricas de exibição]
  Metrics --> Reports[Relatórios públicos]
  Visitor[Visitante] --> Churches[/igrejas]
  Churches --> Profile[Perfil público por slug]
  Profile --> Partners[Parceiros e formulário de interesse]
```

## Pontos de atenção

- Manter migrations, schema e documentação sincronizados.
- Validar RLS, RPCs e Storage sempre que mudar uma entidade pública ou administrativa.
- Preservar testes de upload, reprodução e métricas ao evoluir a interface.
- Acompanhar erros de autenticação, APIs e sessão oficial sem registrar dados sensíveis.

## Evolução planejada

Cloudflare R2 permanece como próxima evolução de infraestrutura de mídia. Os documentos de plano e execução descrevem os pré-requisitos; a implementação não faz parte do escopo atual.
