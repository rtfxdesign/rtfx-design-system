/** Bordered chamfered container (M-A): 1px rule shell, panel fill, TL+BR corner cuts. */
export interface PanelProps {
  /** Inner contour (M-C): 'static' amber = featured · 'hover' white on hover/focus · 'none' */
  inline?: 'none' | 'hover' | 'static';
  /** 7px cut instead of 12px */
  small?: boolean;
  /** Inner padding, default var(--s-5) */
  padding?: string;
  style?: object;
  innerStyle?: object;
  children?: unknown;
}
export declare function Panel(props: PanelProps): JSX.Element;
