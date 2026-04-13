// src/pages/auth/SolicitarAcesso.jsx
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { CartaoRecurso } from "../../components/cards/CartaoRecurso";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

export function SolicitarAcesso() {
  const { t } = useTranslation();

  function handleSubmit(e) {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex items-center justify-center">
      <main className="relative w-full max-w-4xl px-4 py-8 grid lg:grid-cols-2 gap-8 items-center">
        {/* Coluna esquerda — Hero da marca */}
        <div className="hidden lg:flex flex-col space-y-6">
          <div className="space-y-4">
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface">
              Mora<span className="text-primary">.</span>
            </h1>
            <p className="text-lg font-headline text-on-surface-variant max-w-sm leading-relaxed">
              {t("brand.tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <CartaoRecurso
              icon="concierge"
              iconColor="text-primary"
              title={t("feature.concierge.title")}
              description={t("feature.concierge.desc")}
            />
            <CartaoRecurso
              icon="verified_user"
              iconColor="text-secondary"
              title={t("feature.privacy.title")}
              description={t("feature.privacy.desc")}
            />
          </div>
        </div>

        {/* Coluna direita — Formulário */}
        <div className="w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-sm p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden glass-panel">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />

            <div className="relative z-10">
              <div className="mb-10">
                <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                  {t("form.title")}
                </h2>
                <p className="text-on-surface-variant mt-2">
                  {t("form.subtitle")}
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <Campo
                  id="nome-completo"
                  label={t("field.name.label")}
                  placeholder={t("field.name.placeholder")}
                  icon="person"
                />
                <Campo
                  id="email"
                  label={t("field.email.label")}
                  type="email"
                  placeholder="julian@exemplo.com"
                  icon="mail"
                />
                <div className="pt-4">
                  <Botao type="submit">
                    {t("form.submit")}
                  </Botao>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                <p className="text-on-surface-variant text-sm">
                  <Trans
                    i18nKey="already.have.account"
                    components={{
                      lnk: (
                        <Link
                          to="/login"
                          className="text-secondary font-semibold hover:underline decoration-secondary/30 underline-offset-4"
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
