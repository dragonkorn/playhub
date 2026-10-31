import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-signal text-ground disabled:bg-panel disabled:text-muted",
  secondary: "border-2 border-line bg-panel disabled:text-muted",
  danger: "bg-hit text-ground",
  dangerOutline: "border-2 border-hit bg-panel text-hit",
  outline: "border-2 border-current",
  quiet: "text-muted",
};

const SIZES = {
  sm: "h-11 rounded-lg px-3 text-base",
  md: "h-16 rounded-xl px-4 text-xl",
  lg: "h-18 rounded-2xl px-4 text-xl",
  xl: "h-20 rounded-2xl px-4 text-2xl",
  xxl: "h-24 rounded-2xl px-4 text-3xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export function Button({ variant = "primary", size = "xl", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`flex items-center justify-center font-bold ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props} />;
}
