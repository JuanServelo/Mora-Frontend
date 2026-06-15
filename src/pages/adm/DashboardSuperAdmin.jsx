// src/pages/adm/DashboardSuperAdmin.jsx
// Dashboard da Plataforma (Super Admin)
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { planoApi, tenantApi } from "../../services/plataformaApi";
import { Icone } from "../../components/icones/Icone";
import { useToast } from "../../contexts/ToastContext";

export function DashboardSuperAdmin() {
  const toast = useToast();
  const [planos, setPlanos] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      planoApi.listar().catch(() => ({ data: { planos: [] } })),
      tenantApi.listar().catch(() => ({ data: { tenants: [] } })),
    ])
      .then(([planosRes, tenantsRes]) => {
        setPlanos(planosRes.data.planos || []);
        setTenants(tenantsRes.data.tenants || []);
      })
      .catch((err) =>
        toast.error(err.response?.data?.mensagem || "Erro ao carregar o dashboard."),
      )
      .finally(() => setCarregando(false));
  }, []);

  const planosAtivos = planos.filter((p) => p.isActive).length;
  const tenantsAtivos = tenants.filter((t) => t.status === "active").length;
  const tenantsProvisionados = tenants.filter((t) => t.provisioned).length;
  const tenantsSuspensos = tenants.filter((t) => t.status === "suspended").length;

  const cards = [
    {
      label: "Planos",
      value: planos.length,
      sub: `${planosAtivos} ativos`,
      icon: "workspace_premium",
      to: "/adm/planos",
    },
    {
      label: "Tenants",
      value: tenants.length,
      sub: `${tenantsAtivos} ativos`,
      icon: "domain",
      to: "/adm/tenants",
    },
    {
      label: "Provisionados",
      value: tenantsProvisionados,
      sub: `${Math.max(tenants.length - tenantsProvisionados, 0)} pendentes`,
      icon: "cloud_done",
      to: "/adm/tenants",
    },
    {
      label: "Suspensos",
      value: tenantsSuspensos,
      sub: "tenants",
      icon: "pause_circle",
      to: "/adm/tenants",
    },
  ];

  const atalhos = [
    {
      label: "Gerenciar Planos",
      desc: "Catálogo de planos SaaS",
      icon: "workspace_premium",
      to: "/adm/planos",
    },
    {
      label: "Gerenciar Tenants",
      desc: "Clientes da plataforma",
      icon: "domain",
      to: "/adm/tenants",
    },
  ];

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Plataforma
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="text-on-surface-variant font-light text-lg mt-2">
            Visão geral da plataforma Mora.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="glass-panel rounded-3xl p-6 group hover:bg-white/5 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 rounded-t-3xl" />
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icone name={card.icon} className="text-primary" />
              </div>
              <p className="text-4xl font-headline font-bold text-on-surface mb-1">
                {card.value}
              </p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-primary text-xs font-medium mt-2">{card.sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {atalhos.map((atalho) => (
            <Link
              key={atalho.to}
              to={atalho.to}
              className="glass-panel rounded-3xl p-6 flex items-center gap-4 group hover:bg-white/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Icone name={atalho.icon} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-semibold text-lg">{atalho.label}</p>
                <p className="text-on-surface-variant text-sm">{atalho.desc}</p>
              </div>
              <Icone
                name="arrow_forward_ios"
                className="text-outline group-hover:text-primary transition-colors text-sm"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
