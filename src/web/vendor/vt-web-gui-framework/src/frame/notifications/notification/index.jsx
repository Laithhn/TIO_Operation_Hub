import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import {
  memo, useState, useRef, useCallback, useEffect,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Button, { ButtonType } from 'components/controls/button';
import Icon, { IconSize } from 'components/indicators/icon';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import { actions, selectors } from 'store';
import bbCode from 'utils/bbCode';
import classNames from 'utils/classNames';
import convertUnicode from 'utils/convertUnicode';

import css from './notification.scss';


/**
 * Enumeration for the lifecycle steps of a notification.
 */
class LifecycleStep extends Enumify {
  static START = new LifecycleStep();
  static INCREASE = new LifecycleStep({ timeMs: defines.layout.notifications.animInTimeMs / 2 });
  static SLIDE_IN = new LifecycleStep({ timeMs: defines.layout.notifications.animInTimeMs / 2 });
  static SHOW = new LifecycleStep();
  static SLIDE_OUT = new LifecycleStep({ timeMs: defines.layout.notifications.animOutTimeMs / 2 });
  static DECREASE = new LifecycleStep({ timeMs: defines.layout.notifications.animOutTimeMs / 2 });
  static DELETE = new LifecycleStep();
  static _ = this.closeEnum();

  constructor({ timeMs } = {}) {
    super();
    this.timeMs = timeMs;
  }
}


/**
 * Memoized React component of a notification.
 */
const Notification = memo(({ id, maxWidth }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(selectors.i18n.isCurrentLanguageRtl);
  const {
    message, title, icon, color: colorKey, deleteButton, noAutoDelete, menuNodeId, requestDelete,
  } = useSelector((state) => selectors.notifications.getNotifcationById(state, id));
  const menuNode = useSelector((state) => selectors.menus.primaryMenu.getMenuNodeById(state, menuNodeId));

  const [notificationStyle, setNotificationStyle] = useState({
    position: 'absolute',
    maxWidth: maxWidth - (2 * defines.layout.notifications.padding),
  });

  const notificationRef = useRef();
  const reqAnimFrameRef = useRef();
  const animationDataRef = useRef({
    startTimestamp: undefined,
    lifecycle: LifecycleStep.START,
    measuredWidth: 0,
    measuredHeight: 0,
    showTimeMs: Math.max(Math.min(message.length * defines.layout.notifications.showTimePerCharMs, defines.layout.notifications.showTimeMaxMs), defines.layout.notifications.showTimeMinMs),
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { iconExists } = useIconsAsync();

  const isIcon = iconExists(icon);
  const color = Enums.BackgroundColor.enumValueOf(colorKey);
  const darkTheme = ![Enums.BackgroundColor.PALE_GRAY, Enums.BackgroundColor.ATTENTION, Enums.BackgroundColor.ATTENTION_HIGH].includes(color);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  /**
   * Memoized animation state machine for the requestAnimationFrame to show and hide the
   * notification with animations by certain animation steps.
   */
  const animate = useCallback((timestamp) => {
    switch (animationDataRef.current.lifecycle) {
      // -------------------------------------------------------------------------------------------
      case LifecycleStep.START: {
      // -------------------------------------------------------------------------------------------

        const { width, height } = notificationRef.current.getBoundingClientRect();
        animationDataRef.current.measuredWidth = width;
        animationDataRef.current.measuredHeight = height;

        setNotificationStyle((prevValue) => ({
          maxWidth: prevValue.maxWidth,
          height: 0,
        }));

        animationDataRef.current.lifecycle = LifecycleStep.INCREASE;
        reqAnimFrameRef.current = requestAnimationFrame(animate);
        break;
      }

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.INCREASE:
      // -------------------------------------------------------------------------------------------

        setNotificationStyle((prevValue) => ({
          ...prevValue,
          height: `${animationDataRef.current.measuredHeight}px`,
          transform: 'translateX(0)',
          transition: `height ${LifecycleStep.INCREASE.timeMs}ms ease-in-out`,
        }));

        animationDataRef.current.startTimestamp = timestamp;
        animationDataRef.current.lifecycle = LifecycleStep.SLIDE_IN;
        reqAnimFrameRef.current = requestAnimationFrame(animate);
        break;

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.SLIDE_IN:
      // -------------------------------------------------------------------------------------------

        if ((timestamp - animationDataRef.current.startTimestamp) > LifecycleStep.INCREASE.timeMs) {
          const translateX = (animationDataRef.current.measuredWidth + (2 * defines.layout.notifications.padding))
            * (isRtl ? 1 : -1);

          setNotificationStyle((prevValue) => ({
            ...prevValue,
            height: 'auto',
            transform: `translateX(${translateX}px)`,
            transition: `transform ${LifecycleStep.SLIDE_IN.timeMs}ms ease-out`,
          }));

          animationDataRef.current.startTimestamp = timestamp;
          animationDataRef.current.lifecycle = LifecycleStep.SHOW;
        }

        reqAnimFrameRef.current = requestAnimationFrame(animate);
        break;

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.SHOW: {
      // -------------------------------------------------------------------------------------------

        setNotificationStyle((prevValue) => {
          const translateX = (animationDataRef.current.measuredWidth + (2 * defines.layout.notifications.padding))
            * (isRtl ? 1 : -1);
          const transform = `translateX(${translateX}px)`;

          if (transform === prevValue.transform) {
            return prevValue;
          }

          return {
            ...prevValue,
            transform,
            transition: 'none',
          };
        });

        if (!noAutoDelete) {
          if ((timestamp - animationDataRef.current.startTimestamp) > (LifecycleStep.SLIDE_IN.timeMs + animationDataRef.current.showTimeMs)) {
            animationDataRef.current.lifecycle = LifecycleStep.SLIDE_OUT;
          }

          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.SLIDE_OUT:
      // -------------------------------------------------------------------------------------------

        setNotificationStyle((prevValue) => ({
          ...prevValue,
          height: `${notificationRef.current.getBoundingClientRect().height}px`,
          transform: 'translateX(0)',
          transition: `transform ${LifecycleStep.SLIDE_OUT.timeMs}ms ease-in`,
        }));

        animationDataRef.current.startTimestamp = timestamp;
        animationDataRef.current.lifecycle = LifecycleStep.DECREASE;
        reqAnimFrameRef.current = requestAnimationFrame(animate);
        break;

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.DECREASE:
      // -------------------------------------------------------------------------------------------

        if ((timestamp - animationDataRef.current.startTimestamp) > LifecycleStep.SLIDE_OUT.timeMs) {
          setNotificationStyle((prevValue) => ({
            ...prevValue,
            height: 0,
            transition: `height ${LifecycleStep.DECREASE.timeMs}ms ease-in-out`,
          }));

          animationDataRef.current.startTimestamp = timestamp;
          animationDataRef.current.lifecycle = LifecycleStep.DELETE;
        }

        reqAnimFrameRef.current = requestAnimationFrame(animate);
        break;

      // -------------------------------------------------------------------------------------------
      case LifecycleStep.DELETE:
      // -------------------------------------------------------------------------------------------

        if ((timestamp - animationDataRef.current.startTimestamp) > LifecycleStep.DECREASE.timeMs) {
          dispatch(actions.notifications.deleteNotification(id, true));
        } else {
          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;

      // no default
    }
  }, [id, isRtl, noAutoDelete, dispatch]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Event handler to switch the livecycle state to "SLIDE OUT" in order to delete the notification.
   */
  const handleDeleteNotification = useCallback(() => {
    animationDataRef.current.lifecycle = LifecycleStep.SLIDE_OUT;
    reqAnimFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    const handleDomChange = () => {
      if (notificationRef.current) {
        const { width } = notificationRef.current.getBoundingClientRect();

        if (width !== animationDataRef.current.measuredWidth) {
          switch (animationDataRef.current.lifecycle) {
            case LifecycleStep.START:
            case LifecycleStep.INCREASE:
            case LifecycleStep.SLIDE_IN:
              animationDataRef.current.measuredWidth = width;
              break;

            case LifecycleStep.SHOW:
              animationDataRef.current.measuredWidth = width;
              reqAnimFrameRef.current = requestAnimationFrame(animate);
              break;

            // no default
          }
        }
      }
    };


    document.addEventListener('domChange', handleDomChange);
    reqAnimFrameRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('domChange', handleDomChange);
      cancelAnimationFrame(reqAnimFrameRef.current);
    };
  }, [animate]);


  useEffect(() => {
    if (requestDelete) {
      handleDeleteNotification();
    }
  }, [requestDelete, handleDeleteNotification]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const innerContrClasses = classNames(css.innerContr, {
    [css.isIcon]: isIcon,
    [css.colorPaleGray]: (color === Enums.BackgroundColor.PALE_GRAY),
    [css.colorAttention]: (color === Enums.BackgroundColor.ATTENTION),
    [css.colorAttentionHigh]: (color === Enums.BackgroundColor.ATTENTION_HIGH),
  });

  return (
    <div
      ref={notificationRef}
      className={css.notification}
      style={notificationStyle}
    >
      <div className={innerContrClasses}>
        {isIcon && <Icon darkTheme={darkTheme} icon={icon} size={IconSize.NORMAL} />}
        <Section rowGap={Enums.GapAndPadding.XS}>
          {title && <Text type={Enums.TextType.TITLE} darkTheme={darkTheme}>{title}</Text>}
          {menuNode ? (
            <Link to={{ pathname: menuNode.urlPath }} className={css.link}>
              <Text darkTheme={darkTheme} size={Enums.ValueSize.normal}>{bbCode(convertUnicode(message))}</Text>
            </Link>
          ) : (
            <Text darkTheme={darkTheme} size={Enums.ValueSize.normal}>{bbCode(convertUnicode(message))}</Text>
          )}
        </Section>
        {deleteButton && (
          <Button
            type={ButtonType.ICON}
            darkTheme={darkTheme}
            icon="DELETE"
            onClick={handleDeleteNotification}
          />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
});

Notification.displayName = 'Notification';

Notification.propTypes = {
  id: PropTypes.string.isRequired,
  maxWidth: PropTypes.number,
};

Notification.defaultProps = {
  maxWidth: 0,
};

export default Notification;
