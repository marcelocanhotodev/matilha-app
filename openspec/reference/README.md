# Protótipo de referência

`prototipo.html` é um protótipo funcional (HTML/CSS/JS puro, sem framework,
roda abrindo direto no navegador) construído antes deste scaffold, pra validar
fluxo e UX de cada tela. **Ele não é o código final** — é a referência visual e
comportamental de como cada capability deve se comportar.

Ao implementar uma capability, abra esse arquivo no navegador (ou leia o
código-fonte, é tudo comentado e organizado por seção) e observe a tela
correspondente antes de desenhar os componentes React.

## Mapa: tela do protótipo → capability → dado no protótipo

| Tela no protótipo (nav lateral) | Capability | Onde está no HTML |
|---|---|---|
| Tela de login + seleção de clínica (abre antes do resto) | `autenticacao-multi-clinica` | `#auth-screen`, array `CLINICS` no `<script>` |
| Painel | (agrega dados de outras capabilities) | `#dashboard` |
| Agenda | `agendamento` | `#agenda`, array `appointments` |
| Pacientes | `pacientes` | `#pacientes`, array `pets`, modal `#modal-overlay-paciente` |
| Clientes | `clientes` | `#clientes`, array `owners`, modal `#modal-overlay-cliente` |
| Atendimento | `atendimento-comanda` | `#atendimento`, arrays `catalog` + `cart`, fila `#queue-strip` |
| Cadastro | `catalogo-produtos-servicos` | `#cadastro`, array `catalog` (compartilhado com Atendimento) |
| Histórico | `historico-financeiro` | `#historico`, array `historico` |

## O que aproveitar do protótipo ao implementar

- **Comportamento de UX já validado**: a fila de agendamentos em cards
  clicáveis (em vez de dropdown) na tela de Atendimento, o preenchimento
  automático de endereço por CEP na tela de Clientes, a raça dependente da
  espécie na tela de Pacientes, o cálculo de idade a partir da data de
  nascimento — tudo isso veio de iteração de feedback e deve ser preservado.
- **Nomes de campos**: os nomes usados nos objetos JS do protótipo (`especie`,
  `porte`, `castrado`, `sexo`, etc.) já foram usados como base para os nomes
  de campo e valores de enum no `schema.prisma` — mantenha essa
  correspondência para não ter que traduzir mentalmente entre camadas.
- **Paleta e tipografia**: já estão no `tailwind.config.ts` (cores `pine`,
  `sage`, `sand`, `gold`; fontes `display`/`sans`/`mono`). O CSS do protótipo
  (`<style>` no topo do HTML) documenta onde cada cor é usada.

## O que **não** replicar 1:1

- O protótipo guarda tudo em variáveis JS em memória (arrays `let pets = [...]`
  etc.) — na implementação real isso vira tabelas Postgres via Prisma,
  acessadas por Server Components/Server Actions.
- O protótipo não tem multi-tenancy de verdade (a seleção de clínica no login
  é só visual, não filtra dado nenhum) — a implementação real precisa
  respeitar `getClinicaAtual()` (`src/lib/tenant.ts`) em toda query.
- Validações de CPF/CNPJ/e-mail no protótipo rodam client-side em JS puro —
  na implementação real, replicar a mesma validação (o algoritmo de dígito
  verificador é o mesmo) mas também validar server-side antes de gravar no
  banco, nunca confiar só no client.
