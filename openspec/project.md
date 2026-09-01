# Matilha — Sistema de Agendamento Veterinário

## Visão geral

SaaS multi-tenant (multi-clínica) de agendamento e gestão para clínicas veterinárias.
Cada clínica é um tenant isolado logicamente no mesmo banco de dados (estratégia
"shared schema + tenant_id", não schema-per-tenant).

Um mesmo usuário (ex: veterinário que atende em duas clínicas) pode ter acesso a
mais de uma clínica com papéis diferentes em cada uma. Após o login, o usuário
escolhe em qual clínica está trabalhando (ver capability `autenticacao-multi-clinica`).

## Stack técnica

| Camada | Tecnologia | Versão alvo |
|---|---|---|
| Framework | Next.js (App Router) | 14+ |
| Linguagem | TypeScript | 5.x |
| Banco de dados | PostgreSQL | 15+ |
| ORM | Prisma | 5.x |
| Autenticação | Auth.js (NextAuth) v5 | credentials + sessão JWT |
| Estilo | Tailwind CSS + shadcn/ui | — |
| Validação | Zod | — |
| Deploy sugerido | Vercel (app) + Neon ou Supabase (Postgres) | — |

Não usar bibliotecas de UI pesadas fora do Tailwind/shadcn sem justificativa.
Não usar Redux — estado de servidor via Server Components / Server Actions;
estado de UI local via React state.

## Padrão de multi-tenancy (regra arquitetural crítica)

- Toda tabela de dados de negócio (Cliente, Paciente, Agendamento, ItemCatalogo,
  Comanda, ComandaItem) tem uma coluna obrigatória `clinicaId`.
- **Nenhuma query do Prisma pode ser feita sem filtrar por `clinicaId`.** Isso é
  não-negociável: um bug aqui vaza dados de uma clínica para outra.
- A `clinicaId` ativa vive na sessão (JWT), definida no momento em que o usuário
  escolhe a clínica após o login.
- Um middleware/helper central (`src/lib/tenant.ts`, a implementar) deve expor uma
  função tipo `getClinicaAtual()` usada por toda query, para evitar que cada rota
  reimplemente essa checagem manualmente e esqueça o filtro.

## Convenções de código

- Nomes de campos e valores de enum no banco em português, para bater 1:1 com o
  domínio da clínica (evita tradução mental constante durante o desenvolvimento).
- Toda tela que lista dados de negócio é Server Component por padrão; formulários
  interativos (modais de cadastro, comanda) são Client Components isolados.
- Money/valores monetários: sempre `Decimal` no Prisma (nunca `Float`), para evitar
  erro de arredondamento em cálculos de comanda/desconto.
- Datas de nascimento (paciente e pessoa física) são armazenadas como data, nunca
  como "idade" — idade é sempre calculada em tempo de exibição.
- Preço de item vendido numa comanda é sempre uma cópia ("snapshot") do preço do
  catálogo no momento da venda — nunca uma referência viva ao preço atual do
  catálogo, para não alterar o valor de vendas passadas quando o preço mudar.

## Domínio de negócio — glossário

- **Clínica**: o tenant. Uma conta paga do SaaS.
- **Cliente**: o tutor do animal (pessoa física ou jurídica). Contém os dados
  necessários para emissão futura de NFS-e (CPF/CNPJ, endereço completo, e-mail).
- **Paciente**: o animal. Pertence a um Cliente.
- **Agendamento**: um horário reservado na agenda para um Paciente, com um
  profissional e um serviço previsto.
- **Item de catálogo**: um serviço ou produto que a clínica vende, com preço.
- **Comanda**: o fechamento financeiro de um atendimento (avulso ou vinculado a um
  Agendamento), contendo os itens vendidos, desconto e forma de pagamento.
- **Histórico**: consulta agregada sobre as Comandas já finalizadas.

## Protótipo de referência

Antes deste scaffold existir, um protótipo funcional (HTML/CSS/JS puro,
sem framework) foi construído e refinado tela por tela para validar UX. Ele
está em `openspec/reference/prototipo.html`, com o mapa de telas ↔
capabilities em `openspec/reference/README.md`. **Toda implementação deve
observar a tela correspondente do protótipo antes de começar** — vários
comportamentos ali (fila de agendamentos em cards, CEP com preenchimento
automático, raça dependente da espécie, idade calculada a partir da data de
nascimento) vieram de iteração de feedback real e não são incidentais.

## Próximos passos de implementação (ordem sugerida)

1. `autenticacao-multi-clinica` — login, sessão, seleção de clínica, middleware de tenant
2. `clientes` — CRUD completo (base para tudo que referencia um tutor)
3. `pacientes` — CRUD completo (depende de `clientes`)
4. `catalogo-produtos-servicos` — CRUD de itens vendáveis
5. `agendamento` — agenda semanal (depende de `pacientes`)
6. `atendimento-comanda` — ponto de atendimento / comanda (depende de 3, 4 e 5)
7. `historico-financeiro` — consulta agregada sobre comandas (depende de 6)

Cada item acima é uma capability em `openspec/specs/`. Antes de implementar
qualquer uma, leia o `spec.md` correspondente inteiro.
