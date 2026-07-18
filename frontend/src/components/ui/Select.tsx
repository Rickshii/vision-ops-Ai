import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={`block w-full h-10 pl-4 pr-10 py-2 text-sm rounded-xl border border-border/40 bg-white/5 dark:bg-black/20 text-slate-100 placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)] disabled:cursor-not-allowed disabled:opacity-40 appearance-none transition-all duration-300 ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";
export default Select;
