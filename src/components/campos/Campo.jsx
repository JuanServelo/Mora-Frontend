// src/components/campos/Campo.jsx
import { Icone } from "../icones/Icone";

export function Campo({
  id,
  label,
  type = "text",
  placeholder,
  icon,
  error,
  optional,
  className = "",
  required,
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
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {optional && (
            <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">
              {" "}(opcional)
            </span>
          )}
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
          required={required}
          aria-required={required ? "true" : undefined}
          placeholder={placeholder}
          className={`w-full bg-surface-container-highest/40 border-none rounded-xl py-4 ${icon ? "pl-12" : "pl-4"} pr-4 text-on-surface placeholder:text-outline-variant focus:outline-none backdrop-blur-sm transition-all ${error ? "ring-2 ring-error/60" : "focus:ring-2 focus:ring-primary/50"} ${className}`}
          {...rest}
        />
      </div>
      {error && (
        <p className="text-xs text-error ml-1">{error}</p>
      )}
    </div>
  );
}
