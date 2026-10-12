import * as React from "react";

const fieldClass = "w-full rounded-md border px-3 py-2 text-sm";
const fieldStyle: React.CSSProperties = {
  borderColor: "var(--border)",
  background: "var(--card)",
  color: "var(--foreground)",
};

export function Button({
  className = "",
  variant = "primary",
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--primary)", color: "var(--primary-foreground)" }
      : { background: "transparent", color: "var(--foreground)", border: "1px solid var(--border)" };
  return <button className={`${base} ${className}`} style={{ ...variantStyle, ...style }} {...props} />;
}

export function Input({ className = "", style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} style={{ ...fieldStyle, ...style }} {...props} />;
}

export function Textarea({
  className = "",
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} ${className}`} style={{ ...fieldStyle, ...style }} {...props} />;
}

export function Select({
  className = "",
  style,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} ${className}`} style={{ ...fieldStyle, ...style }} {...props}>
      {children}
    </select>
  );
}

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1 block text-sm font-medium ${className}`} {...props} />;
}
