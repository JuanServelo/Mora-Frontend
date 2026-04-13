// src/components/icones/Icone/index.jsx

export function Icone({ name, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}
