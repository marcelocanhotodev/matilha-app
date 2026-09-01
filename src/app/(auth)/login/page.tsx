// Tela de login (capability: autenticacao-multi-clinica).
// Referência visual: openspec/reference/prototipo.html, #auth-screen.

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <section className="hidden flex-col justify-center gap-6 bg-pine-900 p-12 text-sand-50 md:flex">
        <div className="text-4xl">🐾</div>
        <h1 className="font-display text-4xl">Matilha</h1>
        <p className="max-w-sm text-sage-300">
          O sistema de agendamento que cuida da rotina da sua clínica veterinária — do
          check-in ao caixa.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-sage-300">
          <li>🗓️ Agenda semanal por veterinário</li>
          <li>🧾 Comanda com serviços e produtos</li>
          <li>🏥 Uma conta, várias clínicas</li>
        </ul>
      </section>

      <section className="flex items-center justify-center bg-sand-50 p-8">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
