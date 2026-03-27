"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// ── Context ───────────────────────────────────────────────────────────────

type TabCtx = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabCtx | null>(null);

function useTabs(): TabCtx {
  const c = React.useContext(TabsContext);
  if (!c) throw new Error("Tab components must be used inside TabGroup");
  return c;
}

// ── TabGroup ──────────────────────────────────────────────────────────────

type TabGroupProps<TTag extends React.ElementType = "div"> =
  React.ComponentPropsWithoutRef<TTag> & {
    as?: TTag;
    defaultValue?: string;
    value?: string;
    onValueChange?: (v: string) => void;
    children?: React.ReactNode;
  };

function TabGroup({
  className,
  defaultValue = "",
  value: valueProp,
  onValueChange,
  children,
  ...rest
}: TabGroupProps<"div">) {
  const [inner, setInner] = React.useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : inner;

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setInner(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("flex flex-col gap-2", className)} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ── TabList ─────────────────────────────────────────────────────────────────

type TabListProps<TTag extends React.ElementType = "div"> =
  React.ComponentPropsWithoutRef<TTag> & {
    as?: TTag;
    children?: React.ReactNode;
  };

function TabList({ className, children, ...rest }: TabListProps<"div">) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────────────

type TabProps<TTag extends React.ElementType = "button"> =
  React.ComponentPropsWithoutRef<TTag> & {
    as?: TTag;
    value: string;
    children?: React.ReactNode;
  };

function Tab({
  className,
  value,
  children,
  type = "button",
  ...rest
}: TabProps<"button">) {
  const { value: selected, setValue } = useTabs();
  const active = selected === value;

  return (
    <button
      type={type}
      role="tab"
      id={`tab-${value}`}
      aria-selected={active}
      aria-controls={`panel-${value}`}
      tabIndex={active ? 0 : -1}
      data-active={active ? "true" : "false"}
      className={cn(
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-in-out",
        "text-muted-foreground data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={() => setValue(value)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── TabPanels ───────────────────────────────────────────────────────────────

type TabPanelsProps<TTag extends React.ElementType = typeof motion.div> =
  React.ComponentPropsWithoutRef<TTag> & {
    as?: TTag;
    children?: React.ReactNode;
  };

function TabPanels({
  className,
  children,
  as: Comp = motion.div,
  ...rest
}: TabPanelsProps<typeof motion.div>) {
  return (
    <Comp className={cn("flex-1 outline-none", className)} {...rest}>
      {children}
    </Comp>
  );
}

// ── TabPanel ────────────────────────────────────────────────────────────────

type TabPanelProps<TTag extends React.ElementType = typeof motion.div> =
  React.ComponentPropsWithoutRef<TTag> & {
    as?: TTag;
    value: string;
    children?: React.ReactNode;
  };

function TabPanel({
  className,
  value,
  children,
  as: Comp = motion.div,
  ...rest
}: TabPanelProps<typeof motion.div>) {
  const { value: selected } = useTabs();
  const visible = selected === value;

  if (!visible) return null;

  return (
    <Comp
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn("flex-1 outline-none", className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  type TabGroupProps,
  type TabListProps,
  type TabProps,
  type TabPanelsProps,
  type TabPanelProps,
};
