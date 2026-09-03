// Seed mínimo — cria uma clínica, um usuário admin, alguns itens de catálogo
// e alguns clientes, só o suficiente para testar o login e o CRUD de
// catálogo/clientes assim que essas capabilities existirem. Não tenta
// reproduzir todo o mock de dados do protótipo (isso deve virar dados de
// teste reais, não hardcode permanente).
//
// CPF/CNPJ/celular são gravados normalizados (só dígitos) — mesma regra que
// a aplicação usa ao persistir (ver openspec/changes/implementar-clientes/
// design.md, Decisão 2). Nunca gravar com máscara aqui.
//
// IDs são Int autoincrement (nunca escolhidos na mão) — a idempotência do
// script não vem mais de um `id` fixo, e sim de: (a) upsert por uma unique
// key de negócio real do schema (Usuario.email, Cliente[clinicaId, cpf/cnpj])
// onde ela existe, ou (b) apagar e recriar a clínica de seed inteira nas
// tabelas sem unique key de negócio (Clinica, ItemCatalogo, Paciente,
// Agendamento, Comanda, ComandaItem), resolvendo a clínica pelo e-mail (esse
// sim único) do usuário admin dela. Cada linha criada encadeia o `.id`
// retornado nas linhas seguintes.
//
// Rodar com: npm run db:seed

import { PrismaClient, CategoriaCatalogo, PapelUsuario, TipoPessoa } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Cria (ou reaproveita) a clínica associada a um usuário admin, identificado
 * por e-mail — a única chave estável entre execuções do seed. Se a clínica já
 * existe, apaga todo o dado "solto" dela (o que não tem unique key própria)
 * antes de recriar, pra o script poder rodar quantas vezes quiser sem
 * duplicar nem acumular lixo. */
async function upsertClinicaComAdmin(params: {
  clinicaNome: string;
  adminNome: string;
  adminEmail: string;
  senhaHash: string;
}) {
  const { clinicaNome, adminNome, adminEmail, senhaHash } = params;

  const usuario = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: { nome: adminNome, email: adminEmail, senhaHash },
  });

  const vinculoExistente = await prisma.usuarioClinica.findFirst({
    where: { usuarioId: usuario.id, papel: PapelUsuario.ADMIN },
    include: { clinica: true },
  });

  let clinica = vinculoExistente?.clinica ?? null;

  if (!clinica) {
    clinica = await prisma.clinica.create({ data: { nome: clinicaNome } });
    await prisma.usuarioClinica.create({
      data: { usuarioId: usuario.id, clinicaId: clinica.id, papel: PapelUsuario.ADMIN },
    });
  }

  // Limpa o dado "solto" (sem unique key de negócio) desta clínica pra
  // recriar do zero a seguir — ordem que respeita as FKs (comanda_itens ->
  // comandas/agendamentos -> pacientes/itens_catalogo).
  await prisma.comandaItem.deleteMany({ where: { comanda: { clinicaId: clinica.id } } });
  await prisma.comanda.deleteMany({ where: { clinicaId: clinica.id } });
  await prisma.agendamento.deleteMany({ where: { clinicaId: clinica.id } });
  await prisma.paciente.deleteMany({ where: { clinicaId: clinica.id } });
  await prisma.itemCatalogo.deleteMany({ where: { clinicaId: clinica.id } });

  return { usuario, clinica };
}

