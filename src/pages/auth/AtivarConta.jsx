import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AtivacaoContaForm } from "../../components/auth/AtivacaoContaForm";

export function AtivarConta() {
  const { t } = useTranslation("auth");
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
        <div className="mb-2">
          <h1 className="text-2xl font-headline font-bold text-on-surface">{t("ativarConta.titulo")}</h1>
        </div>

        <AtivacaoContaForm
          tituloPasso1={t("ativacao.campos.codigo")}
          subtituloPasso1={t("ativarConta.passo1Subtitulo")}
          subtituloPasso2={t("geral.subtituloConcluir")}
        />

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {t("geral.jaTemConta")}{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            {t("geral.entrar")}
          </Link>
        </p>
      </div>
    </div>
  );
}
