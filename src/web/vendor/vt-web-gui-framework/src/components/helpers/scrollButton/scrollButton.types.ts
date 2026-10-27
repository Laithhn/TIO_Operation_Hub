import type { ColorKeys } from 'assets/styles';


export type ScrollButtonDir = 'up' | 'down' | 'left' | 'right';
export type ScrollButtonPos = 'start' | 'center' | 'end';


/** The props of the React component of the helper component "ScrollButton". */
export interface ScrollButtonProps {
  /** This prop determines the scroll direction and thus the position of the scroll button: "up"
   * places the button at the top of the container for scrolling up. The other values behave
   * accordingly. */
  readonly dir: ScrollButtonDir;
  /** For the respective scroll direction (see prop "dir"), the scroll button can be aligned with
   * this prop on the container. If the direction is "up", for example, the button is placed at the
   * top side of the container. With this prop, it can now be positioned at the beginning inside
   * ("start") or half outside ("startHalfOut"), in the middle ("center") or at the end inside
   * ("end") or half outside ("endHalfOut") of the top side. Default value: "start". */
  readonly pos?: ScrollButtonPos;
  /** This prop must be set to true for the scroll button to be faded in dynamically. */
  readonly show?: boolean;
  /** Optionally, this prop can be used to smoothly fade out the background at the corresponding
   * side of the container (see prop "dir"). The color set under backgroundColor is used for this
   * purpose, too. */
  readonly showShader?: boolean;
  /** This prop can be used to customize the wshader color of the button. As a rule, this should
   * be the background color of the container underneath or a little it darker. */
  readonly shaderColor?: ColorKeys | (string & {});
  /** If this prop is set to true, the button can be held down, causing the prop "onClick" to be
   * called at 150 ms intervals. */
  readonly holdable?: boolean;
  /** Setting this prop to true marks the scroll button as inactive and makes it unclickable. */
  readonly disable?: boolean;
  /** A callback function that is called when the scroll button is clicked. */
  readonly onClick: ({ dir }: { dir: ScrollButtonDir }) => void;
}
