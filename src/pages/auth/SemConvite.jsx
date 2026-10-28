import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icone } from "../../components/icones/Icone";
import { AtivacaoContaForm } from "../../components/auth/AtivacaoContaForm";

export function SemConvite() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const origemGoogle = searchParams.get("origem") === "google";

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="glass-panel rounded-[2rem] p-8 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <Icone name="mail" className="text-secondary text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-on-surface">
                {t("semConvite.titulo")}
              </h1>
              <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
                {origemGoogle
                  ? t("semConvite.textoGoogle")
                  : t("semConvite.texto")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-highest/40 border border-outline-variant/15 p-4 mb-6 space-y-3">
            <p className="text-on-surface text-sm font-semibold">{t("semConvite.comoFunciona")}</p>
            <ol className="text-on-surface-variant text-sm space-y-2 list-decimal list-inside">
              <li>{t("semConvite.passos.convite")}</li>
              <li>{t("semConvite.passos.codigo")}</li>
              <li>{t("semConvite.passos.concluir")}</li>
            </ol>
          </div>

          <AtivacaoContaForm
            tituloPasso1={t("semConvite.passo1Titulo")}
            subtituloPasso1={t("semConvite.passo1Subtitulo")}
            subtituloPasso2={t("geral.subtituloConcluir")}
          />
        </div>

        <p className="text-center text-sm text-on-surface-variant">
          {t("geral.jaTemConta")}{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            {t("geral.entrar")}
          </Link>
        </p>
      </div>
    </div>
  );
}
