import { useId } from "react";
import { Campo } from "../campos/Campo";

export function MeetingFilters({ nome, data, onNomeChange, onDataChange }) {
  const id = useId();
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1">
        <Campo id={`${id}-nome`} label="Nome da reunião" type="search" icon="search"
          placeholder="Digite o nome da reunião..." value={nome} onChange={(e) => onNomeChange(e.target.value)} />
      </div>
      <Campo id={`${id}-data`} label="Data (opcional)" type="date" value={data} onChange={(e) => onDataChange(e.target.value)} />
      {(nome || data) && (
        <button type="button" onClick={() => { onNomeChange(""); onDataChange(""); }}
          className="px-4 py-3 text-sm font-semibold text-primary rounded-xl hover:bg-primary/10 cursor-pointer">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
