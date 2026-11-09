import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "../../lib/utils";
export const Tabs = Primitive.Root;
type Variant = "default" | "line" | "button";
const VariantContext = React.createContext<Variant>("default");
export function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Primitive.List> & { variant?: Variant }) {
  return (
    <VariantContext.Provider value={variant}>
      <Primitive.List
        className={cn(
          "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-muted p-0.5 [scrollbar-width:none]",
          variant === "line" &&
            "flex w-full gap-5 rounded-none border-b border-border bg-transparent p-0",
          className,
        )}
        {...props}
      />
    </VariantContext.Provider>
  );
}
export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  const variant = React.useContext(VariantContext);
  return (
    <Primitive.Trigger
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 [&_svg]:size-4",
        variant === "line"
          ? "-mb-px h-10 border-b-2 border-transparent px-0.5 data-[state=active]:border-brand-500 data-[state=active]:text-foreground"
          : "h-8 rounded-[6px] px-3 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={cn("mt-5 min-w-0 outline-none", className)}
      {...props}
    />
  );
}
