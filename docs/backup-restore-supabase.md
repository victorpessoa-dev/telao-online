# Backup e restore com Supabase

> Atenção: exclusões são definitivas. Teste o processo de restore antes de qualquer operação destrutiva.

## Backup

1. Exportar o schema e dados do projeto Supabase:
   ```bash
   npx supabase db dump --project-ref <project-ref> --debug > backup.sql
   ```
2. Fazer backup do bucket `telao-online-midia` via CLI do Storage ou painel do Supabase.
3. Exportar os arquivos que estiverem em uso pela aplicação para repositório seguro.

## Restore

1. Restaurar o schema com:
   ```bash
   npx supabase db reset --db-url <connection-string>
   ```
2. Aplicar o dump exportado se necessário.
3. Restaurar os objetos do bucket `telao-online-midia`.
4. Rodar o smoke test pós-deploy documentado em [smoke-test-pos-deploy.md](smoke-test-pos-deploy.md).
