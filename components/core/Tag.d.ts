/** Chamfered uppercase-mono chip for tech/spec labels (LED, DMX, Show control). */
export interface TagProps {
  /** Amber outline voice — for the one featured tag */
  accent?: boolean;
  style?: object;
  children?: unknown;
}
export declare function Tag(props: TagProps): JSX.Element;
