# Atualização futura: Grade de TV

Esta funcionalidade está planejada, mas não está ativa nem exposta no painel.

Quando for retomada, a Grade de TV deverá:

- ser acessível somente a administradores;
- reutilizar `lib/services/telao-schedule.js`, a mesma agenda determinística do telão público;
- mostrar exatamente oito ciclos por vez e trocar automaticamente entre os grupos 1–8, 9–16 e seguintes;
- exibir blocos proporcionais à duração de cada patrocinador, com cores determinísticas derivadas do identificador;
- mostrar detalhes completos no hover e no toque, sem carregar imagens ou vídeos;
- destacar o ciclo ativo apenas quando a contagem oficial estiver habilitada;
- não gerar impressões, visualizações, segundos exibidos ou novas consultas ao banco por ciclo, hover ou destaque;
- usar as APIs de agenda e cache já existentes, sem criar sequências fixas ou um algoritmo independente do telão.

Antes de implementar, confirmar que a agenda global, a versão do cronograma e a sincronização por horário do servidor continuam sendo a fonte de verdade para o telão público.
