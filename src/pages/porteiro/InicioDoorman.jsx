import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { condominiosApi } from "../../services/condominiosApi";
import { Icone } from "../../components/icones/Icone";

const CARDS_PORTEIRO = [
  {
    to: "/entradas-e-saidas",
    label: "Controle de Acesso",
    desc: "Registrar entradas e saídas de moradores e visitantes",
    icon: "sensor_door",
    color: "primary",
  },
  {
    to: "/entregas",
    label: "Controle de Entregas",
    desc: "Receber e registrar encomendas e pacotes",
    icon: "inventory_2",
    color: "secondary",
  },
  {
    to: "/chaves",
    label: "Controle de Chaves",
    desc: "Gerenciar chaves e acessos do condomínio",
    icon: "key",
    color: "tertiary",
  },
  {
    to: "/espacos",
    label: "Espaços",
    desc: "Visualizar e acompanhar áreas comuns",
    icon: "deck",
    color: "primary",
  },
  {
    to: "/veiculos",
    label: "Veículos de Serviço",
    desc: "Cadastrar e gerenciar veículos de serviço",
    icon: "local_shipping",
    color: "secondary",
  },
  {
    to: "/usuarios",
    label: "Usuários do Condomínio",
    desc: "Consultar moradores, porteiros e funcionários",
    icon: "people",
    color: "tertiary",
  },
];

const COLOR_MAP = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    hover: "hover:border-primary/35",
    badge: "bg-primary/20",
  },
  secondary: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    hover: "hover:border-secondary/35",
    badge: "bg-secondary/20",
  },
  tertiary: {
    bg: "bg-tertiary/10",
    text: "text-tertiary",
    hover: "hover:border-tertiary/35",
    badge: "bg-tertiary/20",
  },
};

export function InicioDoorman() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(" ")[0] || "Porteiro";
  const [nomeCondominio, setNomeCondominio] = useState(null);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    condominiosApi
      .buscar(usuario.condominioId)
      .then((res) => setNomeCondominio(res.data.condominio?.nome ?? null))
      .catch(() => {});
  }, [usuario?.condominioId]);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-10">

        <header className="text-center max-w-3xl mx-auto">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-2">
            {nomeCondominio ?? "Condomínio"} · Portaria
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
            Olá,{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {primeiroNome}
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Painel de controle da portaria. Selecione a funcionalidade desejada.
          </p>
        </header>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARDS_PORTEIRO.map((item) => {
              const c = COLOR_MAP[item.color];
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group glass-panel rounded-3xl p-6 border border-outline-variant/15 ${c.hover} hover:bg-white/[0.03] transition-all duration-300`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
                  >
                    <Icone name={item.icon} className={`${c.text} text-3xl`} />
                  </div>
                  <h3 className="font-headline font-bold text-on-surface text-lg mb-1.5">
                    {item.label}
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-snug">{item.desc}</p>
                  <span
                    className={`mt-4 inline-flex items-center gap-1 ${c.text} text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    Abrir
                    <Icone name="chevron_right" className="text-lg" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8 relative overflow-hidden border border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Icone name="security" className="text-primary text-2xl" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-0.5">
                Segurança em primeiro lugar
              </h3>
              <p className="text-on-surface-variant text-sm">
                Registre todas as entradas e saídas. Convidados bloqueados não podem ser autorizados sem permissão do responsável da unidade.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
