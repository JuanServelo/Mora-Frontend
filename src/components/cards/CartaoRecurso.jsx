// src/components/cards/CartaoRecurso.jsx
import { Icone } from "../icones/Icone";

export function CartaoRecurso({ icon, iconColor, title, description }) {
  return (
    <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
      <Icone name={icon} className={`${iconColor} mb-3 text-3xl`} />
      <h3 className="font-headline font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant">{description}</p>
    </div>
  );
}
