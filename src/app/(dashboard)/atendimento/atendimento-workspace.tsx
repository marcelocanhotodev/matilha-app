"use client";

// Orquestra a sessão de atendimento (capability: atendimento-comanda):
// seleção na fila/avulso/retomada, carrinho, autosave e descarte. Estado de
// UI local (React state) + Server Actions — nenhum dado de negócio fica só
// no client sem ir para o banco (ver openspec/changes/implementar-
// atendimento-comanda/design.md).
//
// Persistência: o primeiro item de uma comanda grava imediatamente — é ele
// que cria a linha no banco (Decisão 3 do design.md). Campos ajustados
// repetidamente (quantidade, desconto) usam debounce de ~10s; adicionar ou
// remover um item é sempre uma intenção discreta de um clique, então
// também grava na hora — não há nada a "acumular" num debounce para uma
// ação de um clique só.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemCatalogo } from "@prisma/client";
import {
  adicionarItem,
  removerItem,
  alterarQuantidade as alterarQuantidadeAction,
  aplicarDesconto as aplicarDescontoAction,
  finalizarComanda,
  descartarComanda,
} from "@/lib/actions/comanda";
import { selecionarAgendamento } from "@/lib/actions/agendamento";
import { calcularDescontoETotal, type TipoDescontoValor, type FormaPagamentoValor } from "@/lib/validators/comanda";
import { Fila } from "./fila";
import { CatalogoGrid } from "./catalogo-grid";
import { Carrinho, type ItemSessao } from "./carrinho";
import { ComandasAbertas } from "./comandas-abertas";
import { DescartarModal } from "./descartar-modal";
import type { AgendamentoFila, ComandaComItens, ComandaForaDaFila } from "./types";

const DEBOUNCE_MS = 10_000;

function itensDeComanda(comanda: ComandaComItens): ItemSessao[] {
  return comanda.itens.map((i) => ({
    id: i.id,
    itemCatalogoId: i.itemCatalogoId,
    nome: i.nomeSnapshot,
    preco: Number(i.precoSnapshot),
    quantidade: i.quantidade,
  }));
}

