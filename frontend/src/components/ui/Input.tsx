import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-xl border border-border/40 bg-slate-100 dark:bg-white/5 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-[0_0_15px_rgba(168,85,247,0.15)] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-300 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
export default Input;
