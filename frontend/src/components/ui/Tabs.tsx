import * as React from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: propValue,
  onValueChange,
  children,
  className = "",
  ...props
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);
  
  const value = propValue !== undefined ? propValue : activeTab;
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (propValue === undefined) setActiveTab(newValue);
      if (onValueChange) onValueChange(newValue);
    },
    [propValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    className={`inline-flex items-center justify-center rounded-2xl glassmorphism border border-slate-200 dark:border-white/10 p-1 text-muted-foreground gap-1 ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className = "",
  children,
  ...props
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = context.value === value;

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none ${
        isActive
          ? "bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]"
          : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5"
      } ${className}`}
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className = "",
  children,
  ...props
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  if (context.value !== value) return null;

  return (
    <div
      className={`mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in-up ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
