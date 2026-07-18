import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "cyan";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    
    // Base styles
    let baseClass = "inline-flex items-center justify-center rounded-xl font-semibold text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.97]";

    // Variant mapping
    const variants = {
      default: "bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white hover:opacity-95 shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-[#A855F7]/30",
      destructive: "bg-gradient-to-r from-red-600 to-[#F43F5E] text-white hover:opacity-95 shadow-[0_0_20px_rgba(239,68,68,0.35)] border border-red-500/20",
      cyan: "bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-[#06B6D4]/30",
      outline: "border border-primary/30 bg-primary/5 text-slate-100 hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]",
      secondary: "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
      ghost: "hover:bg-white/5 hover:text-slate-100 text-muted-foreground bg-transparent",
      link: "text-primary underline-offset-4 hover:underline bg-transparent"
    };

    // Size mapping
    const sizes = {
      default: "h-10 px-5 py-2.5",
      sm: "h-8 rounded-lg px-3.5 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9 rounded-lg"
    };

    const finalClassName = `${baseClass} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        className={finalClassName}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
