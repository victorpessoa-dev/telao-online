# Guia do Usuario

> Cada administrador cria e administra a própria igreja após aceitar o convite recebido por email.

## Acesso

Use `/login` para entrar no painel administrativo. O painel nao funciona em mobile; use computador ou tela maior.

## Painel do Telao

Em `/painel-telao` voce pode:

- criar patrocinador;
- enviar imagem, GIF, MP4 ou WebM;
- editar nome, tipo, link, site e duracao;
- ativar ou desativar patrocinador;
- abrir `/{slug}/ads-telao`;
- copiar URLs publicas;
- abrir relatorio publico.

Depois de enviar upload, clique em Salvar para gravar a midia no patrocinador.

## Contador

O contador de exibicoes fica no painel do telao.

- Ligue o contador geral.
- Ative ou pause NORMAL e MASTER separadamente.
- Se nao houver patrocinador ativo em um tipo, esse tipo fica indisponivel.
- Se nenhum tipo puder contar, o contador desliga.

## Pagina Publica

`/` exibe:

- identidade da paroquia;
- preview do telao;
- numeros publicos;
- lista de patrocinadores;
- busca;
- links para relatorios.

## Relatorios

Cada patrocinador tem página pública em `/{slug}/parceiros/:id`, com:

- midia;
- total de exibicoes;
- tempo acumulado;
- graficos;
- historico;
- exportacao XLSX.
