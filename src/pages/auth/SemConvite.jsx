import { Link, useSearchParams } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { AtivacaoContaForm } from "../../components/auth/AtivacaoContaForm";

export function SemConvite() {
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
                Acesso somente por convite
              </h1>
              <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
                {origemGoogle
                  ? "Seu e-mail do Google ainda não está cadastrado no Mora. Para entrar, você precisa de um convite enviado pelo síndico ou administrador do condomínio."
                  : "O Mora funciona com convites. Peça ao síndico ou administrador do seu condomínio para enviar um convite ao seu e-mail."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-highest/40 border border-outline-variant/15 p-4 mb-6 space-y-3">
            <p className="text-on-surface text-sm font-semibold">Como funciona</p>
            <ol className="text-on-surface-variant text-sm space-y-2 list-decimal list-inside">
              <li>O administrador cria um convite para o seu e-mail</li>
              <li>Você recebe o código por e-mail (ou diretamente com o responsável)</li>
              <li>Informe o código abaixo e conclua seu cadastro</li>
            </ol>
          </div>

          <AtivacaoContaForm
            tituloPasso1="Ativar com código de convite"
            subtituloPasso1="Digite o código que você recebeu para continuar."
            subtituloPasso2="Preencha seus dados para concluir o cadastro."
          />
        </div>

        <p className="text-center text-sm text-on-surface-variant">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
