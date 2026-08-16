/**
 * Portfolio/project card: chamfered, hatched 16:10 thumb, index + status overlay, tags, amber CTA. Border turns amber on hover.
 * @startingPoint section="Components" subtitle="Chamfered project card with thumb, tags, status" viewport="700x360"
 */
export interface WorkCardProps {
  /** Index overlay, e.g. "004" */
  idx?: string;
  title: string;
  desc?: string;
  /** Strings or { label, accent } */
  tags?: Array<string | { label: string; accent?: boolean }>;
  /** Status overlay on the thumb */
  status?: 'live' | 'ok' | 'idle';
  statusLabel?: string;
  /** CTA text, default "View build" */
  cta?: string;
  href?: string;
  onClick?: (e: unknown) => void;
  /** Node filling the thumb (e.g. <img>); hatch placeholder when omitted */
  thumb?: unknown;
  style?: object;
}
export declare function WorkCard(props: WorkCardProps): JSX.Element;
