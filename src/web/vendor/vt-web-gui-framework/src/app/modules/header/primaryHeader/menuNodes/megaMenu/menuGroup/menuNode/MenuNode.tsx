import { NavigationLink } from 'components/helpers/navigationLink';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './menuNode.scss';
import type { InnerLinkProps, MenuNodeProps } from './menuNode.types';


/**
 *
 */
const InnerLink = ({ caption, level, icon }: InnerLinkProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let iconPath, iconDimPx, sign;

  switch (level) {
    case 2:
      iconPath = getIconPath(icon ?? '') ?? '';
      iconDimPx = `${css.linkLevel2IconDim}px`;
      break;

    case 3:
      sign = icon;
      break;
    // no default
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <>
      {!!iconPath && (
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox} className={css.icon}>
          <path d={iconPath} />
        </svg>
      )}
      {!!sign && <span className={css.sign}>{sign}</span>}
      <span className={css.caption}>{translateText(caption ?? '')}</span>
    </>
  );
  //                                                                                  </editor-fold>
};

InnerLink.displayName = 'InnerLink';


/**
 * React sub-component of the app module "Header" to render a link of a given menu node in a link
 * group of the mega menu.
 */
const MenuNode = ({ menuNode, onClose }: MenuNodeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    id, caption, level, icon, isDisabled, urlPath,
  } = menuNode;

  const isActive = useSelector((state) => primaryMenuSlice.selectIsMenuNodeActive(state, id));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // the framework's HTML ID of the node, carried by whichever element stands for its link
  const elemId = `viwgf_megaMenu_${id}`;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // only menu nodes with level 2 or 3 are allowed here
  if (level < 2) {
    return null;
  }


  const menuNodeLinkClasses = classNames(css.menuNode, {
    [css.isLevel2]: (level === 2),
    [css.isLevel3]: (level >= 3),
    [css.active]: isActive,
    [css.disabled]: isDisabled,
  });

  if (isDisabled) {
    return (
      <span id={elemId} className={menuNodeLinkClasses}>
        <InnerLink caption={caption} level={level} icon={icon} />
      </span>
    );
  }

  return (
    <NavigationLink
      id={elemId}
      className={menuNodeLinkClasses}
      to={urlPath}
      onClick={onClose}
    >
      <InnerLink caption={caption} level={level} icon={icon} />
    </NavigationLink>
  );
  //                                                                                  </editor-fold>
};

MenuNode.displayName = 'MenuNode';


export { MenuNode };
