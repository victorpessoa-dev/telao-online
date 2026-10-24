# Smoke test pós-deploy

> Use um slug de igreja ativa em todos os testes de rotas públicas.

Depois de publicar a aplicação, valide os pontos abaixo em ordem rápida:

1. Acessar `/` ou `/login` e confirmar que a interface carrega sem erro de renderização.
2. Confirmar `/painel-telao` e `/configuracoes` abrem com dados do Supabase carregados.
3. Abrir `/{slug}/ads-telao` e verificar se ao menos um patrocinador ativo aparece.
4. Solicitar `/api/igrejas`, abrir `/{slug}` e validar os dados públicos.
5. Confirmar que a rota `/api/parceiros/logs` aceita um payload simples e responde `200` ou `400` com mensagem clara.
6. Verificar se uploads para o bucket `telao-online-midia` funcionam para um arquivo de teste pequeno.
