## 1. Remover a troca de clínica sem novo login

- [x] 1.1 ~~Apagar `src/lib/actions/clinica.ts` e `src/lib/actions/clinica.test.ts`~~ — **corrigido durante a implementação** (ver design.md, nota em Context): `useTrocarClinica`/`selecionarClinica` também são usados por `clinic-option-list.tsx` (`/selecionar-clinica`, Requirement "Seleção de clínica após login", não alterado por esta change). A action e o hook **não são apagados**. Verificado (`grep -rn selecionarClinica src`) que o único chamador que sobra é `clinic-option-list.tsx`.
- [x] 1.2 ~~Apagar `src/lib/hooks/use-trocar-clinica.ts`~~ — mesma correção acima; o hook fica. O que de fato remove a troca dentro do painel é a Tarefa 2 (o `SidebarFooter` para de importar/chamar `useTrocarClinica`).

## 2. Novo rodapé da sidebar (`SidebarFooter`)

- [x] 2.1 Renomear `src/app/(dashboard)/clinic-switcher.tsx` → `src/app/(dashboard)/sidebar-footer.tsx`, exportando `SidebarFooter({ clinicaNome, papel }: { clinicaNome: string; papel: PapelUsuario })` — sem a prop `variant`, sem `clinicas`/`clinicaAtivaId` (a lista completa de clínicas do usuário deixa de ser necessária aqui).
- [x] 2.2 Remover de `SidebarFooter` o `useState(aberto)`, o import/uso de `useTrocarClinica` e todo o bloco do dropdown (`{aberto && (...)}`) — mantém só o cartão com as iniciais da clínica, nome e rótulo do papel (`PAPEL_LABEL`), sem `onClick` nem o `▾`.
- [x] 2.3 Adicionar ao `SidebarFooter` um botão "Sair" (client, `"use client"` já herdado do arquivo) que chama `signOut({ redirect: true, callbackUrl: "/login" })` de `"next-auth/react"` ao ser clicado.
- [x] 2.4 Verificar que `npx tsc --noEmit` não acusa nenhum uso remanescente de `ClinicSwitcher` (renomeado) nem de props removidas. — `tsc --noEmit` limpo.

## 3. Atualizar a sidebar

- [x] 3.1 Em `src/app/(dashboard)/sidebar.tsx`, trocar o import/uso de `ClinicSwitcher` por `SidebarFooter`, resolvendo `clinicaAtiva = clinicas.find(...)` dentro da própria `Sidebar` e passando `clinicaNome`/`papel`. A prop de entrada da `Sidebar` (`clinicas`/`clinicaAtivaId`) não mudou — nada a ajustar em quem a chama.
- [x] 3.2 Conferido (`grep "<Sidebar"`): único ponto de uso é `src/app/(dashboard)/layout.tsx`, sem alteração necessária.

## 4. Specs e verificação final

- [x] 4.1 Rodar `openspec validate adicionar-logout-restringir-troca-clinica --strict` e corrigir qualquer apontamento. — válido.
- [x] 4.2 Rodar `npx tsc --noEmit` e `npx vitest run` limpos. — 0 erros de tipo, 171/171 testes.
- [x] 4.3 Testado manualmente no navegador: cartão de clínica não abre mais nada ao clicar; "Sair" redireciona para `/login`; acesso direto a `/dashboard` sem sessão redireciona de volta para `/login`; login de novo com Ana (2 clínicas) mostra `/selecionar-clinica` normalmente, e escolher "Clínica Pata Feliz" carrega o painel certo (dados isolados dessa clínica).
