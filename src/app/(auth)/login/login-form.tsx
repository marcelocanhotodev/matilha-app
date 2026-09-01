"use client";

// Formulário de login (capability: autenticacao-multi-clinica). Client
// Component isolado — só o form é interativo, conforme convenção do projeto.
// Sem "Entrar com Google", "Esqueci a senha", "Cadastre sua clínica" nem
// "Manter conectado": nenhum tem requirement ou capability por trás (ver
// design.md, Non-Goals).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    const form = new FormData(event.currentTarget);
    const resultado = await signIn("credentials", {
      email: form.get("email"),
      senha: form.get("senha"),
      redirect: false,
    });

    setEnviando(false);

    if (!resultado || resultado.error) {
      // Mensagem genérica — spec: nunca indicar se o e-mail existe ou não.
      setErro("E-mail ou senha incorretos.");
      return;
    }

    // Middleware decide para onde ir a partir daqui (/selecionar-clinica ou painel).
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl text-pine-900">Entrar</h2>
        <p className="text-sm text-pine-700">Acesse o painel da sua clínica</p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-pine-800">
        E-mail
        <input
          type="email"
          name="email"
          required
          placeholder="voce@suaclinica.com.br"
          className="rounded-md border border-sage-300 bg-white px-3 py-2 text-pine-900 outline-none focus:border-sage-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-pine-800">
        Senha
        <input
          type="password"
          name="senha"
          required
          placeholder="••••••••"
          className="rounded-md border border-sage-300 bg-white px-3 py-2 text-pine-900 outline-none focus:border-sage-500"
        />
      </label>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-pine-800 px-4 py-2 font-medium text-sand-50 hover:bg-pine-700 disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
