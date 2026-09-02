-- CreateEnum
CREATE TYPE "StatusComanda" AS ENUM ('ABERTA', 'FINALIZADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "comandas" ADD COLUMN     "motivoCancelamento" TEXT,
ADD COLUMN     "status" "StatusComanda" NOT NULL DEFAULT 'ABERTA',
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "formaPagamento" DROP NOT NULL;
