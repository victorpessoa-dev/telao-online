# Grade TV administrativa

**Status: implementada.** A Grade TV está disponível para administradores em `/grade-ads`, com acesso pelo item de menu de ícone Monitor. Ela é uma visualização da mesma agenda usada pelo telão público; não cria uma agenda paralela e não registra métricas.

## Comportamento entregue

- Carrega a agenda pública da igreja e calcula a posição com `lib/services/telao-schedule.js`.
- Exibe exatamente 11 ciclos: cinco anteriores, o ciclo atual ao centro e cinco próximos.
- Mantém cada patrocinador uma única vez por ciclo, respeitando a duração configurada; a ordem é determinística e muda entre ciclos sem iniciar pelo primeiro ou último item do ciclo anterior.
- Mostra blocos proporcionais à duração, horários de referência, estatísticas do ciclo e o patrocinador atual.
- Exibe a foto do patrocinador no cartão “Agora no telão” quando a mídia é uma imagem.
- Centraliza o carregamento inicial da página.

## Quando a contagem está desativada

A Grade TV continua visível para consulta. Ela fica em tom acinzentado, congelada na última posição calculada e não aceita atualização, seleção ou outras ações. Esse comportamento deixa claro que não há evento de exibição ativo e evita que a Grade seja interpretada como uma segunda fonte de métricas.

## Limites

- A rota é administrativa e não cria link público próprio.
- A Grade não abre nem reivindica sessão oficial do telão.
- A Grade não cria impressões, visualizações, segundos exibidos ou consultas adicionais a cada ciclo, hover ou destaque.
- Alterações de patrocinadores e configurações continuam sendo feitas no painel de patrocinadores.
