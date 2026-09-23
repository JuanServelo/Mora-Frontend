import { Link } from "react-router-dom";
import { AtivacaoContaForm } from "../../components/auth/AtivacaoContaForm";

export function AtivarConta() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
        <div className="mb-2">
          <h1 className="text-2xl font-headline font-bold text-on-surface">Ativar conta</h1>
        </div>

        <AtivacaoContaForm
          tituloPasso1="Código de convite"
          subtituloPasso1="Informe o código recebido por e-mail."
          subtituloPasso2="Preencha seus dados para concluir o cadastro."
        />

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
