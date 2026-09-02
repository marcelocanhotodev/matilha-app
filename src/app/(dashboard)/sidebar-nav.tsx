"use client";

// Lista de navegação da sidebar (capability: navegacao). Client Component
// isolado do layout/sidebar Server Component — usePathname() só existe no
// client, mesmo padrão já usado no repo para isolar estado de cliente
// (<ClientesTable>, <PacientesGrid>, <ClinicSwitcher>).
//
// Ordem, rótulos e destinos vêm de openspec/specs/navegacao/spec.md — não
// adicionar/remover/reordenar item aqui sem atualizar a spec. Ícones são os
// mesmos SVG inline do protótipo (openspec/reference/prototipo.html, seção
// "Sidebar"), sem biblioteca de ícones.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    href: "/pacientes",
    label: "Pacientes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 21c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/atendimento",
    label: "Atendimento",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2h9l3 3v17H6z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    ),
  },
  {
    href: "/cadastro",
    label: "Cadastro",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.6 12.3 12.7 20.2a2 2 0 0 1-2.8 0L3.5 13.8a2 2 0 0 1 0-2.8L11.4 3h6.2a3 3 0 0 1 3 3v6.3z" />
        <circle cx="15.5" cy="7.5" r="1.3" />
      </svg>
    ),
  },
  {
    href: "/historico",
    label: "Histórico",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 3 3 5-6" />
      </svg>
    ),
  },
];

/**
 * `/dashboard` só fica ativo em correspondência exata (senão qualquer rota
 * ficaria "abaixo" dele). As demais rotas destacam também sub-rotas futuras
 * (ex.: `/pacientes/123` mantém "Pacientes" ativo) — spec.md, Requirement:
 * Destaque da rota ativa.
 */
function rotaEstaAtiva(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto lg:mt-3 lg:flex-col lg:items-stretch lg:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const ativo = rotaEstaAtiva(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={
              "flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors " +
              (ativo
                ? "bg-gold-500 text-pine-900"
                : "text-sage-300 hover:bg-white/[.06] hover:text-white")
            }
          >
            <span
              className={
                "h-[17px] w-[17px] flex-shrink-0 [&>svg]:h-full [&>svg]:w-full " +
                (ativo ? "opacity-100" : "opacity-85")
              }
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
