## Context

Ver `proposal.md` para a motivação. Estado relevante para o design:

- Só `autenticacao-multi-clinica` está implementada; `src/lib/tenant.ts`
  (`getClinicaAtual()`) já é o ponto único de resolução de `clinicaId` e deve
  ser usado por toda query desta capability.
- `prisma/schema.prisma` já tem TODOS os models provisionados (`Paciente`,
  `Comanda` etc.), mesmo sem UI própria ainda — então relações/agregados
  cross-capability podem ser referenciados com segurança, só retornam vazio
  até a capability dona daquele dado existir.
- Protótipo de referência: `openspec/reference/prototipo.html`, seção
  `#clientes` e modal `#modal-overlay-cliente` — já tem os campos, o layout
  de segmented física/jurídica, e as funções de máscara (`maskCPF`,
  `maskCNPJ`, `maskCelular`) validadas por iteração de UX.
- Convenção do projeto: listagem é Server Component; formulário/modal é
  Client Component isolado.

## Goals / Non-Goals

**Goals:**
- CRUD completo de Cliente (física/jurídica) com validação client- e
  server-side de CPF/CNPJ/e-mail.
- Inativação lógica sem exclusão física, sem risco de perda de dado
  vinculado (Paciente, Comanda).
- CPF/CNPJ/celular normalizados (dígitos puros) na persistência; máscara só
  no client.
- Endereço autopreenchido por CEP via camada de servidor, nunca bloqueando o
  cadastro em caso de falha.
- Busca simples na listagem (nome/CPF/CNPJ).
- Teste de isolamento entre clínicas para o recurso `Cliente`.

**Non-Goals:**
- Colunas "Última visita" e "Total gasto" na listagem — dependem de dado que
  só existe depois de `atendimento-comanda`/`historico-financeiro`.
- Paginação — lista pequena o suficiente por clínica neste estágio.
- Cascata de inativação para os Pacientes de um cliente inativado — decisão
  que pertence à capability `pacientes`, ainda não implementada.
- Emissão de NFS-e — o cadastro só coleta os dados necessários para isso no
  futuro, não emite nada.

## Decisions

**1. Exclusão lógica (`Cliente.ativo: Boolean @default(true)`), não física.**
Alternativa considerada: manter exclusão física bloqueada condicionalmente,
estendendo `onDelete: Restrict` também para `Comanda.clienteId` (hoje
`SetNull`), espelhando o que já existe em `Paciente.clienteId`. Rejeitada:
reintroduz lógica condicional de erro sem necessidade, e conflita com
retenção de dado fiscal — CPF/CNPJ/endereço usados numa futura NFS-e não
deveriam poder sumir só porque o cadastro do tutor foi "excluído".

**2. CPF/CNPJ/celular persistidos como dígitos puros; máscara só no client.**
As funções `maskCPF`/`maskCNPJ`/`maskCelular` do protótipo são portadas para
o Client Component do modal (aplicadas durante a digitação); a formatação na
exibição (tabela, modal de edição) usa a mesma lógica em modo leitura.
Alternativa considerada: manter mascarado como no protótipo; rejeitada por
expor `@@unique([clinicaId, cpf])`/`@@unique([clinicaId, cnpj])` a bug de
duplicidade por formatação diferente entre dois cadastros do mesmo
documento, e por dificultar a normalização exigida por integrações fiscais
futuras.

**3. Busca normaliza a query antes de comparar.** Busca por CPF/CNPJ
funciona com ou sem máscara porque a string buscada é stripada de
não-dígitos antes de virar filtro Prisma — decorre diretamente da Decisão 2.

**4. Integração com ViaCEP atrás de Server Action/Route Handler dedicado,
nunca fetch direto do client.** Alternativa considerada: fetch direto do
client (ViaCEP libera CORS, não exige chave); rejeitada por divergir da
preferência do projeto por lógica server-first e por deixar mais difícil
trocar de provedor ou adicionar cache/log depois — um único lugar concentra
essa integração externa.

**5. Listagem implementa apenas contagem de Pacientes (`_count`) como
coluna agregada.** "Última visita" e "Total gasto" exigiriam agregar sobre
`Comanda`, capability que ainda não existe — ver Non-Goals.

**6. Busca simples (`contains` em nome/CPF/CNPJ normalizado), sem
paginação.** Volume de clientes por clínica é pequeno neste estágio do
produto; paginação é aditiva depois, sem exigir retrabalho estrutural.

**7. Índices únicos existentes não mudam.** `@@unique([clinicaId, cpf])` e
`@@unique([clinicaId, cnpj])` continuam globais (ativo ou inativo). Tentar
recadastrar o CPF de um cliente inativo cai na Requirement de duplicidade —
o caminho esperado é reativar o cliente existente, não criar um segundo
registro.

## Risks / Trade-offs

- [Cliente inativado por engano fica "escondido" até alguém notar] →
  Mitigação: reativação é ação de um clique, sempre disponível, sem
  depender de suporte/DBA.
- [Dado de seed (`prisma/seed.ts`) pode gravar CPF/CNPJ/celular já
  mascarados, inconsistente com o que a aplicação passa a gravar] →
  Mitigação: revisar o seed nesta change para nascer normalizado.
- [Dependência do ViaCEP é um ponto de falha externo] → Mitigação: já
  coberta pela spec original (CEP não encontrado/erro nunca bloqueia o
  cadastro); isolar a chamada na Server Action limita o raio de falha.
- [Lista sem paginação pode degradar se uma clínica crescer muito] →
  Aceito conscientemente como Non-Goal; adicionar paginação depois é
  aditivo, não exige mudar a spec existente.

## Migration Plan

1. `npx prisma migrate dev --name add-cliente-ativo` adicionando
   `ativo Boolean @default(true)` a `Cliente` — o default garante que todo
   registro existente (inclusive os do seed) nasce ativo, sem backfill
   manual.
2. Nenhuma outra mudança de schema: normalização de CPF/CNPJ/celular é regra
   de aplicação, não de schema (campos já são `String`/`String?`).
3. Revisar `prisma/seed.ts` para gravar CPF/CNPJ/celular normalizados.
4. Sem rollback especial: reverter a migration remove a coluna `ativo`; como
   não existe exclusão física de cliente no fluxo, não há perda de dado
   associada a um rollback.

## Open Questions

- Quando alguém tenta cadastrar um CPF/CNPJ que já pertence a um cliente
  *inativo*, o erro de duplicidade deveria sugerir reativação diretamente
  (ex: link "reativar este cliente" no toast de erro) ou basta a mensagem
  genérica de duplicata, deixando a reativação para a busca manual do
  usuário? Não muda a spec, a abordagem ou o breakdown de tasks — é
  microcopy/UX de um caminho de erro, decidível durante a implementação.
