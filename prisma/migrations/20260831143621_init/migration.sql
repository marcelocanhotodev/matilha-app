-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'VETERINARIO', 'RECEPCAO');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "Especie" AS ENUM ('CAO', 'GATO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MACHO', 'FEMEA');

-- CreateEnum
CREATE TYPE "Porte" AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE');

-- CreateEnum
CREATE TYPE "StatusCastracao" AS ENUM ('SIM', 'NAO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGUARDANDO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CategoriaCatalogo" AS ENUM ('SERVICO', 'PRODUTO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO');

-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_clinicas" (
    "usuarioId" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,

    CONSTRAINT "usuarios_clinicas_pkey" PRIMARY KEY ("usuarioId","clinicaId")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "tipo" "TipoPessoa" NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "nascimento" TIMESTAMP(3),
    "cnpj" TEXT,
    "ie" TEXT,
    "email" TEXT NOT NULL,
    "celular" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especie" "Especie" NOT NULL,
    "raca" TEXT NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "nascimento" TIMESTAMP(3),
    "peso" DECIMAL(6,2),
    "cor" TEXT,
    "porte" "Porte",
    "castrado" "StatusCastracao" NOT NULL DEFAULT 'NAO_INFORMADO',
    "microchip" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_catalogo" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaCatalogo" NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "icone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "itemCatalogoId" TEXT,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGUARDANDO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "pacienteId" TEXT,
    "clienteId" TEXT,
    "veterinarioId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_itens" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "itemCatalogoId" TEXT,
    "nomeSnapshot" TEXT NOT NULL,
    "precoSnapshot" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "comanda_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_clinicas_clinicaId_idx" ON "usuarios_clinicas"("clinicaId");

-- CreateIndex
CREATE INDEX "clientes_clinicaId_idx" ON "clientes"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_clinicaId_cpf_key" ON "clientes"("clinicaId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_clinicaId_cnpj_key" ON "clientes"("clinicaId", "cnpj");

-- CreateIndex
CREATE INDEX "pacientes_clinicaId_idx" ON "pacientes"("clinicaId");

-- CreateIndex
CREATE INDEX "pacientes_clienteId_idx" ON "pacientes"("clienteId");

-- CreateIndex
CREATE INDEX "itens_catalogo_clinicaId_idx" ON "itens_catalogo"("clinicaId");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_idx" ON "agendamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_dataHoraInicio_idx" ON "agendamentos"("clinicaId", "dataHoraInicio");

-- CreateIndex
CREATE INDEX "agendamentos_veterinarioId_idx" ON "agendamentos"("veterinarioId");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_agendamentoId_key" ON "comandas"("agendamentoId");

-- CreateIndex
CREATE INDEX "comandas_clinicaId_idx" ON "comandas"("clinicaId");

-- CreateIndex
CREATE INDEX "comandas_clinicaId_criadoEm_idx" ON "comandas"("clinicaId", "criadoEm");

-- CreateIndex
CREATE INDEX "comanda_itens_comandaId_idx" ON "comanda_itens"("comandaId");

-- AddForeignKey
ALTER TABLE "usuarios_clinicas" ADD CONSTRAINT "usuarios_clinicas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_clinicas" ADD CONSTRAINT "usuarios_clinicas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_catalogo" ADD CONSTRAINT "itens_catalogo_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "itens_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_itens" ADD CONSTRAINT "comanda_itens_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_itens" ADD CONSTRAINT "comanda_itens_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "itens_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
