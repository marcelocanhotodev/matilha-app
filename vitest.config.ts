import { defineConfig } from "vitest/config";

// Config mínima de testes (capability: autenticacao-multi-clinica).
// Ambiente "node" (não "jsdom") porque os testes desta capability são de
// integração contra o Prisma/Postgres real do docker-compose, não de
// componentes React. `resolve.tsconfigPaths` resolve o alias "@/*" ->
// "src/*" definido em tsconfig.json nativamente, sem plugin extra.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
