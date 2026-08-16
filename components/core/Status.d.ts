/** Square-dot status readout: live (hot orange), ok (soft amber), idle (dim). */
export interface StatusProps {
  /** 'live' — running/hot · 'ok' — good/available · 'idle' — dim */
  state?: 'live' | 'ok' | 'idle';
  style?: object;
  /** The label text, e.g. "Live", "Running" */
  children?: unknown;
}
export declare function Status(props: StatusProps): JSX.Element;
