/** Site footer: tick rule, dim micro line, motto in accent label type. */
export interface SiteFooterProps {
  /** Micro line, default "RTFX Design LLC · rtfx.space" */
  note?: string;
  /** Accent motto line; empty string hides it. Default "Manu et machina" */
  motto?: string;
  style?: object;
}
export declare function SiteFooter(props: SiteFooterProps): JSX.Element;
