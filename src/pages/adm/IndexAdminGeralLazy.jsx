import { lazy, Suspense } from "react";

// Recharts pesa ~420 KB. Carregar sob demanda evita que morador e porteiro
// baixem a biblioteca de gráficos só para abrir a própria tela inicial.
const IndexAdminGeral = lazy(() =>
  import("./IndexAdminGeral").then((m) => ({ default: m.IndexAdminGeral })),
);

export function IndexAdminGeralLazy() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
          Carregando...
        </div>
      }
    >
      <IndexAdminGeral />
    </Suspense>
  );
}

export default IndexAdminGeralLazy;
