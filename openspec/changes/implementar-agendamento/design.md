## Context

Ver `proposal.md` para a motivação. Estado relevante para o design:

- `agendamento/spec.md` tem 3 requirements; só "Ciclo de status do
  agendamento" está implementado — como efeito colateral de
  `implementar-atendimento-comanda` (seleção na fila, finalizar, descartar).
  "Criação de agendamento" e "Visualização semanal por profissional" nunca
  tiveram nenhuma linha de código.
- O protótipo (`openspec/reference/prototipo.html`, seção `#agenda`) é
  menos aproveitável que nas outras telas: `modal-save` lê `f-pet`/`f-tutor`
  como texto livre (nunca ligados a `pets`/`owners`), sempre grava
  `duration: 1` fixo (ignora o serviço escolhido), sempre grava `day: 4`
  (ignora o dia clicado), e os botões `week-prev`/`week-next` não têm
  `addEventListener` em lugar nenhum — são decorativos. Não existe nenhuma
  verificação de conflito de horário no protótipo.
- `ItemCatalogo` não tem campo de duração — nada liga um serviço a quanto
  tempo ele ocupa na agenda.
- Nenhuma consulta "usuários de uma clínica" existe hoje;
  `src/lib/clinica-selecao.ts` só resolve o sentido contrário (dado um
  usuário, suas clínicas — usado no login).
- `project.md` (Stack técnica) já nomeia "Tailwind CSS + shadcn/ui", mas
  nenhum pacote de UI foi instalado até agora — todo componente do projeto é
  Tailwind puro, escrito à mão, direto na paleta customizada (`pine`,
  `sage`, `sand`, `gold` — `tailwind.config.ts`), sem nenhuma camada de
  indireção semântica (sem `bg-background`/`text-foreground` etc.).
- `implementar-pacientes/design.md` deixou como Open Question, nunca
  resolvida: o seletor de tutor no modal de Paciente é um `<select>` simples
  — "trocar por um campo de busca é aditivo" se o volume crescer. Essa
  mesma pergunta reapareceria aqui para o seletor de paciente do
  agendamento; desta vez foi resolvida (Decisão 3).
- Padrão já consolidado em `pacientes/page.tsx`: filtros via `searchParams`
  na URL, Server Component lendo a query string, sem JS necessário pra
  navegar entre estados.

## Goals / Non-Goals

**Goals:**
- Criar um agendamento usa dados reais (paciente e veterinário
  selecionados, nunca texto livre).
- Conflito de horário para o mesmo profissional é avisado, nunca bloqueia.
- A grade semanal mostra os agendamentos reais da semana, com navegação de
  verdade (não mais decorativa).
- O primeiro componente compartilhado do projeto (`src/components/`) nasce
  bem — shadcn integrado de um jeito que não introduz um segundo dialeto de
  estilo.
- O Open Question de `implementar-pacientes` sobre o seletor de tutor é
  finalmente resolvido, não adiado de novo.

**Non-Goals:**
- Editar ou reagendar um agendamento existente — a spec só pede criação;
  clicar num agendamento já existente na grade não abre nada.
- Grade filtrável por profissional — decisão desta exploração: grade única,
  igual ao protótipo, apesar do nome do requirement sugerir o contrário
  (ver Decisão 7).
- Sábado ou horário de funcionamento configurável por clínica — segue
  exatamente o recorte do protótipo (segunda a sexta, 8h-18h fixo).
- Conflito de horário como bloqueio duro, ou qualquer regra de "só
  veterinário pode ser o profissional" no seletor.
- Busca server-side ou paginada no combobox — filtro client-side é
  suficiente pro volume esperado (dezenas de pacientes por clínica, não
  milhares).
- Excluir fisicamente um agendamento, ou qualquer novo status além dos 4
  que já existem em `StatusAgendamento`.

## Decisions

**1. `ItemCatalogo.duracaoPadraoMinutos Int?`, relevante só para
`categoria: SERVICO`.** No modal de cadastro (`item-catalogo-modal.tsx`), o
campo aparece/habilita condicionalmente por categoria — mesmo padrão já
usado para "raça depende da espécie" no modal de Paciente. Alternativa
considerada: campo obrigatório para serviços — rejeitada, forçaria
preencher retroativamente os itens já seedados sem necessidade; opcional
com fallback (Decisão 2) resolve sem exigir isso.

**2. Duração do agendamento é sempre pré-preenchida a partir do serviço,
mas sempre editável — `Agendamento.duracaoMinutos` continua o campo real
gravado.** Lê o requirement "duração padrão configurável por serviço" da
forma mais literal: *padrão* = sugestão a partir do serviço; *configurável*
= o campo aceita edição manual sempre. Sem duração configurada no serviço
(caso dos itens seedados hoje), cai no default que já existe no schema
(`@default(60)`).

**3. Seletor de paciente (agendamento) e de tutor (Paciente, retrofit) usam
um combobox novo e reutilizável; veterinário continua `<select>` simples.**
O critério: combobox é para listas que crescem sem limite por natureza do
dado (pacientes, e por extensão clientes/catálogo no futuro); veterinário é
limitado pelo quadro de funcionários da clínica — uma lista pequena por
definição, sem necessidade real de busca.

**4. Seletor de veterinário lista todo `Usuario` vinculado à clínica ativa
via `UsuarioClinica`, sem filtrar por `papel`.** `Agendamento.veterinarioId`
não tem restrição de papel no schema, e o próprio seed usa um usuário
`ADMIN` como profissional (clínica pequena, uma pessoa só). Filtrar por
`papel: VETERINARIO` excluiria esse cenário real sem nenhum pedido da spec
para essa restrição.

