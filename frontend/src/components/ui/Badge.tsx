import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "info" | "purple" | "cyan";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "default",
  children,
  ...props
}) => {
  const baseClass = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none backdrop-blur-md transition-all duration-300";
  
  const variants = {
    default: "border-primary/20 bg-primary/10 text-primary shadow-[0_0_10px_rgba(168,85,247,0.1)]",
    secondary: "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300",
    outline: "text-foreground border-border/40 bg-transparent",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    danger: "border-rose-500/25 bg-rose-500/10 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
    info: "border-sky-500/25 bg-sky-500/10 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.1)]",
    purple: "border-[#A855F7]/25 bg-[#A855F7]/10 text-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.1)]",
    cyan: "border-[#06B6D4]/25 bg-[#06B6D4]/10 text-[#22D3EE] shadow-[0_0_10px_rgba(6,182,212,0.1)]",
  };

  const finalClassName = `${baseClass} ${variants[variant]} ${className}`;

  return (
    <div className={finalClassName} {...props}>
      {children}
    </div>
  );
};

export default Badge;
