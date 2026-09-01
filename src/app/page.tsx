import { redirect } from "next/navigation";

// Capability: autenticacao-multi-clinica. O middleware (src/middleware.ts) já
// garante que, para chegar aqui, o usuário está autenticado e tem
// clinicaAtivaId na sessão (senão já foi redirecionado para /login ou
// /selecionar-clinica) — então "/" só precisa apontar para o painel.
export default function Home() {
  redirect("/dashboard");
}
