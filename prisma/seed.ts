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
    { nome: "Consulta de rotina", categoria: CategoriaCatalogo.SERVICO, preco: 120, icone: "🩺" },
    { nome: "Vacinação (V10)", categoria: CategoriaCatalogo.SERVICO, preco: 85, icone: "💉" },
    { nome: "Banho e tosa", categoria: CategoriaCatalogo.SERVICO, preco: 70, icone: "🛁" },
    { nome: "Ração premium 1kg", categoria: CategoriaCatalogo.PRODUTO, preco: 38, icone: "🥫" },
    { nome: "Antipulgas (pipeta)", categoria: CategoriaCatalogo.PRODUTO, preco: 55, icone: "🧴" },
  ];

  for (const item of itensCatalogo) {
    await prisma.itemCatalogo.upsert({
      where: { id: `seed-${item.nome}` },
      update: {},
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

  console.log("Seed concluído:", { clinica: clinica.nome, usuario: usuario.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