async function main() {
  const senhaHash = await bcrypt.hash("trocar-esta-senha", 10);

  // -------------------------------------------------------------------
  // Clínica A — "Vida Animal"
  // -------------------------------------------------------------------
  const { usuario, clinica } = await upsertClinicaComAdmin({
    clinicaNome: "Clínica Vida Animal",
    adminNome: "Ana Paula",
    adminEmail: "ana@vidaanimal.com.br",
    senhaHash,
  });

  const itensCatalogoDefs = [
    // duracaoPadraoMinutos: só serviço (capability: agendamento, Requirement:
    // Criação de agendamento — pré-preenche a duração do agendamento).
    { nome: "Consulta de rotina", categoria: CategoriaCatalogo.SERVICO, preco: 120, icone: "🩺", duracaoPadraoMinutos: 30 },
    { nome: "Vacinação (V10)", categoria: CategoriaCatalogo.SERVICO, preco: 85, icone: "💉", duracaoPadraoMinutos: 15 },
    { nome: "Banho e tosa", categoria: CategoriaCatalogo.SERVICO, preco: 70, icone: "🛁", duracaoPadraoMinutos: 90 },
    { nome: "Ração premium 1kg", categoria: CategoriaCatalogo.PRODUTO, preco: 38, icone: "🥫", duracaoPadraoMinutos: null },
    { nome: "Antipulgas (pipeta)", categoria: CategoriaCatalogo.PRODUTO, preco: 55, icone: "🧴", duracaoPadraoMinutos: null },
  ];

  const itensCatalogo = new Map<string, Awaited<ReturnType<typeof prisma.itemCatalogo.create>>>();
  for (const item of itensCatalogoDefs) {
    const criado = await prisma.itemCatalogo.create({ data: { clinicaId: clinica.id, ...item } });
    itensCatalogo.set(item.nome, criado);
  }

  const clientesDefs = [
    {
      tipo: TipoPessoa.FISICA,
      nome: "Marina Silva",
      cpf: "38452617062", // normalizado, sem máscara
      nascimento: new Date("1990-04-12"),
      email: "marina.silva@gmail.com",
      celular: "14991234521", // normalizado, sem máscara
      cep: "18602410",
      logradouro: "Rua das Palmeiras",
      numero: "245",
      bairro: "Vila Alta",
      cidade: "Botucatu",
      uf: "SP",
    },
    {
      tipo: TipoPessoa.JURIDICA,
      nome: "Pet Shop Amigo Fiel Ltda",
      cnpj: "11222333000181", // normalizado, sem máscara
      ie: "Isento",
      email: "contato@amigofiel.com.br",
      celular: "14998887766",
    },
  ];

  const clientes = new Map<string, Awaited<ReturnType<typeof prisma.cliente.upsert>>>();
  for (const dados of clientesDefs) {
    const criado = await prisma.cliente.upsert({
      where: {
        // Cliente tem @@unique([clinicaId, cpf]) e @@unique([clinicaId, cnpj])
        // — usa o que existir para este registro.
        ...(dados.cpf
          ? { clinicaId_cpf: { clinicaId: clinica.id, cpf: dados.cpf } }
          : { clinicaId_cnpj: { clinicaId: clinica.id, cnpj: dados.cnpj! } }),
      },
      update: {},
      create: { clinicaId: clinica.id, ...dados },
    });
    clientes.set(dados.nome, criado);
  }

  // Pacientes e agendamentos de hoje — só o suficiente para a fila da tela
  // de atendimento (capability: atendimento-comanda) ter dado real pra
  // mostrar. Sem isso a fila fica sempre vazia, já que esta change não
  // constrói a tela de criação de agendamento (fora de escopo — ver
  // openspec/changes/.../implementar-atendimento-comanda/proposal.md).
  const pacientesDefs = [
    { nome: "Rex", clienteNome: "Marina Silva", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    { nome: "Mimi", clienteNome: "Marina Silva", especie: "GATO", raca: "SRD", sexo: "FEMEA" },
  ] as const;

  const pacientes = new Map<string, Awaited<ReturnType<typeof prisma.paciente.create>>>();
  for (const { clienteNome, ...dados } of pacientesDefs) {
    const clienteId = clientes.get(clienteNome)!.id;
    const criado = await prisma.paciente.create({ data: { clinicaId: clinica.id, clienteId, ...dados } });
    pacientes.set(dados.nome, criado);
  }

  // Horário calculado a partir de "agora" a cada vez que o seed roda — nunca
  // uma data fixa, senão os agendamentos "de hoje" ficariam no passado.
  function hojeAs(hora: number, minuto = 0): Date {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora, minuto, 0, 0);
  }

  const agendamentosHojeDefs = [
    { pacienteNome: "Rex", itemCatalogoNome: "Consulta de rotina", dataHoraInicio: hojeAs(9, 0) },
    { pacienteNome: "Mimi", itemCatalogoNome: "Vacinação (V10)", dataHoraInicio: hojeAs(11, 0) },
    { pacienteNome: "Rex", itemCatalogoNome: "Banho e tosa", dataHoraInicio: hojeAs(15, 30) },
  ];

  for (const { pacienteNome, itemCatalogoNome, dataHoraInicio } of agendamentosHojeDefs) {
    await prisma.agendamento.create({
      data: {
        clinicaId: clinica.id,
        veterinarioId: usuario.id,
        pacienteId: pacientes.get(pacienteNome)!.id,
        itemCatalogoId: itensCatalogo.get(itemCatalogoNome)!.id,
        dataHoraInicio,
      },
    });
  }

  // -------------------------------------------------------------------
  // Clínica B — "Pata Feliz" — permite explorar troca de clínica pela UI
  // com dados reais dos dois lados desde o primeiro `npm run db:seed` (ver
  // openspec/changes/testar-fluxo-multiclinica/proposal.md). Volume mínimo
  // de propósito: só o suficiente pra aparecer em cada tela, não pra
  // estressar performance (design.md, Decisão 3).
  // -------------------------------------------------------------------
  const { usuario: usuarioB, clinica: clinicaB } = await upsertClinicaComAdmin({
    clinicaNome: "Clínica Pata Feliz",
    adminNome: "João Pedro",
    adminEmail: "joao@patafeliz.com.br",
    senhaHash,
  });

  // Ana também tem vínculo com a segunda clínica — usuário com acesso a
  // mais de uma clínica (Requirement "Uma conta, várias clínicas"), pra
  // poder testar a tela `/selecionar-clinica` e a troca de clínica pela
  // UI sem precisar de duas contas separadas.
  await prisma.usuarioClinica.upsert({
    where: { usuarioId_clinicaId: { usuarioId: usuario.id, clinicaId: clinicaB.id } },
    update: {},
    create: { usuarioId: usuario.id, clinicaId: clinicaB.id, papel: PapelUsuario.ADMIN },
  });

  const itemCatalogoB = await prisma.itemCatalogo.create({
    data: {
      clinicaId: clinicaB.id,
      nome: "Consulta de rotina",
      categoria: CategoriaCatalogo.SERVICO,
      preco: 130,
      icone: "🩺",
      duracaoPadraoMinutos: 30,
    },
  });

  const clienteB = await prisma.cliente.upsert({
    where: { clinicaId_cpf: { clinicaId: clinicaB.id, cpf: "72935184600" } },
    update: {},
    create: {
      clinicaId: clinicaB.id,
      tipo: TipoPessoa.FISICA,
      nome: "Júlia Santos",
      cpf: "72935184600", // normalizado, sem máscara
      nascimento: new Date("1988-07-23"),
      email: "julia.santos@gmail.com",
      celular: "14997765432", // normalizado, sem máscara
      cep: "18607070",
      logradouro: "Avenida Dom Lúcio",
      numero: "812",
      bairro: "Jardim Paraíso",
      cidade: "Botucatu",
      uf: "SP",
    },
  });

  const pacienteB = await prisma.paciente.create({
    data: {
      clinicaId: clinicaB.id,
      clienteId: clienteB.id,
      nome: "Nina",
      especie: "GATO",
      raca: "Siamês",
      sexo: "FEMEA",
    },
  });

  // status EM_ATENDIMENTO (não AGUARDANDO): já existe uma comanda aberta
  // vinculada a este agendamento logo abaixo — pela Requirement "Ciclo de
  // status do agendamento", uma Comanda só existe depois dessa transição.
  const agendamentoB = await prisma.agendamento.create({
    data: {
      clinicaId: clinicaB.id,
      pacienteId: pacienteB.id,
      veterinarioId: usuarioB.id,
      itemCatalogoId: itemCatalogoB.id,
      dataHoraInicio: hojeAs(10, 0),
      status: "EM_ATENDIMENTO",
    },
  });

  const comandaB = await prisma.comanda.create({
    data: {
      clinicaId: clinicaB.id,
      agendamentoId: agendamentoB.id,
      pacienteId: pacienteB.id,
      clienteId: clienteB.id,
      veterinarioId: usuarioB.id,
      subtotal: itemCatalogoB.preco,
      total: itemCatalogoB.preco,
    },
  });

  await prisma.comandaItem.create({
    data: {
      comandaId: comandaB.id,
      itemCatalogoId: itemCatalogoB.id,
      nomeSnapshot: itemCatalogoB.nome,
      precoSnapshot: itemCatalogoB.preco,
      quantidade: 1,
      subtotal: itemCatalogoB.preco,
    },
  });

  console.log("Seed concluído:", {
    clinica: clinica.nome,
    usuario: usuario.email,
    clinicaB: clinicaB.nome,
    usuarioB: usuarioB.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
