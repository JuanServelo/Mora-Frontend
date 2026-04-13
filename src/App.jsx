// src/App.jsx
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

export default function App() {
  return (
    <div className="bg-surface bg-mesh text-on-surface font-body min-h-screen overflow-x-clip selection:bg-primary/30">
      {/* Blobs de fundo — fixos em todas as páginas */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>
      <RouterProvider router={router} />
    </div>
  );
}
