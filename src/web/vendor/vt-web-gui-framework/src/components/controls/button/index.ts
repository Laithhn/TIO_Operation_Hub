import { Button } from './Button';
import * as css from './button.scss';
import { type ButtonHandle, type ButtonProps, ButtonStatus } from './button.types';


// The button's two heights are public numbers of the framework, and the stylesheet's ":export" block
// hands them over as strings - the only type css-loader knows for an exported value. Converted once
// here, so a consumer subtracting one from a width gets a difference and not a concatenation.
const buttonDim = Number(css.buttonDim);
const buttonDimLarge = Number(css.buttonDimLarge);


export type { ButtonHandle, ButtonProps };

export {
  Button, buttonDim, buttonDimLarge, ButtonStatus,
};
