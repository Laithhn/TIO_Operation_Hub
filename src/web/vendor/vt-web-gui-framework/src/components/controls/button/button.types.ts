import type { Color } from 'assets/styles';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const buttonStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type ButtonStylingProps = Pick<StylingPropCollection, (typeof buttonStylingProps)[number]>;


export interface ButtonHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  focus: () => void;
  blur: () => void;
}


/** Enumeration for button status. */
export enum ButtonStatus {
  /** Button is idle and can be clicked. */
  IDLE = 'IDLE',
  /** Button is busy (can't be clicked). */
  BUSY = 'BUSY',
  /** Button is active (can't be clicked). */
  ACTIVE = 'ACTIVE',
  /** Button is disabled (can't be clicked). */
  DISABLED = 'DISABLED',
}


/** The props of the React component of the control component "Button" */
export interface ButtonProps extends ButtonStylingProps {
  /** The React reference of an imperative handle of the button component. */
  readonly ref?: React.Ref<ButtonHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the button, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop defines the basic appearance of the button: a filled pane lying on the background
   * ("filled", default setting), the same pane thinned down to a tint for a button of lesser weight
   * ("tinted"), no surface at all for a button that sits inside a line and takes its form only on
   * hover and focus ("bare"), or an overlaid button ("overlaid") that floats clearly above the
   * background level. Such a button is positioned absolutely as soon as one of the props "left",
   * "right", "top" and "bottom" (see below) carries a number; without any of them it is placed like
   * every other button, by the grid or the line it sits in. */
  readonly type?: 'filled' | 'tinted' | 'bare' | 'overlaid';
  /** This prop is only relevant for overlaid buttons. It positions such a button absolutely in a
   * parent container: as soon as one of the four props "left", "right", "top" and "bottom" carries
   * a number, the button leaves the flow, and an axis whose two props are both empty falls back to
   * its start edge. Note that prop "left" has priority over "right". The parent container to which
   * an overlaid button is to be aligned must be positioned relatively or absolutely. At the most
   * layout components this can be achieved using the styling prop "relativePosition". If the
   * overlaid button is not located in such a container, it will be aligned to the viewport. */
  readonly left?: number | null;
  /** This prop is only relevant for overlaid buttons. It positions such a button absolutely in a
   * parent container: as soon as one of the four props "left", "right", "top" and "bottom" carries
   * a number, the button leaves the flow, and an axis whose two props are both empty falls back to
   * its start edge. Note that prop "left" has priority over "right". The parent container to which
   * an overlaid button is to be aligned must be positioned relatively or absolutely. At the most
   * layout components this can be achieved using the styling prop "relativePosition". If the
   * overlaid button is not located in such a container, it will be aligned to the viewport. */
  readonly right?: number | null;
  /** This prop is only relevant for overlaid buttons. It positions such a button absolutely in a
   * parent container: as soon as one of the four props "left", "right", "top" and "bottom" carries
   * a number, the button leaves the flow, and an axis whose two props are both empty falls back to
   * its start edge. Note that prop "top" has priority over "bottom". The parent container to which
   * an overlaid button is to be aligned must be positioned relatively or absolutely. At the most
   * layout components this can be achieved using the styling prop "relativePosition". If the
   * overlaid button is not located in such a container, it will be aligned to the viewport. */
  readonly top?: number | null;
  /** This prop is only relevant for overlaid buttons. It positions such a button absolutely in a
   * parent container: as soon as one of the four props "left", "right", "top" and "bottom" carries
   * a number, the button leaves the flow, and an axis whose two props are both empty falls back to
   * its start edge. Note that prop "top" has priority over "bottom". The parent container to which
   * an overlaid button is to be aligned must be positioned relatively or absolutely. At the most
   * layout components this can be achieved using the styling prop "relativePosition". If the
   * overlaid button is not located in such a container, it will be aligned to the viewport. */
  readonly bottom?: number | null;
  /** Buttons can be displayed larger by setting this prop to true. */
  readonly large?: boolean;
  /** This prop states that the button ends without an edge of its own on one side ("start" or
   * "end") or on both ("both"), and what that means depends on the type: a bare button pulls its
   * inner spacing back with a negative margin, so its lettering lines up with whatever sits above
   * or below it instead of appearing indented. A filled or tinted button gives up its rounded
   * corners on that side and its border along it, which is what lets several of them be strung
   * together into one control - two buttons for "back" and "forward", for example. The seam between
   * two of them is then no drawn line but the contact shadow they cast into it. On an overlaid
   * button the prop has no effect. */
  readonly flush?: 'start' | 'end' | 'both';
  /** This prop can be used to change the status of the button. By default, all buttons are in the
   * normal idle status (ButtonStatus.IDLE). The buttons can be disabled using this prop
   * (ButtonStatus.DISABLED), which means they cannot be clicked. They can also assume the status
   * "Busy" (ButtonStatus.BUSY), while the button waits for something it has started, and "Active"
   * (ButtonStatus.ACTIVE), while something has been switched on by it. Neither busy nor active
   * buttons can be clicked. Both of these two statuses work on the filled button only: the tinted,
   * bare and overlaid forms are simple buttons, and setting one of the two on them does nothing at
   * all - such a button stays idle. */
  readonly status?: ButtonStatus;
  /** If this prop is set to true, the button can be held down. See also the description of the
   * callback props "onHoldStart" and "onHoldEnd". */
  readonly holdable?: boolean;
  /** This prop is used to highlight the button. All buttons can be displayed in blue
   * ("attention") and orange ("attentionHigh") accent colors, as well as in the signal colors green
   * ("signalOk"), yellow ("signalWarning") and red ("signalError"): the filled and the overlaid
   * button carry such a color as their background, the tinted and the bare one in their lettering
   * and their icon, which is all the surface they have. Filled and overlaid buttons can also appear
   * in a strong color ("solid").
   * Note that every value but "solid" states something about the button or about what it does, and
   * such a statement belongs either to the surface the button sits on or to the button itself,
   * never to both: a tile whose background says "error" and a button on it saying the same leaves
   * the reader unable to tell which of the two is meant. So decide which one carries it. */
  readonly highlight?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'> | 'solid';
  /** Optionally, the ground an overlaid button lies over: true for a dark one, false for a light one.
   * Every button takes its form from the ground it sits on, and the overlaid type reads this prop
   * alone: it is small beside a menu or a card, so it can be fitted to the background it lies over
   * individually - the navigation buttons of the image viewer lying over the image are the case.
   * Without it, the overlaid button follows the ground like every other type. */
  readonly darkTheme?: boolean;
  /** The optional text of the button. It can be prefixed by an icon (see prop "icon"). */
  readonly text?: string | number;
  /** The optional icon of the button. It can be followed by a text (see prop "text"). To select an
   * icon, this prop must be given its name (see indicator component "Icon"). */
  readonly icon?: string;
  /** Rotation of the icon (see prop "icon") in degrees. Positive values rotate the icon clockwise,
   * negative values counterclockwise. */
  readonly iconRotation?: number;
  /** A callback prop that is called when the button is clicked (as long as it is in the "Idle"
   * status). */
  readonly onClick?: ({ event }: { event: React.PointerEvent<HTMLSpanElement> | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
  /** This callback prop is only called if the prop "holdable" is set to true. Calling this prop
   * marks the start of the button being held down and is delayed by 400 ms after the prop "onClick"
   * is called. */
  readonly onHoldStart?: ({ event }: { event: React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
  /** This callback prop is only called if the prop "holdable" is set to true. Calling this prop
   * marks the end of holding down the button. */
  readonly onHoldEnd?: ({ event }: { event: React.PointerEvent<HTMLSpanElement> | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
