/** Case-study spec grid: key/value cells (Client, Venue, Date, Role, Duration, Status) with 1px gap lines. */
export interface SpecHeaderProps {
  /** Cells in order; live:true renders hot-orange with ● */
  items: Array<{ k: string; v: string; live?: boolean }>;
  style?: object;
}
export declare function SpecHeader(props: SpecHeaderProps): JSX.Element;
