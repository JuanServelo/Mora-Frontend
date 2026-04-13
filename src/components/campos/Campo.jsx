// src/components/campos/Campo.jsx
import { Icone } from "../icones/Icone";

export function Campo({
  id,
  label,
  type = "text",
  placeholder,
  icon,
  className = "",
  ...rest
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <Icone
            name={icon}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
          />
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className={`w-full bg-surface-container-highest/40 border-none rounded-xl py-4 ${icon ? "pl-12" : "pl-4"} pr-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all ${className}`}
          {...rest}
        />
      </div>
    </div>
  );
}
