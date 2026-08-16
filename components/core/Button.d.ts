/**
 * Chamfered uppercase-mono action. Amber outline by default; 'fill' is the one primary CTA per viewport.
 * @startingPoint section="Components" subtitle="Outline / fill / ghost chamfered button" viewport="700x180"
 */
export interface ButtonProps {
  /** 'outline' (default) · 'fill' primary CTA · 'ghost' tertiary */
  variant?: 'outline' | 'fill' | 'ghost';
  /** Append the → arrow glyph */
  arrow?: boolean;
  disabled?: boolean;
  /** Renders an anchor when set */
  href?: string;
  onClick?: (e: unknown) => void;
  style?: object;
  children?: unknown;
}
export declare function Button(props: ButtonProps): JSX.Element;
