// src/components/botoes/Botao.jsx

export function Botao({ type = "button", children, onClick, disabled, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-headline font-bold py-4 rounded-full shadow-[0_0_20px_rgba(159,207,212,0.2)] hover:shadow-[0_0_30px_rgba(159,207,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
