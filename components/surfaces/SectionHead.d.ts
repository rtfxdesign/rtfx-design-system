/** Numbered section header: amber index ("01"), Martian Mono title, dim note capped at 66ch. */
export interface SectionHeadProps {
  /** Zero-padded index, e.g. "01" */
  num: string;
  title: string;
  note?: string;
  style?: object;
}
export declare function SectionHead(props: SectionHeadProps): JSX.Element;
