// src/pages/inicio/Inicio.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useModules } from "../../contexts/ModulesContext";
import { condominiosApi } from "../../services/condominiosApi";
import { comunicacaoApi, urlDaImagem } from "../../services/comunicacaoApi";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { Icone } from "../../components/icones/Icone";
import { PERFIS, isUsuarioRestrito, perfilTemAcessoSistema } from "../../utils/perfis";
import { linkLiberado } from "../../utils/modulosPlano";
import { formatarData } from "../../utils/datas";
import { InicioDoorman } from "../porteiro/InicioDoorman";

const ACESSO_RAPIDO = [
  {
    to: "/avisos",
    label: "Avisos",
    desc: "Comunicados da administração",
    icon: "campaign",
    modulo: "comunicacao",
  },
  {
    to: "/financeiro",
    label: "Cobranças",
    desc: "Faturas, boleto e PIX",
    icon: "receipt_long",
    modulo: "financeiro",
  },
  {
    to: "/espacos",
    label: "Espaços",
    desc: "Reservar áreas comuns",
    icon: "event_available",
    modulo: "areas_comuns",
  },
  {
    to: "/entregas",
    label: "Entregas",
    desc: "Encomendas na portaria",
    icon: "inventory_2",
    modulo: "entregas",
  },
  {
    to: "/meus-convidados",
    label: "Convidados",
    desc: "Autorizar a entrada de visitantes",
    icon: "group_add",
  },
  {
    to: "/meus-veiculos",
    label: "Veículos",
    desc: "Carros e vagas da sua unidade",
    icon: "directions_car",
    modulo: "veiculos",
  },
  {
    to: "/reclamacoes",
    label: "Reclamações",
    desc: "Abrir ou acompanhar chamados",
    icon: "report",
    modulo: "reclamacoes",
  },
  {
    to: "/servicos",
    label: "Serviços",
    desc: "Portaria, manutenção e mais",
    icon: "room_service",
  },
];

/**
 * O comunicado aberto.
 *
 * Fecha por três caminhos — botão, clique fora e Escape — e todos passam por
 * `aoFechar`, que é quem registra a leitura. Se algum deles fechasse por outro
 * caminho, existiria um jeito de ler o aviso sem que a leitura fosse contada.
 */
function PopupAviso({ aviso, aoFechar }) {
  const caixa = useRef(null);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);

    // Trava a rolagem do fundo: sem isso a página atrás desliza junto e o
    // pop-up parece solto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    caixa.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar]);

  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={aviso.titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel rounded-3xl w-full max-w-lg max-h-[85dvh] flex flex-col outline-none"
      >
        <header className="flex items-start gap-3 p-6 pb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Icone name="campaign" className="text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-headline text-xl font-bold text-on-surface leading-snug">
              {aviso.titulo}
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {aviso.autor ? `${aviso.autor} · ` : ""}
              vigente de {formatarData(aviso.dataInicio)} a {formatarData(aviso.dataFim)}
            </p>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="shrink-0 -mt-1 -mr-1 p-2 rounded-xl text-on-surface-variant hover:bg-veu/5 cursor-pointer"
          >
            <Icone name="close" />
          </button>
        </header>

        <div className="px-6 overflow-y-auto space-y-4">
          {aviso.imagemUrl && (
            <img
              src={urlDaImagem(aviso.imagemUrl)}
              alt=""
              className="w-full max-h-72 object-contain rounded-2xl border border-veu/10 bg-surface-container-low"
            />
          )}
          {/* `break-words` junto do `pre-wrap`: sem ele uma palavra longa sem
              espaços não quebra, e o comunicado ganha rolagem horizontal. */}
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
            {aviso.mensagem}
          </p>
        </div>

        <footer className="p-6 pt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-on-surface-variant/70">
            Ao fechar, o aviso será marcado como lido.
          </p>
          <button
            onClick={aoFechar}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition cursor-pointer"
          >
            Entendi
          </button>
        </footer>
      </div>
    </div>
  );
}

