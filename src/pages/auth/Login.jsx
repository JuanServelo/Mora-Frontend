// src/pages/auth/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { Icone } from "../../components/icones/Icone";

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const form = new FormData(e.target);
    const email = form.get("identificador")?.trim();
    const senha = form.get("senha")?.trim();

    if (!email || !senha) {
      setErro("Preencha todos os campos.");
      setCarregando(false);
      return;
    }

    try {
      await login(email, senha);
      navigate("/inicio");
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao fazer login.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex items-center justify-center px-4 py-8">
      <main className="relative w-full max-w-4xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Coluna esquerda — Narrativa da marca */}
        <div className="lg:col-span-7 hidden lg:flex flex-col space-y-6">
          <div className="space-y-2">
            <span className="text-secondary font-headline tracking-[0.2em] text-xs uppercase font-bold">
              {t("login.welcome")}
            </span>
            <h1 className="text-5xl font-headline font-extrabold tracking-tight text-on-surface leading-tight">
              {t("login.tagline")}
              <br />
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent italic">
                {t("login.tagline2")}
              </span>
            </h1>
          </div>
          <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
            {t("login.description")}
          </p>
          <div className="flex items-center gap-5 pt-2">
            <div className="flex -space-x-3">
              <div className="w-11 h-11 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center">
                <Icone name="person" className="text-primary text-xl" />
              </div>
              <div className="w-11 h-11 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center">
                <Icone name="person" className="text-secondary text-xl" />
              </div>
              <div className="w-11 h-11 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary">
                +500
              </div>
            </div>
            <p className="text-sm text-on-surface-variant/80">
              {t("login.community")}
            </p>
          </div>
        </div>

        {/* Coluna direita — Card de login */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="glass-panel w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[60px] pointer-events-none transition-all duration-700 group-hover:bg-primary/30" />

            <div className="relative z-10">
              <div className="mb-8 flex flex-col items-center lg:items-start">
                <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                  <Icone name="fluid" className="text-primary text-2xl" />
                </div>
                <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
                  {t("login.title")}
                </h2>
                <p className="text-on-surface-variant text-sm">
                  {t("login.subtitle")}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <Campo
                  id="identificador"
                  name="identificador"
                  label={t("field.identifier.label")}
                  placeholder={t("field.identifier.placeholder")}
                  icon="person"
                />

                {/* Campo senha com link "esqueceu?" */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label
                      htmlFor="senha"
                      className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                    >
                      {t("field.password.label")}
                    </label>
                    <Link
                      to="/esqueceu-senha"
                      className="text-[11px] font-bold text-secondary hover:underline"
                    >
                      {t("login.forgot")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Icone
                      name="lock"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
                    />
                    <input
                      id="senha"
                      name="senha"
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
                    />
                  </div>
                </div>

                {erro && (
                  <p className="text-error text-sm font-medium">{erro}</p>
                )}

                <div className="pt-2">
                  <Botao type="submit" disabled={carregando}>
                    {carregando ? "Entrando..." : t("login.submit")}
                    {!carregando && <Icone name="arrow_forward" className="text-xl" />}
                  </Botao>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
                <p className="text-sm text-on-surface-variant">
                  {t("login.noAccount")}{" "}
                  <Link
                    to="/solicitar-acesso"
                    className="text-primary font-bold hover:text-tertiary transition-colors"
                  >
                    {t("login.requestAccess")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="fixed bottom-6 w-full px-8 flex justify-between items-center text-[10px] text-on-surface-variant/40 font-medium tracking-widest uppercase pointer-events-none">
        <div className="flex items-center gap-4">
          <span>{t("footer.privacy")}</span>
          <span>{t("footer.terms")}</span>
        </div>
      </footer>
    </div>
  );
}
