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
// Rodar com: npm run db:seed

import { PrismaClient, CategoriaCatalogo, PapelUsuario, TipoPessoa } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const clinica = await prisma.clinica.upsert({
    where: { id: "clinica-seed-vida-animal" },
    update: {},
    create: {
      id: "clinica-seed-vida-animal",
      nome: "Clínica Vida Animal",
    },
  });

  const senhaHash = await bcrypt.hash("trocar-esta-senha", 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: "ana@vidaanimal.com.br" },
    update: {},
    create: {
      nome: "Ana Paula",
      email: "ana@vidaanimal.com.br",
      senhaHash,
    },
  });

  await prisma.usuarioClinica.upsert({
    where: { usuarioId_clinicaId: { usuarioId: usuario.id, clinicaId: clinica.id } },
    update: {},
    create: {
      usuarioId: usuario.id,
      clinicaId: clinica.id,
      papel: PapelUsuario.ADMIN,
    },
  });

  const itensCatalogo = [
    // duracaoPadraoMinutos: só serviço (capability: agendamento, Requirement:
    // Criação de agendamento — pré-preenche a duração do agendamento).
    { nome: "Consulta de rotina", categoria: CategoriaCatalogo.SERVICO, preco: 120, icone: "🩺", duracaoPadraoMinutos: 30 },
    { nome: "Vacinação (V10)", categoria: CategoriaCatalogo.SERVICO, preco: 85, icone: "💉", duracaoPadraoMinutos: 15 },
    { nome: "Banho e tosa", categoria: CategoriaCatalogo.SERVICO, preco: 70, icone: "🛁", duracaoPadraoMinutos: 90 },
    { nome: "Ração premium 1kg", categoria: CategoriaCatalogo.PRODUTO, preco: 38, icone: "🥫", duracaoPadraoMinutos: null },
    { nome: "Antipulgas (pipeta)", categoria: CategoriaCatalogo.PRODUTO, preco: 55, icone: "🧴", duracaoPadraoMinutos: null },
  ];

  for (const item of itensCatalogo) {
    await prisma.itemCatalogo.upsert({
      where: { id: `seed-${item.nome}` },
      update: item,
      create: { id: `seed-${item.nome}`, clinicaId: clinica.id, ...item },
    });
  }

  const clientes = [
    {
      id: "seed-cliente-marina-silva",
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
      id: "seed-cliente-pet-amigo-fiel",
      tipo: TipoPessoa.JURIDICA,
      nome: "Pet Shop Amigo Fiel Ltda",
      cnpj: "11222333000181", // normalizado, sem máscara
      ie: "Isento",
      email: "contato@amigofiel.com.br",
      celular: "14998887766",
    },
  ];

  for (const dados of clientes) {
    const { id, ...resto } = dados;
    await prisma.cliente.upsert({
      where: { id },
      update: {},
      create: { id, clinicaId: clinica.id, ...resto },
    });
  }

  // Pacientes e agendamentos de hoje — só o suficiente para a fila da tela
  // de atendimento (capability: atendimento-comanda) ter dado real pra
  // mostrar. Sem isso a fila fica sempre vazia, já que esta change não
  // constrói a tela de criação de agendamento (fora de escopo — ver
  // openspec/changes/.../implementar-atendimento-comanda/proposal.md).
  const pacientes = [
    { id: "seed-paciente-rex", clienteId: "seed-cliente-marina-silva", nome: "Rex", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    { id: "seed-paciente-mimi", clienteId: "seed-cliente-marina-silva", nome: "Mimi", especie: "GATO", raca: "SRD", sexo: "FEMEA" },
  ] as const;

  for (const dados of pacientes) {
    const { id, ...resto } = dados;
    await prisma.paciente.upsert({ where: { id }, update: {}, create: { id, clinicaId: clinica.id, ...resto } });
  }

  // Horário calculado a partir de "agora" a cada vez que o seed roda — nunca
  // uma data fixa, senão os agendamentos "de hoje" ficariam no passado.
  function hojeAs(hora: number, minuto = 0): Date {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora, minuto, 0, 0);
  }

  const agendamentosHoje = [
    {
      id: "seed-agendamento-rex-manha",
      pacienteId: "seed-paciente-rex",
      itemCatalogoId: "seed-Consulta de rotina",
      dataHoraInicio: hojeAs(9, 0),
    },
    {
      id: "seed-agendamento-mimi-manha",
      pacienteId: "seed-paciente-mimi",
      itemCatalogoId: "seed-Vacinação (V10)",
      dataHoraInicio: hojeAs(11, 0),
    },
    {
      id: "seed-agendamento-rex-tarde",
      pacienteId: "seed-paciente-rex",
      itemCatalogoId: "seed-Banho e tosa",
      dataHoraInicio: hojeAs(15, 30),
    },
  ];

  for (const dados of agendamentosHoje) {
    const { id, dataHoraInicio, ...resto } = dados;
    await prisma.agendamento.upsert({
      where: { id },
      update: { dataHoraInicio }, // recalcula "hoje" toda vez que o seed roda de novo
      create: { id, clinicaId: clinica.id, veterinarioId: usuario.id, dataHoraInicio, ...resto },
    });
  }

  // Segunda clínica — permite explorar troca de clínica pela UI com dados
  // reais dos dois lados desde o primeiro `npm run db:seed` (ver
  // openspec/changes/testar-fluxo-multiclinica/proposal.md). Volume mínimo
  // de propósito: só o suficiente pra aparecer em cada tela, não pra
  // estressar performance (design.md, Decisão 3).
  const clinicaB = await prisma.clinica.upsert({
    where: { id: "clinica-seed-pata-feliz" },
    update: {},
    create: {
      id: "clinica-seed-pata-feliz",
      nome: "Clínica Pata Feliz",
    },
  });

  const usuarioB = await prisma.usuario.upsert({
    where: { email: "joao@patafeliz.com.br" },
    update: {},
    create: {
      nome: "João Pedro",
      email: "joao@patafeliz.com.br",
      senhaHash,
    },
  });

  await prisma.usuarioClinica.upsert({
    where: { usuarioId_clinicaId: { usuarioId: usuarioB.id, clinicaId: clinicaB.id } },
    update: {},
    create: {
      usuarioId: usuarioB.id,
      clinicaId: clinicaB.id,
      papel: PapelUsuario.ADMIN,
    },
  });

  // Ana também tem vínculo com a segunda clínica — usuário com acesso a
  // mais de uma clínica (Requirement "Uma conta, várias clínicas"), pra
  // poder testar a tela `/selecionar-clinica` e a troca de clínica pela
  // UI sem precisar de duas contas separadas.
  await prisma.usuarioClinica.upsert({
    where: { usuarioId_clinicaId: { usuarioId: usuario.id, clinicaId: clinicaB.id } },
    update: {},
    create: {
      usuarioId: usuario.id,
      clinicaId: clinicaB.id,
      papel: PapelUsuario.ADMIN,
    },
  });

  const itemCatalogoB = await prisma.itemCatalogo.upsert({
    where: { id: "seed-b-consulta-de-rotina" },
    update: {},
    create: {
      id: "seed-b-consulta-de-rotina",
      clinicaId: clinicaB.id,
      nome: "Consulta de rotina",
      categoria: CategoriaCatalogo.SERVICO,
      preco: 130,
      icone: "🩺",
      duracaoPadraoMinutos: 30,
    },
  });

  const clienteB = await prisma.cliente.upsert({
    where: { id: "seed-b-cliente-julia-santos" },
    update: {},
    create: {
      id: "seed-b-cliente-julia-santos",
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

  const pacienteB = await prisma.paciente.upsert({
    where: { id: "seed-b-paciente-nina" },
    update: {},
    create: {
      id: "seed-b-paciente-nina",
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
  const agendamentoBId = "seed-b-agendamento-nina-manha";
  await prisma.agendamento.upsert({
    where: { id: agendamentoBId },
    update: { dataHoraInicio: hojeAs(10, 0), status: "EM_ATENDIMENTO" }, // recalcula "hoje" toda vez que o seed roda de novo
    create: {
      id: agendamentoBId,
      clinicaId: clinicaB.id,
      pacienteId: pacienteB.id,
      veterinarioId: usuarioB.id,
      itemCatalogoId: itemCatalogoB.id,
      dataHoraInicio: hojeAs(10, 0),
      status: "EM_ATENDIMENTO",
    },
  });

  const comandaB = await prisma.comanda.upsert({
    where: { agendamentoId: agendamentoBId },
    update: {},
    create: {
      id: "seed-b-comanda-nina",
      clinicaId: clinicaB.id,
      agendamentoId: agendamentoBId,
      pacienteId: pacienteB.id,
      clienteId: clienteB.id,
      veterinarioId: usuarioB.id,
      subtotal: itemCatalogoB.preco,
      total: itemCatalogoB.preco,
    },
  });

  await prisma.comandaItem.upsert({
    where: { id: "seed-b-comanda-item-consulta" },
    update: {},
    create: {
      id: "seed-b-comanda-item-consulta",
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
