import { ScrollButton } from './ScrollButton';
import type { ScrollButtonProps } from './scrollButton.types';
import * as shaderCss from './shader/shader.scss';


// The room the scroll button takes at its edge, the length of its shader. The stylesheet's
// ":export" block hands it over as a string, so it is converted once here.
const scrollButtonShaderDim = Number(shaderCss.shaderLength);


export type { ScrollButtonProps };

export { ScrollButton, scrollButtonShaderDim };
