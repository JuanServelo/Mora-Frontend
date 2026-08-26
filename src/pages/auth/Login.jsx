// src/pages/auth/Login.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { Icone } from "../../components/icones/Icone";

const ERROS_OAUTH = {
  oauth: "Não foi possível entrar com Google.",
  oauth_nao_configurado:
    "Login com Google ainda não está configurado. Use e-mail e senha ou peça ao administrador.",
  conta_nao_encontrada:
    "Nenhuma conta Mora encontrada para este e-mail. Ative sua conta via convite antes de usar o Google.",
  conta_desativada: "Esta conta foi desativada.",
  cadastro_pendente:
    "Seu cadastro ainda não foi concluído. Acesse o link enviado para seu e-mail para criar sua senha.",
};

export function Login() {
  const { t } = useTranslation();
  const { login, loginComGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [googleDisponivel, setGoogleDisponivel] = useState(false);

  useEffect(() => {
    const erroParam = searchParams.get("erro");
    if (erroParam === "conta_nao_encontrada") {
      navigate("/sem-convite?origem=google", { replace: true });
      return;
    }
    if (erroParam && ERROS_OAUTH[erroParam]) {
      setErro(ERROS_OAUTH[erroParam]);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    api.get("/api/auth/google/disponivel")
      .then((res) => setGoogleDisponivel(!!res.data?.disponivel))
      .catch(() => setGoogleDisponivel(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const form = new FormData(e.target);
    const email = form.get("email")?.trim();
    const senha = form.get("senha")?.trim();

    if (!email || !senha) {
      setErro("Preencha todos os campos.");
      setCarregando(false);
      return;
    }

    try {
      const res = await login(email, senha);
      navigate(res.redirectPath || "/inicio");
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-surface leading-tight">
              {t("login.tagline")}
              <br />
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent italic">
                {t("login.tagline2")}
              </span>
            </h1>
          </div>
          <p className="text-on-surface-variant text-base lg:text-lg max-w-md leading-relaxed">
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
          <div className="glass-panel w-full max-w-sm rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
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
                  id="email"
                  name="email"
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  icon="mail"
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

              {googleDisponivel && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-outline-variant/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-surface px-3 text-on-surface-variant">ou</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={loginComGoogle}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-full border border-outline-variant/30 bg-surface-container-highest/40 text-on-surface font-semibold text-sm hover:bg-surface-container-highest/60 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Entrar com Google
                  </button>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
                <p className="text-sm text-on-surface-variant">
                  {t("login.noAccount")}{" "}
                  <Link
                    to="/sem-convite"
                    className="text-primary font-bold hover:text-tertiary transition-colors"
                  >
                    Ativar conta
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="hidden sm:flex fixed bottom-6 w-full px-8 justify-between items-center text-[10px] text-on-surface-variant/40 font-medium tracking-widest uppercase pointer-events-none">
        <div className="flex items-center gap-4">
          <span>{t("footer.privacy")}</span>
          <span>{t("footer.terms")}</span>
        </div>
      </footer>
    </div>
  );
}
