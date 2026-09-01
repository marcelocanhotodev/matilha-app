# Matilha — Sistema de Agendamento Veterinário

Scaffold inicial do projeto: estrutura Next.js + TypeScript + Prisma/PostgreSQL,
organizado para implementação incremental via [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## O que já está pronto neste scaffold

- `openspec/project.md` — stack, convenções e regra de multi-tenancy
- `openspec/AGENTS.md` — instruções de workflow para IA (proposal → apply → archive)
- `openspec/specs/*/spec.md` — 7 capabilities já especificadas com Requirements
  e Scenarios, cobrindo tudo que foi desenhado no protótipo visual:
  - `autenticacao-multi-clinica`
  - `clientes`
  - `pacientes`
  - `agendamento`
  - `catalogo-produtos-servicos`
  - `atendimento-comanda`
  - `historico-financeiro`
- `openspec/reference/prototipo.html` — o protótipo funcional (HTML/CSS/JS
  puro) que originou essas specs, com um mapa de telas ↔ capabilities em
  `openspec/reference/README.md`. Abra no navegador antes de implementar
  qualquer tela — vários comportamentos ali (fila de agendamentos em cards,
  CEP com preenchimento automático, raça dependente da espécie) vieram de
  iteração de UX real e devem ser preservados.
- `prisma/schema.prisma` — schema completo do Postgres com todos os models,
  enums e relações que sustentam as specs acima
- `prisma/seed.ts` — seed mínimo (1 clínica, 1 usuário, alguns itens de catálogo)
- Esqueleto do App Router (`src/app`) com uma página placeholder por
  capability, cada uma comentando qual spec seguir
- `src/lib/tenant.ts` — contrato da função `getClinicaAtual()`, o ponto único
  por onde toda query deve filtrar por clínica

## O que **não** está implementado ainda (de propósito)

Nenhuma tela tem lógica de verdade — são placeholders com comentários `TODO`
apontando pra spec correspondente. `src/lib/auth.ts` lança erro se chamado.
Isso é intencional: a ideia é implementar **por partes**, uma capability por
vez, na ordem sugerida em `openspec/project.md`.

## Como continuar a partir daqui

### 1. Instalar a CLI oficial do OpenSpec (recomendado)

```bash
npm install -g @fission-ai/openspec@latest
cd matilha-app
openspec init
```

Isso gera os slash commands (`/openspec:proposal`, `/openspec:apply`,
`/openspec:archive`) para o seu assistente de IA (Claude Code, Cursor etc.) e
atualiza `openspec/AGENTS.md` com o conteúdo oficial mais recente da
ferramenta — o que está aqui hoje foi escrito manualmente como ponto de
partida, não é a saída literal da CLI.

### 2. Implementar a primeira capability

Ordem sugerida (está detalhada em `openspec/project.md`):

```
1. autenticacao-multi-clinica
2. clientes
3. pacientes
4. catalogo-produtos-servicos
5. agendamento
6. atendimento-comanda
7. historico-financeiro
```

Com a CLI instalada, para cada uma:

```bash
/openspec:proposal Implementar a capability clientes
# revise proposal.md, tasks.md, design.md gerados
/openspec:apply implementar-clientes
# revise o código gerado
/openspec:archive implementar-clientes --yes
```

Sem a CLI, siga manualmente o fluxo descrito em `openspec/AGENTS.md`.

### 3. Banco de dados

```bash
cp .env.example .env
# edite DATABASE_URL com sua conexão Postgres real

npm install
npx prisma migrate dev --name init   # cria as tabelas a partir do schema
npm run db:seed                       # popula dados mínimos de teste
npm run db:studio                     # inspeciona o banco visualmente
```

> **Nota**: o `schema.prisma` foi revisado manualmente (chaves e sintaxe
> balanceadas), mas não foi possível rodar `prisma validate`/`prisma generate`
> no ambiente onde este scaffold foi gerado — sem acesso de rede pra baixar o
> engine binário do Prisma. Rode `npx prisma validate` localmente antes de
> confiar 100% nele.

### 4. Rodar o projeto

**Sem Docker** (Postgres precisa estar rodando em algum lugar acessível pela `DATABASE_URL`):

```bash
npm run dev
```

**Com Docker** — ver seção dedicada abaixo. É o caminho mais rápido pra não
precisar instalar Postgres na máquina.

## Rodando com Docker

Existem dois arquivos de compose para dois cenários diferentes:

| Arquivo | Uso | Hot reload | Banco |
|---|---|---|---|
| `docker-compose.yml` | Desenvolvimento no dia a dia | Sim (volume montado) | Postgres em container |
| `docker-compose.prod.yml` | Build de produção / homologação | Não (imagem otimizada `standalone`) | Postgres em container |

### Modo desenvolvimento (recomendado enquanto implementa as capabilities)

```bash
docker compose up
```

Isso sobe o Postgres e o Next.js em modo dev (`next dev`), com o código-fonte
montado por volume — editar um arquivo no seu editor reflete direto no
container, sem rebuild.

Na primeira vez (ou sempre que o `schema.prisma` mudar), rode as migrations
**de dentro do container** do app, para usar a mesma rede/host do Postgres:

```bash
docker compose exec app npx prisma migrate dev --name init
docker compose exec app npm run db:seed
```

Acesse em `http://localhost:3000`. Para parar: `docker compose down` (adicione
`-v` se quiser apagar também os dados do Postgres).

### Modo produção (build otimizado)

```bash
# 1. build das imagens
docker compose -f docker-compose.prod.yml build

# 2. aplica as migrations (passo único e explícito — não roda automaticamente
#    a cada subida do container, ver comentário no próprio arquivo do porquê)
docker compose -f docker-compose.prod.yml run --rm migrate

# 3. sobe o app
docker compose -f docker-compose.prod.yml up -d app
```

Esse modo usa o `Dockerfile` multi-stage (build do Next.js com
`output: "standalone"`), gerando uma imagem final bem mais enxuta que a de
desenvolvimento — sem devDependencies, sem o código-fonte não compilado.

Antes de usar esse modo com dados reais, defina no `.env` um `AUTH_SECRET`
gerado de verdade (`openssl rand -base64 32`) — o compose de produção não tem
um valor default como o de desenvolvimento tem, de propósito.

### Rodando um comando pontual dentro do container

```bash
docker compose exec app npx prisma studio      # inspecionar o banco
docker compose exec app npx prisma migrate dev # nova migration após mudar o schema
docker compose exec db psql -U postgres -d matilha  # psql direto no Postgres
```

## Decisões arquiteturais que valem revisar antes de começar

- **Multi-tenancy** é via coluna `clinicaId` em cada tabela de negócio (shared
  schema), não schema-per-tenant. Ver `openspec/project.md` para o porquê.
- **Preço de item vendido é sempre um snapshot** (`ComandaItem.precoSnapshot`),
  nunca uma referência ao preço atual do catálogo — isso está testado na spec
  de `catalogo-produtos-servicos`.
- **Autenticação** ainda não decidiu o provider final de e-mail/senha vs.
  OAuth — o scaffold assume credentials (bcrypt) como ponto de partida.
