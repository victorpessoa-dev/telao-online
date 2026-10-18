# Desktop V Playcast

Este diretório contém o processo principal e a ponte segura do Electron. O Electron abre o Next.js localmente; o código da interface continua em `app/` e `components/`.

## Desenvolvimento

```bash
npm run desktop:dev
```

O Electron inicia o Next.js em `127.0.0.1:3107` e abre a janela administrativa.

## Pacote Windows

```bash
npm run desktop:package
```

Gera uma versão não instalável de inspeção em `dist-electron/`. Para o instalador NSIS de distribuição:

```bash
npm run desktop:build:win
```

O `.exe` só deve ser criado em um ambiente Windows ou em CI Windows. Ele não é versionado; o código-fonte, scripts e configuração de empacotamento são versionados no GitHub.

## Segurança

- Renderer isolado (`contextIsolation`) e em sandbox.
- Sem Node.js no renderer.
- IPC restrito à API explícita em `preload.cjs`.
- Navegação limitada ao Next.js local; links HTTPS externos abrem no navegador padrão.
- O login usa e-mail e senha do Supabase e verifica `profiles.is_admin` antes de exibir o painel.
- A opção “Manter conectado neste computador” guarda apenas tokens de sessão criptografados por `safeStorage`/DPAPI; a senha nunca é armazenada.
- O token usado entre Electron e o Next.js local é aleatório por execução, fica somente em memória e é aceito apenas em `127.0.0.1`.