**5. O combobox é construído a partir do shadcn/ui (Popover + Command via
`cmdk`), mas os componentes copiados são repintados com a paleta já
existente em vez do sistema de cor semântico padrão do shadcn.** shadcn
copia arquivos de componente pro repo (não é uma dependência opaca) —
depois de gerados, `popover.tsx`/`command.tsx` têm suas classes
(`bg-popover`, `text-foreground`, etc.) trocadas por `bg-white`,
`text-pine-900`, `border-sage-300` e afins, direto. Alternativa considerada:
rodar o `init` padrão do shadcn e configurar as CSS variables
(`--popover`, `--foreground`...) mapeando pra paleta existente — rejeitada
por introduzir uma segunda forma de estilizar convivendo com a primeira
(classes literais em todo componente já existente) sem necessidade; a
alternativa manual dá o mesmo resultado visual com um dialeto só.
Alternativa considerada (combobox 100% na mão, sem shadcn): mantém um único
dialeto sem nenhum custo de integração, mas perde acessibilidade/portal
testados do Radix — rejeitada porque o projeto já declara shadcn como parte
do stack pretendido (`project.md`) e esta é a primeira oportunidade real de
cumprir isso.

**6. Conflito de horário: uma única Server Action, chamada duas vezes
quando há conflito — não um modal novo.** Primeira chamada checa
sobreposição (mesmo `veterinarioId`, `status` diferente de `CANCELADO`,
intervalos `[início, início+duração)` se cruzando); se houver conflito,
retorna `{ ok: false, conflito: [...] }` (não é erro) e o formulário troca o
texto do botão para algo como "Salvar mesmo assim"; confirmando, a mesma
action é chamada de novo com `ignorarConflito: true`, que pula a checagem.
Alternativa considerada: modal de confirmação separado — rejeitada por não
agregar nada que o próprio formulário, com um aviso inline e o botão
mudando de estado, não resolva mais simples.

**7. A grade semanal é única — não filtrada por profissional, apesar do
nome do requirement.** O corpo do requirement ("dias da semana x
horários") e o protótipo (todos os agendamentos juntos, cor por espécie,
sem nenhum seletor de profissional) concordam entre si; só o título diverge.
Decisão desta exploração: seguir o corpo + o protótipo, tratando "por
profissional" no título como imprecisão de quem escreveu a spec original,
não como um requirement de filtro a implementar.

**8. Navegação de semana via `?semana=YYYY-MM-DD` na URL, sem JavaScript.**
Mesmo padrão de `pacientes/page.tsx` (filtros via `searchParams`,
Server Component). "Anterior"/"Próxima" são `<a href>` com a data ±7 dias;
sem o parâmetro, mostra a semana atual (calculada de verdade — o protótipo
tinha "hoje" hardcoded como sexta-feira).

**9. A grade em si é um Client Component; abrir o formulário é
`useState`, não um link.** Toda célula vazia precisa de `onClick` — mesmo
padrão já usado para todo "Novo X" do projeto (`pacientes-grid.tsx` e
similares abrem modal via estado local de um Client Component, nunca por
parâmetro de URL). O cálculo de posição (`top`/`height` a partir de hora
decimal e duração) é a mesma matemática do protótipo, só trocando os
números fixos por `dataHoraInicio`/`duracaoMinutos` reais.

**10. Clicar num agendamento já existente na grade não abre nada (só
tooltip com os detalhes, no máximo).** Coerente com o Non-Goal de não
construir edição/reagendamento nesta rodada.

## Risks / Trade-offs

- [Combobox repintado manualmente (Decisão 5) diverge do padrão shadcn se
  mais componentes forem adicionados depois sem seguir o mesmo tratamento]
  → Mitigação: documentar o padrão de restyle no próprio código
  (`src/components/`), pra próxima adição repetir o mesmo processo.
- [Checagem de conflito busca os agendamentos do profissional no mesmo dia
  e filtra sobreposição em JS, não em SQL] → Aceito — volume por
  profissional por dia é sempre pequeno; nunca precisaria de uma query mais
  sofisticada.
- [Agendamento fora da janela 8h-18h (criado com hora fora desse range, já
  que nada no formulário impede isso) renderiza mal ou não aparece na
  grade] → Aceito conscientemente — o próprio protótipo nunca tratou esse
  caso; não é uma regressão introduzida por este design.
- [Duas dependências novas de UI (`@radix-ui/react-popover`, `cmdk`) mais
  `clsx`/`tailwind-merge` — primeira vez que o projeto ganha dependência de
  UI além do Tailwind] → Aceito — é exatamente o que `project.md` já
  declarava como stack pretendido; não é uma dependência não planejada.

## Migration Plan

1. Adicionar `ItemCatalogo.duracaoPadraoMinutos Int?` ao schema; migration
   sem backfill (nulo é válido; itens já seedados nascem sem duração
   configurada — 3 deles recebem valor de exemplo diretamente no
   `seed.ts`, não via migration).
2. Instalar `@radix-ui/react-popover`, `cmdk`, `clsx`, `tailwind-merge`.
3. Criar `src/lib/utils.ts` (`cn()`), copiar e repintar `popover.tsx`/
   `command.tsx`, construir `src/components/combobox.tsx` sobre eles.
4. Rollback: reverter a migration remove `duracaoPadraoMinutos` sem perda
   (nenhum dado real depende dele ainda); remover as dependências novas não
   afeta nada fora do combobox, que também seria revertido junto.
