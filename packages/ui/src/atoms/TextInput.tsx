import type { InputHTMLAttributes } from "react";

const VARIANTS = {
  field: "h-18 border-2 border-line text-2xl font-normal focus:border-signal",
  code: "h-28 border-3 border-signal text-center font-display text-7xl font-bold tracking-[0.25em]",
};

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof VARIANTS;
}

export function TextInput({ variant = "field", ...props }: TextInputProps) {
  return <input autoComplete="off" className={`w-full rounded-2xl bg-panel px-5 text-text outline-none ${VARIANTS[variant]}`} {...props} />;
}
