/** Sticky site header: black @92% + 14px blur, hairline bottom rule. Wordmark image (~120px) or text mark; no display type shares this band. */
export interface TopbarProps {
  /** Text mark when no logoSrc, default "RTFX" */
  mark?: string;
  /** Dim suffix after the mark, e.g. "/BRAND KIT" */
  suffix?: string;
  /** Path to wordmark SVG — replaces the text mark */
  logoSrc?: string;
  links?: Array<{ label: string; href?: string; active?: boolean; onClick?: (e: unknown) => void }>;
  /** Right-aligned slot (Status, swatch label…) */
  right?: unknown;
  style?: object;
}
export declare function Topbar(props: TopbarProps): JSX.Element;