export function Inicio() {
  const { usuario } = useAuth();
  const { buscar: recarregarSino } = useNotificacoes();
  const { activeModules } = useModules();

  const primeiroNome = usuario?.nome?.split(" ")[0] || "Morador";
  const [nomeCondominio, setNomeCondominio] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [avisoAberto, setAvisoAberto] = useState(null);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    condominiosApi.buscar(usuario.condominioId)
      .then((res) => setNomeCondominio(res.data.condominio?.nome ?? null))
      .catch(() => {});
    // Pelo comunicacao-service, e não direto no portaria: é ele que recorta
    // pelo público-alvo e sabe o que esta pessoa já leu. Buscando no portaria,
    // esta seção mostrava a todo mundo os avisos de todo mundo — inclusive
    // comunicado interno de funcionário para o morador.
    comunicacaoApi.listarAvisos()
      .then((res) => setAvisos(res.data?.avisos ?? []))
      .catch(() => {});
  }, [usuario?.condominioId]);

  // `destinatario` vem falso para a gestão; `lido` some da lista assim que a
  // pessoa abre o aviso em /avisos.
  const naoLidos = avisos.filter((a) => a.destinatario !== false && !a.lido);

  /**
   * Fechar o comunicado é o que registra a leitura.
   *
   * Registrar na abertura seria mais fácil, e pior: bastaria um toque errado na
   * lista para o sistema afirmar que a pessoa leu. Fechando, ela teve o texto
   * na frente — que é o que o síndico precisa poder alegar.
   *
   * A falha é silenciosa de propósito: o aviso continua na lista e será
   * oferecido de novo. Um alerta de erro aqui atrapalharia sem dar o que fazer.
   */
  // Estável: o pop-up a tem nas dependências do efeito que escuta o Escape e
  // dá foco ao diálogo. Recriada a cada render, esse efeito rodaria de novo a
  // cada render do pai — e o `focus()` arrancaria o foco de quem estivesse
  // navegando por teclado.
  const fecharEMarcar = useCallback(async () => {
    const aviso = avisoAberto;
    setAvisoAberto(null);
    if (!aviso || aviso.lido) return;

    try {
      const { data } = await comunicacaoApi.confirmarLeitura(aviso.id);
      setAvisos((lista) =>
        lista.map((a) =>
          a.id === aviso.id ? { ...a, lido: true, lidoEm: data.leitura?.confirmadaEm } : a,
        ),
      );
      recarregarSino();
    } catch {
      /* fica pendente, e reaparece na próxima visita */
    }
  }, [avisoAberto, recarregarSino]);

  // Sem vínculo com unidade, a navbar já esconde todos os links. Os atalhos
  // precisavam seguir a mesma regra: ofereciam por outro caminho exatamente o
  // que ela esconde — e agora são nove, não três.
  const restrito = isUsuarioRestrito(usuario);

  if (usuario?.perfil === PERFIS.PORTEIRO) {
    return <InicioDoorman />;
  }

  if (!perfilTemAcessoSistema(usuario?.perfil)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6">
        <div className="glass-panel rounded-3xl p-10 max-w-md w-full text-center space-y-4 border border-outline-variant/15">
          <div className="w-16 h-16 rounded-2xl bg-on-surface-variant/10 flex items-center justify-center mx-auto">
            <Icone name="lock" className="text-on-surface-variant text-3xl" />
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Acesso não configurado
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Seu perfil ainda não possui acesso a nenhuma área do sistema.
            Procure a administração do condomínio se isso for um engano.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="text-center max-w-3xl mx-auto">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-2">
            {nomeCondominio ?? "Condomínio"}
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
            Olá,{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {primeiroNome}
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Central do seu condomínio: reservas, comunicação e tudo o que você precisa em um só lugar.
          </p>
        </header>

        {avisoAberto && <PopupAviso aviso={avisoAberto} aoFechar={fecharEMarcar} />}

        {/*
          Só o que ainda não foi lido, e só para quem é destinatário. A gestão
          publica os avisos: mostrá-los aqui como se fossem para ela confundia
          quem escreveu o comunicado com quem precisa lê-lo. A visão de quem
          publica é a tela Comunicados.
        */}
        {naoLidos.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Icone name="campaign" className="text-primary text-xl" />
              <h2 className="font-headline text-2xl font-bold text-on-surface">Avisos</h2>
            </div>
            <div className="space-y-3">
              {naoLidos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAvisoAberto(a)}
                  className="w-full text-left glass-panel rounded-2xl p-5 border border-primary/15 hover:border-primary/40 hover:bg-veu/[0.03] transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icone name="campaign" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface">{a.titulo}</p>
                      {/* Prévia de duas linhas: o texto inteiro é o conteúdo do
                          pop-up, e é abri-lo que conta como leitura. */}
                      <p className="text-sm text-on-surface-variant mt-1 line-clamp-2 break-words">{a.mensagem}</p>
                      <p className="text-xs text-on-surface-variant/70 mt-2 flex items-center gap-1.5">
                        Até {formatarData(a.dataFim)}
                        {a.autor ? ` · ${a.autor}` : ""}
                        {a.imagemUrl && <Icone name="image" className="text-sm" />}
                      </p>
                    </div>
                    <Icone name="chevron_right" className="text-on-surface-variant/40 shrink-0 mt-2" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {restrito ? (
          <div className="glass-panel rounded-3xl p-6 flex items-start gap-3">
            <Icone name="info" className="text-primary text-xl shrink-0 mt-0.5" />
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Seu usuário ainda não está vinculado a uma unidade. Assim que a
              administração fizer o vínculo, os atalhos do condomínio aparecem aqui.
            </p>
          </div>
        ) : (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Acesso rápido</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                Atalhos para as áreas mais usadas do app
              </p>
            </div>
            <Link
              to="/perfil"
              className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Meu perfil
              <Icone name="arrow_forward" className="text-base" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACESSO_RAPIDO.filter((item) => linkLiberado(activeModules, item)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group glass-panel rounded-3xl p-5 border border-outline-variant/15 hover:border-primary/35 hover:bg-veu/[0.03] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icone name={item.icon} className="text-primary text-2xl" />
                </div>
                <h3 className="font-headline font-bold text-on-surface text-lg mb-1">{item.label}</h3>
                <p className="text-on-surface-variant text-sm leading-snug">{item.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir
                  <Icone name="chevron_right" className="text-lg" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        )}

        <div className="glass-panel rounded-[2rem] p-8 md:p-10 relative overflow-hidden border border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-tertiary/5 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
                <Icone name="apartment" className="text-secondary text-3xl" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
                  Precisa de ajuda da administração?
                </h3>
                <p className="text-on-surface-variant text-sm max-w-xl">
                  Use reclamações para chamados ou consulte serviços do condomínio. Os avisos oficiais aparecem no topo desta página.
                </p>
              </div>
            </div>
            <Link
              to="/reclamacoes"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
            >
              Ir para reclamações
              <Icone name="arrow_forward" />
            </Link>
          </div>
        </div>
      </div>

      <Link
        to="/faq"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full glass-panel border border-outline-variant/15 text-on-surface hover:border-primary/35 hover:bg-veu/[0.03] transition-all duration-300"
        aria-label="Abrir FAQ"
        title="FAQ"
      >
        <Icone name="help" className="text-primary text-xl" />
        <span className="text-sm font-semibold">FAQ</span>
      </Link>
    </div>
  );
}
