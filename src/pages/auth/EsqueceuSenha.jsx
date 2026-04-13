// src/pages/auth/EsqueceuSenha.jsx
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { Icone } from "../../components/icones/Icone";

export function EsqueceuSenha() {
  const { t } = useTranslation();

  function handleSubmit(e) {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <main className="relative w-full max-w-4xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Coluna esquerda — Marca + Suporte */}
        <div className="lg:col-span-7 hidden lg:flex flex-col space-y-8">
          <div className="space-y-2">
            <h1 className="font-headline text-6xl font-extrabold tracking-tighter bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">
              Mora
            </h1>
          </div>

          <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
            {t("recovery.left.description")}
          </p>

          {/* Suporte */}
          <div className="pt-4 border-t border-outline-variant/15">
            <p className="text-outline text-sm leading-loose">
              {t("recovery.support")}
              <br />
              <Trans
                i18nKey="recovery.concierge"
                components={{
                  span: (
                    <span className="text-secondary cursor-pointer hover:underline" />
                  ),
                }}
              />
            </p>
          </div>
        </div>

        {/* Coluna direita — Card de recuperação */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="glass-panel w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[60px] pointer-events-none transition-all duration-700 group-hover:bg-primary/30" />

            <div className="relative z-10">
              {/* Ícone */}
              <div className="mb-6 flex flex-col items-center lg:items-start">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icone name="lock_reset" className="text-primary text-2xl" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">
                  {t("recovery.title")}
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {t("recovery.description")}
                </p>
              </div>

              {/* Formulário */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <Campo
                  id="email-recuperacao"
                  label={t("recovery.email.label")}
                  type="email"
                  placeholder={t("recovery.email.placeholder")}
                  icon="mail"
                />
                <div className="pt-1">
                  <Botao type="submit">
                    {t("recovery.submit")}
                    <Icone name="arrow_forward" className="text-xl" />
                  </Botao>
                </div>
              </form>

              {/* Voltar para login */}
              <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium group/back"
                >
                  <Icone
                    name="chevron_left"
                    className="text-lg transition-transform duration-300 group-hover/back:-translate-x-1"
                  />
                  {t("recovery.back")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
