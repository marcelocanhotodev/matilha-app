## 1. `timezone.ts`: parsear data vinda de `<input type="date">`

- [x] 1.1 Criar `paraDiaCalendarioDeChave(chave: string): DiaCalendario | null` em `src/lib/timezone.ts` — inverso de `paraChaveDeData`, validando formato `yyyy-mm-dd` sem usar `new Date(string)`; retorna `null` pra string vazia, malformada ou data inexistente (ex.: 31 de fevereiro). Cobrir com teste vitest (`timezone.test.ts`, mesmo arquivo dos testes existentes do módulo): string válida vira `DiaCalendario` correto; string vazia, malformada e data inexistente retornam `null`; roundtrip com `paraChaveDeData` (`paraChaveDeData(paraDiaCalendarioDeChave(x)) === x` pra `x` válido).

## 2. Consultas de histórico (`src/lib/historico.ts`)

- [x] 2.1 Adicionar parâmetro opcional `periodo?: { inicio: Date; fim: Date }` a `listarHistorico(clinicaId, { page, porPagina, periodo? })`, somando `criadoEm: { gte: periodo.inicio, lte: periodo.fim }` ao `where` (listagem e `count`) quando presente. Testar: com período, só as comandas dentro do intervalo aparecem e `totalPaginas` reflete só esse subconjunto; sem período, comportamento idêntico ao atual (nenhum teste existente pode quebrar).
- [x] 2.2 Adicionar parâmetro opcional `periodo?: { inicio: Date; fim: Date }` a `totaisHistorico(clinicaId, periodo?)`, mesmo filtro de `criadoEm` no `where`. Testar: totais recalculados só sobre o período quando presente; período sem nenhuma comanda finalizada → tudo zero/null (mesmo shape do estado vazio geral); sem período, comportamento idêntico ao atual.

## 3. Filtro na tela `/historico`

- [x] 3.1 Adicionar formulário `method="get"` com dois `<input type="date" name="inicio">`/`name="fim"` (mesmo padrão visual do form de busca em `clientes/page.tsx`) + botão "Aplicar" + link "Limpar filtro" (`<a href="/historico">`, sem parâmetros). Os inputs usam `defaultValue` vindo direto de `searchParams.inicio`/`.fim` (mesmo quando a string for inválida).
- [x] 3.2 Em `page.tsx`, parsear `searchParams.inicio`/`.fim` com `paraDiaCalendarioDeChave` + `inicioDoDiaClinica`/`fimDoDiaClinica`; quando os dois parseiam e `inicio <= fim`, passar `periodo` pra `listarHistorico`/`totaisHistorico`; quando só um dos dois está presente/válido, tratar como "sem filtro" (Non-Goal do design.md — nunca filtro de um lado só).
- [x] 3.3 Quando os dois parseiam mas `inicio > fim`: renderizar uma mensagem de erro clara acima da tabela e não aplicar filtro nenhum (histórico completo), mantendo os inputs preenchidos com o que a pessoa digitou.
- [x] 3.4 Links de paginação (Anterior/Próxima) passam a preservar `inicio`/`fim` (via `URLSearchParams`) junto com o novo `page`; o formulário do filtro nunca inclui o `page` atual, então aplicar um novo filtro sempre volta pra página 1 (comportamento natural de um novo GET, sem lógica extra).

## 4. Verificação

- [x] 4.1 `npx tsc --noEmit` e `npx vitest run` limpos.
- [x] 4.2 `openspec validate adicionar-filtro-periodo-historico --strict`.
- [x] 4.3 Teste manual no navegador: aplicar um filtro que cubra só parte das comandas finalizadas geradas no teste manual de `implementar-historico`, conferir que a tabela e os 4 cards mudam juntos; tentar um intervalo com início depois do fim e conferir a mensagem de erro; limpar o filtro e conferir que volta a mostrar tudo; navegar de página com filtro ativo e conferir que ele se mantém na URL.
