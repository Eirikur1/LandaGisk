declare module "react-simple-maps" {
  import type { ReactNode } from "react";

  export const ComposableMap: (props: Record<string, unknown>) => ReactNode;
  export const Geographies: (props: Record<string, unknown>) => ReactNode;
  export const Geography: (props: Record<string, unknown>) => ReactNode;
  export const ZoomableGroup: (props: Record<string, unknown>) => ReactNode;
}
