/** Graduated ruler divider (M-B motif) — major section breaks only, ~once per screen. */
export interface TickRuleProps {
  /** Vertical orientation; stretch via align-self in a flex row */
  vertical?: boolean;
  /** 50% opacity secondary voice */
  dim?: boolean;
  style?: object;
}
export declare function TickRule(props: TickRuleProps): JSX.Element;