export function AtendimentoWorkspace({
  agendamentosHoje,
  catalogo,
  comandasForaDaFila,
}: {
  agendamentosHoje: AgendamentoFila[];
  catalogo: ItemCatalogo[];
  comandasForaDaFila: ComandaForaDaFila[];
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  const [selecaoId, setSelecaoId] = useState<number | "avulso" | null>(null); // agendamentoId, "avulso" ou null
  const [comandaId, setComandaId] = useState<number | null>(null);
  const [itens, setItens] = useState<ItemSessao[]>([]);
  const [desconto, setDesconto] = useState<{ tipo: TipoDescontoValor; valor: number }>({ tipo: "FIXO", valor: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [descarteAlvo, setDescarteAlvo] = useState<number | null>(null);
  const [enviandoDescarte, setEnviandoDescarte] = useState(false);

  // Refs além do state: os callbacks de debounce disparam depois de um
  // timer, quando o closure do render que os criou já pode estar
  // desatualizado — leem sempre o valor mais recente via ref.
  const comandaIdRef = useRef<number | null>(null);
  const agendamentoIdRef = useRef<number | null>(null);
  const debounceQuantidadeRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debounceDescontoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function definirComandaId(id: number | null) {
    comandaIdRef.current = id;
    setComandaId(id);
  }

  const subtotal = itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
  const { total } = calcularDescontoETotal(subtotal, desconto);

  const agendamentoSelecionado =
    selecaoId && selecaoId !== "avulso" ? (agendamentosHoje.find((a) => a.id === selecaoId) ?? null) : null;
  const servicoPrevistoJaNoCarrinho = agendamentoSelecionado?.itemCatalogo
    ? itens.some((i) => i.itemCatalogoId === agendamentoSelecionado.itemCatalogo!.id)
    : false;

  function reiniciarSessao() {
    definirComandaId(null);
    agendamentoIdRef.current = null;
    setSelecaoId(null);
    setItens([]);
    setDesconto({ tipo: "FIXO", valor: 0 });
  }

  function selecionarAvulso() {
    reiniciarSessao();
    setSelecaoId("avulso");
  }

  function selecionarAgendamentoDaFila(agendamento: AgendamentoFila) {
    reiniciarSessao();
    setSelecaoId(agendamento.id);
    agendamentoIdRef.current = agendamento.id;

    if (agendamento.comanda) {
      // Requirement "Retomar comanda aberta", Scenario "Reabrir agendamento
      // com comanda aberta no mesmo dia" — carrega o carrinho já salvo.
      definirComandaId(agendamento.comanda.id);
      setItens(itensDeComanda(agendamento.comanda));
      setDesconto({ tipo: "FIXO", valor: Number(agendamento.comanda.desconto) });
    }

    // Requirement "Ciclo de status do agendamento" (spec de agendamento),
    // Scenario "Selecionar na fila inicia o atendimento" — antes de
    // qualquer item ser adicionado à comanda.
    iniciarTransicao(async () => {
      await selecionarAgendamento({ agendamentoId: agendamento.id });
      router.refresh();
    });
  }

  function retomarComandaExterna(comanda: ComandaForaDaFila) {
    // Scenario "Reabrir comanda aberta de um agendamento de outro dia" —
    // mesmo mecanismo de carregar o carrinho salvo, disparado a partir da
    // seção "Comandas em aberto" em vez da fila.
    reiniciarSessao();
    setSelecaoId(comanda.agendamento?.id ?? "avulso");
    agendamentoIdRef.current = comanda.agendamento?.id ?? null;
    definirComandaId(comanda.id);
    setItens(itensDeComanda(comanda));
    setDesconto({ tipo: "FIXO", valor: Number(comanda.desconto) });
  }

  function aoAdicionarItem(item: ItemCatalogo) {
    setErro(null);
    setItens((atual) => {
      const existente = atual.find((i) => i.itemCatalogoId === item.id);
      if (existente) {
        // Scenario "Adicionar item já presente na comanda".
        return atual.map((i) => (i.itemCatalogoId === item.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [
        ...atual,
        { id: `novo-${item.id}-${Date.now()}`, itemCatalogoId: item.id, nome: item.nome, preco: Number(item.preco), quantidade: 1 },
      ];
    });

    iniciarTransicao(async () => {
      const resultado = await adicionarItem({
        comandaId: comandaIdRef.current ?? undefined,
        agendamentoId: comandaIdRef.current ? undefined : (agendamentoIdRef.current ?? undefined),
        item: { itemCatalogoId: item.id, quantidade: 1 },
      });
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível adicionar o item.");
        return;
      }
      if (!comandaIdRef.current && resultado.comandaId) {
        definirComandaId(resultado.comandaId);
      }
      router.refresh();
    });
  }

  function aoAlterarQuantidade(comandaItemId: string | number, quantidade: number) {
    setItens((atual) => atual.map((i) => (i.id === comandaItemId ? { ...i, quantidade } : i)));

    const chave = String(comandaItemId);
    if (debounceQuantidadeRef.current[chave]) clearTimeout(debounceQuantidadeRef.current[chave]);
    debounceQuantidadeRef.current[chave] = setTimeout(() => {
      if (!comandaIdRef.current) return;
      iniciarTransicao(async () => {
        const resultado = await alterarQuantidadeAction({
          comandaId: comandaIdRef.current!,
          comandaItemId,
          quantidade,
        });
        if (!resultado.ok) setErro(resultado.erro ?? "Não foi possível salvar a quantidade.");
        router.refresh();
      });
    }, DEBOUNCE_MS);
  }

  function aoRemoverItem(comandaItemId: string | number) {
    setItens((atual) => atual.filter((i) => i.id !== comandaItemId));

    if (!comandaIdRef.current) return; // item ainda não persistido (raro, mas possível entre o clique e a resposta do primeiro item)
    iniciarTransicao(async () => {
      const resultado = await removerItem({ comandaId: comandaIdRef.current!, comandaItemId });
      if (!resultado.ok) setErro(resultado.erro ?? "Não foi possível remover o item.");
      router.refresh();
    });
  }

  function aoMudarDesconto(novoDesconto: { tipo: TipoDescontoValor; valor: number }) {
    setDesconto(novoDesconto);

    if (debounceDescontoRef.current) clearTimeout(debounceDescontoRef.current);
    debounceDescontoRef.current = setTimeout(() => {
      if (!comandaIdRef.current) return;
      iniciarTransicao(async () => {
        const resultado = await aplicarDescontoAction({ comandaId: comandaIdRef.current!, desconto: novoDesconto });
        if (!resultado.ok) setErro(resultado.erro ?? "Não foi possível aplicar o desconto.");
        router.refresh();
      });
    }, DEBOUNCE_MS);
  }

  function aoFinalizar(formaPagamento: FormaPagamentoValor) {
    if (!comandaIdRef.current) return;
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await finalizarComanda({ comandaId: comandaIdRef.current!, formaPagamento });
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível finalizar.");
        return;
      }
      reiniciarSessao();
      router.refresh();
    });
  }

  function aoConfirmarDescarte(motivo: string) {
    if (!descarteAlvo) return;
    setEnviandoDescarte(true);
    iniciarTransicao(async () => {
      const resultado = await descartarComanda({ comandaId: descarteAlvo, motivo });
      setEnviandoDescarte(false);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível descartar.");
        setDescarteAlvo(null);
        return;
      }
      if (descarteAlvo === comandaIdRef.current) {
        reiniciarSessao();
      }
      setDescarteAlvo(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <Fila
        agendamentos={agendamentosHoje}
        selecionadoId={selecaoId}
        onSelecionarAgendamento={selecionarAgendamentoDaFila}
        onSelecionarAvulso={selecionarAvulso}
        disabled={pendente}
      />

      <ComandasAbertas
        comandas={comandasForaDaFila}
        disabled={pendente}
        onRetomar={retomarComandaExterna}
        onDescartar={(comanda) => setDescarteAlvo(comanda.id)}
      />

      {agendamentoSelecionado && (
        // Requirement "Fila de agendamentos do dia", Scenario "Selecionar
        // agendamento existente": dados do paciente/tutor/profissional +
        // atalho para o serviço já previsto, quando existir no catálogo.
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sage-300 bg-sand-50 px-4 py-3 text-sm">
          <div className="text-pine-800">
            <b>{agendamentoSelecionado.paciente.nome}</b> · tutor: {agendamentoSelecionado.paciente.cliente.nome}
          </div>
          {agendamentoSelecionado.itemCatalogo && !servicoPrevistoJaNoCarrinho && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => aoAdicionarItem(agendamentoSelecionado.itemCatalogo!)}
              className="rounded-md border border-gold-600 bg-gold-500/15 px-3 py-1.5 text-xs font-medium text-pine-900 hover:bg-gold-500/25 disabled:opacity-60"
            >
              + Adicionar serviço previsto: {agendamentoSelecionado.itemCatalogo.nome}
            </button>
          )}
        </div>
      )}

      {selecaoId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <CatalogoGrid catalogo={catalogo} onAdicionar={aoAdicionarItem} disabled={pendente} />
          <Carrinho
            itens={itens}
            desconto={desconto}
            total={total}
            disabled={pendente}
            temComanda={comandaId !== null}
            onAlterarQuantidade={aoAlterarQuantidade}
            onRemoverItem={aoRemoverItem}
            onMudarDesconto={aoMudarDesconto}
            onFinalizar={aoFinalizar}
            onDescartar={() => comandaId && setDescarteAlvo(comandaId)}
          />
        </div>
      )}

      {descarteAlvo && (
        <DescartarModal
          onConfirmar={aoConfirmarDescarte}
          onCancelar={() => setDescarteAlvo(null)}
          enviando={enviandoDescarte}
        />
      )}
    </div>
  );
}
