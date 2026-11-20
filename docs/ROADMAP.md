# Roadmap

## Concluído: Anotações (20/11/2026)

Uma área de anotações permanentes, separada das ideias e sem status nem prioridade. Cada anotação pode pertencer a um projeto ou ficar sem projeto.

Protótipo aprovado: [prototypes/anotacoes.html](prototypes/anotacoes.html). Guia de uso: seção [Anotações](../README.md#anotações) do README.

### Decisões

| Tema | Decisão |
|---|---|
| Vínculo com projeto | Opcional (`project_id` aceita nulo) |
| Exclusão de projeto | Apaga também as anotações e os anexos delas (`ON DELETE CASCADE`). A interface é um cartão na barra lateral com as contagens (ideias, anotações e anexos), o aviso de que não é possível recuperar e um botão que exige segurar por 3 s. Substitui o `window.confirm`. |
| Salvamento | Automático, 700 ms depois da última alteração. Cada anotação tem `version`, e o `PATCH` exige `If-Match` (sem ele, a API responde `428`). Versão desatualizada recebe `412` com a versão atual, e a tela pergunta se descarta ou mantém as alterações. Anexar arquivo não muda a versão. |
| Padrão de código | Segue o padrão atual do repositório. O alinhamento ao padrão global está em [Dívida técnica](#dívida-técnica). |
| Editor de texto | Editor visual TipTap 3.35.0 que continua guardando Markdown, o mesmo nas ideias e nas anotações. Tem barra de ferramentas, menu `/`, bloco de código com seletor de linguagem e botão Copiar, tabelas, lista de tarefas e um botão para ver e editar o Markdown. Fica num chunk carregado sob demanda. O `MarkdownEditor` antigo, o `react-markdown` e o `remark-gfm` saíram. |
| Tags | Ideias e anotações usam o mesmo vocabulário nas sugestões (`GET /api/tags` junta as duas tabelas). `?kind=idea` ou `?kind=note` restringe a uma delas, e o filtro da lista de ideias usa `kind=idea`. |
| Anexos | Valem para anotações do mesmo jeito que para ideias. `attachments` ganhou `note_id`, e a constraint `attachments_single_owner_check` garante exatamente um dono. Excluir uma anotação ou um projeto apaga também os arquivos. |
| Imagem no texto | Colar ou arrastar dentro do texto, ou usar o botão de imagem da barra, envia o arquivo como anexo e insere `![nome](/api/attachments/{id}/content)`. Colar fora do texto só anexa. Cada anexo tem o botão "No texto" e um selo quando já aparece no texto. Remover um anexo (segurando por 3 s) tira a imagem do texto. Numa ideia nova, a imagem usa um endereço temporário do navegador até a criação, e depois ganha o endereço definitivo. |
| Leitura e edição | A anotação abre só para leitura. Entra em edição com Editar, a tecla E ou dois cliques. Sai com Concluir ou Esc. Na leitura, as caixas de tarefa podem ser marcadas e os links abrem numa aba nova. Abrir e fechar a edição sem mudar nada não altera a anotação. |
| Layout | Duas colunas: lista e anotação aberta, que ocupa toda a largura e altura do painel. |
| Pilha de e2e | `docker-compose.e2e.yml` (projeto `brainstorm-e2e`), com banco e mídia em `tmpfs` e o site na porta 8091. Não usa os volumes do app (`brainstorm_pgdata`, `brainstorm_media`). |

### Etapas

- [x] **0. Base de e2e.** Playwright 1.65.1 numa pilha Docker isolada. Cobre o editor de ideias, as tags, a barra lateral, a exclusão de projeto e a API de tags.
- [x] **1. Refatoração.** `TagInput` foi para `components/`, a rota de tags ganhou módulo próprio, e o schema de tags e o escape de busca foram para `shared/`.
- [x] **2. Backend de anotações.** Migration `0001_notes`, CRUD com ETag e `If-Match`, contagens, `noteCount` e `attachmentCount` em projetos, exclusão em cascata.
- [x] **2b. Anexos nas anotações.** Migration `0002_note_attachments`, `POST /api/notes/:id/attachments`, anexos no detalhe da anotação e limpeza dos arquivos.
- [x] **3. Frontend.** Rota `/notes/:noteId?` carregada sob demanda, seções Ideias e Anotações na barra lateral, leitura e edição, salvamento automático com tratamento de conflito, editor visual compartilhado, imagens no texto, faixa de anexos e `HoldButton` para ações irreversíveis.
- [x] **4. e2e.** 40 testes (API e interface). A suíte passou 3 vezes seguidas sem falhas.
- [x] **5. Documentação.** README com a seção Anotações, o editor novo, as imagens no texto, a exclusão segurando e os testes, além de todos os prints refeitos.

## Próximos

- Ligação entre ideias e anotações
- Vídeo dentro do texto (hoje vídeos ficam só como anexo)

## Dívida técnica

Pontos em que o projeto ainda não segue o padrão global:

- i18n e textos de interface em arquivos de tradução
- Contrato OpenAPI escrito antes do código e erros em `application/problem+json`
- `pgEnum` trocado por `text` com `check`, chave `uuid` v7, auditoria e `version` em toda tabela, constraints com nome explícito
- Listas paginadas, que hoje param em 500 itens
- Rotas de ideias carregadas sob demanda (a de anotações já é)
- Exclusão de ideia confirmada segurando o botão por 3 s, em vez de `window.confirm` (anexos, anotações e projetos já usam o `HoldButton`)
- Versões exatas nas dependências antigas (as novas já entram exatas) e hook de pre-commit com lint e typecheck
- O chunk do editor tem cerca de 230 KB comprimido, quase todo do realce de código (`lowlight` com o conjunto `common`). Dá para carregar só as linguagens da lista.
