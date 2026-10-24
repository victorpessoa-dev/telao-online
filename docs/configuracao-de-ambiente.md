# Configuração de ambiente passo a passo

Este guia configura a aplicação localmente, no Docker ou em uma plataforma de deploy. Nunca cole chaves reais em documentos, commits ou componentes de cliente.

## 1. Criar o arquivo local

Na raiz do projeto, copie o modelo:

```powershell
Copy-Item .env.example .env
```

O `.env` é ignorado pelo Git. Mantenha apenas `.env.example` versionado.

## 2. Obter as credenciais públicas do Supabase

No painel do projeto Supabase, abra **Project Settings > API** e copie:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-ou-anon-key>
```

Essas variáveis são usadas pelo navegador e pelo servidor. O prefixo `NEXT_PUBLIC_` significa que seu valor pode chegar ao navegador; não use esse prefixo em segredos.

## 3. Definir a URL da aplicação

Use a URL que o usuário realmente abre, sem barra final:

```env
# Desenvolvimento local
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Produção (exemplo)
# NEXT_PUBLIC_SITE_URL=https://playcast.exemplo.com.br
```

Ela é usada pelo Supabase para direcionar o administrador convidado à página `/confirmar-convite`.

## 4. Configurar a chave de serviço do Supabase

Ainda em **Project Settings > API**, copie a chave `service_role` e preencha:

```env
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Essa chave cria convites via Supabase Auth. Ela ignora RLS, portanto deve existir somente no servidor, no `.env` local e no cofre de variáveis da plataforma de deploy. Nunca a exponha em código de cliente, logs ou respostas de API.

## 5. Criar a chave do endpoint de convite

Gere um segredo aleatório longo, por exemplo no PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Adicione o valor gerado:

```env
PROVISIONING_API_KEY=<segredo-aleatorio>
```

Quem chamar `POST /api/admin/invites` precisa enviar exatamente essa chave no cabeçalho `x-provisioning-key`. Guarde-a em um sistema de backend ou cofre de segredos; não a coloque em formulários públicos.

## 6. Configurar o Supabase Auth

Em **Authentication > URL Configuration**:

1. Defina a Site URL como `NEXT_PUBLIC_SITE_URL`.
2. Adicione `${NEXT_PUBLIC_SITE_URL}/confirmar-convite` e `${NEXT_PUBLIC_SITE_URL}/redefinir-senha` em **Redirect URLs**.
3. Adicione também `http://localhost:3000/confirmar-convite` e `http://localhost:3000/redefinir-senha` para desenvolvimento local, se necessário.
4. Desative cadastros públicos. Contas administrativas devem ser criadas por convite.

O fluxo esperado é: API protegida envia o convite → email do Supabase → `/confirmar-convite` → definição de senha → `/configurar-igreja` → criação da igreja do próprio administrador.

## 7. Aplicar o banco

Para um projeto já existente, aplique as migrations de `supabase/migrations/`, em especial `20261016_002_single_admin_auth_and_irreversible_deletes.sql`.

Para um projeto novo, use `supabase/schema.sql` como snapshot consolidado. Não execute o snapshot inteiro em um banco já existente.

## 8. Executar e validar

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000/login`. Para validar o container, preencha `.env` e execute:

```powershell
docker compose up --build
```

## Checklist de produção

- [ ] As cinco variáveis estão preenchidas no provedor de deploy.
- [ ] `NEXT_PUBLIC_SITE_URL` usa HTTPS e o domínio definitivo.
- [ ] Os redirects `/confirmar-convite` e `/redefinir-senha` foram autorizados no Supabase.
- [ ] Cadastros públicos estão desativados.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` e `PROVISIONING_API_KEY` não aparecem em cliente, Git ou logs.
- [ ] A migration foi aplicada e uma igreja ativa aparece em `/igrejas` (ou abre pelo slug quando for a única ativa).
