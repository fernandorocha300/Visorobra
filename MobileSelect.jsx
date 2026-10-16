import React, { createContext, useContext, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

const Ctx = createContext(null);

// Walk the content children and collect { value, label } for every MobileSelectItem.
function collectItems(children, out = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === MobileSelectItem) {
      out.push({
        value: child.props.value,
        label: child.props.children,
        className: child.props.className,
      });
    } else if (child.props?.children) {
      collectItems(child.props.children, out);
    }
  });
  return out;
}

// Same composition API as the Radix Select:
// <MobileSelect value onValueChange><MobileSelectTrigger><MobileSelectValue/></MobileSelectTrigger><MobileSelectContent><MobileSelectItem/></MobileSelectContent></MobileSelect>
export function MobileSelect({ value, onValueChange, title, children, ...rest }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...rest}>
        {children}
      </Select>
    );
  }

  // Find the content element to build the options list for the sheet
  let items = [];
  let contentClass = "";
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === MobileSelectContent) {
      items = collectItems(child.props.children);
      contentClass = child.props.className || "";
    }
  });

  const selected = items.find((i) => i.value === value);

  return (
    <Ctx.Provider
      value={{ value, selected, open, setOpen, items, onValueChange, title, contentClass }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function MobileSelectTrigger({ className, children, ...props }) {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return (
      <SelectTrigger className={className} {...props}>
        {children}
      </SelectTrigger>
    );
  }
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(true)}
      className={cn(
        "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        className
      )}
      {...props}
    >
      <span className="flex items-center min-w-0 flex-1 text-left">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );
}

export function MobileSelectValue({ placeholder, ...props }) {
  const ctx = useContext(Ctx);
  if (!ctx) return <SelectValue placeholder={placeholder} {...props} />;
  return ctx.selected ? (
    <span className="truncate">{ctx.selected.label}</span>
  ) : (
    <span className="text-muted-foreground truncate">{placeholder}</span>
  );
}

export function MobileSelectContent({ className, children, ...props }) {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return (
      <SelectContent className={className} {...props}>
        {children}
      </SelectContent>
    );
  }
  // Mobile: render the options as a bottom sheet
  return (
    <Drawer open={ctx.open} onOpenChange={ctx.setOpen}>
      <DrawerContent className="bg-card border-border max-h-[75vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display text-base">
            {ctx.title || "Selecionar"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Escolha uma opção
          </DrawerDescription>
        </DrawerHeader>
        <div
          className="overflow-y-auto px-2 pb-4 safe-bottom"
          style={{ overscrollBehavior: "contain" }}
        >
          {ctx.items.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nenhuma opção disponível
            </p>
          )}
          {ctx.items.map((item) => {
            const active = item.value === ctx.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  ctx.onValueChange?.(item.value);
                  ctx.setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 min-h-[48px] text-left text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-surface"
                )}
              >
                <span className="truncate">{item.label}</span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function MobileSelectItem({ value, className, children, ...props }) {
  const ctx = useContext(Ctx);
  // On mobile, items are rendered by MobileSelectContent from collected props.
  if (ctx) return null;
  return (
    <SelectItem value={value} className={className} {...props}>
      {children}
    </SelectItem>
  );
}