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
