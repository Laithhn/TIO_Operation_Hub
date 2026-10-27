import { useEffect, useRef, useState } from 'react';

import { layout } from 'assets/styles';
import { Button } from 'components/controls/button';
import { NavigationLink } from 'components/helpers/navigationLink';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { Icon } from 'components/indicators/icon';
import { Text } from 'components/indicators/text';
import { Section } from 'components/layouts/section';
import { i18nSlice } from 'store/i18n';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';
import { convertUnicode } from 'utils/convertUnicode';

import { iconExists } from 'VtWebGuiIcons/src';

import { deleteNotification, selectNotifcation } from '../notifications.slice';

import * as css from './notification.scss';
import type { NotificationProps } from './notification.types';


const animInTimeMs = 400; // total time in milliseconds for showing a notification with animation
const animOutTimeMs = 1200; // total time in milliseconds for hiding a notification with animation
const showTimePerCharMs = 65;
const showTimeMinMs = 2000;
const showTimeMaxMs = 10000;


/**
 * React sub-component of a single notification of the app module "Notifications".
 */
const Notification = ({ id, maxWidth }: NotificationProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(i18nSlice.selectIsCurrentLanguageRtl);

  const {
    title, message, icon, color, isDeleteButton, isPreventAutoDelete, menuNodeId, contentData,
    isRequestedToDelete,
  } = useSelector((state) => selectNotifcation(state, id))!;

  const menuNode = useSelector((state) => primaryMenuSlice.selectMenuNode(state, menuNodeId));

  const [notificationStyle, setNotificationStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    maxWidth: `${maxWidth - (2 * layout.notifications.space)}px`,
  });

  // True once the notification has flown in completely, which plays its pulse.
  const [isArrived, setIsArrived] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const animationDataRef = useRef<{
    startTimestampMs: number;
    lifecycle: 'start' | 'increase' | 'slideIn' | 'arrive' | 'show' | 'slideOut' | 'decrease' | 'delete';
    measuredWidth: number;
    measuredHeight: number;
    showTimeMs: number;
  }>({
    startTimestampMs: 0,
    lifecycle: 'start',
    measuredWidth: 0,
    measuredHeight: 0,
    showTimeMs: Math.max(showTimeMinMs, Math.min(showTimeMaxMs, message.length * showTimePerCharMs)),
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isIcon = iconExists(icon);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onClick" of the delete button: requests the deletion of the
   * notification, which the effect below answers with the slide-out - the path a deletion requested
   * from outside takes as well.
   */
  const handleDeleteNotification = () => {
    dispatch(deleteNotification(id));
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // The animation that shows the notification and hides it again: a state machine stepped once per
  // animation frame, its progress kept in animationDataRef across the runs of this effect. The
  // effect is the one place that starts the loop, and at most one frame is ever requested - two
  // loops would step each lifecycle twice per frame. The loop pauses while a notification stands
  // until it is closed; a change the animation depends on runs the effect and starts it again.
  useEffect(() => {
    let frame = 0;

    const animate = (timestamp: DOMHighResTimeStamp) => {
      frame = 0;

      switch (animationDataRef.current.lifecycle) {
        // -----------------------------------------------------------------------------------------
        case 'start': {
        // -----------------------------------------------------------------------------------------

          const { width, height } = notificationRef.current?.getBoundingClientRect() ?? {};
          animationDataRef.current.measuredWidth = width ?? 0;
          animationDataRef.current.measuredHeight = height ?? 0;

          setNotificationStyle((prevValue) => ({
            maxWidth: prevValue.maxWidth,
            height: 0,
          }));

          animationDataRef.current.lifecycle = 'increase';
          frame = requestAnimationFrame(animate);
          break;
        }

        // -----------------------------------------------------------------------------------------
        case 'increase':
        // -----------------------------------------------------------------------------------------

          setNotificationStyle((prevValue) => ({
            ...prevValue,
            height: `${animationDataRef.current.measuredHeight}px`,
            transform: 'translateX(0)',
            transition: `height ${animInTimeMs}ms ease-in-out`,
          }));

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.lifecycle = 'slideIn';
          frame = requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case 'slideIn':
        // -----------------------------------------------------------------------------------------

          if ((timestamp - animationDataRef.current.startTimestampMs) > animInTimeMs) {
            const translateX = (animationDataRef.current.measuredWidth + (2 * layout.notifications.space))
              * (isRtl ? 1 : -1);

            setNotificationStyle((prevValue) => ({
              ...prevValue,
              height: 'auto',
              transform: `translateX(${translateX}px)`,
              transition: `transform ${animInTimeMs}ms ease-out`,
            }));

            animationDataRef.current.startTimestampMs = timestamp;
            animationDataRef.current.lifecycle = 'arrive';
          }

          frame = requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case 'arrive':
        // -----------------------------------------------------------------------------------------

          // The start of the slide stays the start of the show time, which counts the slide in.
          if ((timestamp - animationDataRef.current.startTimestampMs) > animInTimeMs) {
            setIsArrived(true);
            animationDataRef.current.lifecycle = 'show';
          }

          frame = requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case 'show': {
        // -----------------------------------------------------------------------------------------

          setNotificationStyle((prevValue) => {
            const translateX = (animationDataRef.current.measuredWidth + (2 * layout.notifications.space))
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

          if (!isPreventAutoDelete) {
            if ((timestamp - animationDataRef.current.startTimestampMs) > (animInTimeMs + animationDataRef.current.showTimeMs)) {
              animationDataRef.current.lifecycle = 'slideOut';
            }

            frame = requestAnimationFrame(animate);
          }
          break;
        }

        // -----------------------------------------------------------------------------------------
        case 'slideOut':
        // -----------------------------------------------------------------------------------------

          setNotificationStyle((prevValue) => ({
            ...prevValue,
            height: `${notificationRef.current?.getBoundingClientRect().height}px`,
            transform: 'translateX(0)',
            transition: `transform ${animOutTimeMs}ms ease-in`,
          }));

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.lifecycle = 'decrease';
          frame = requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case 'decrease':
        // -----------------------------------------------------------------------------------------

          if ((timestamp - animationDataRef.current.startTimestampMs) > animOutTimeMs) {
            setNotificationStyle((prevValue) => ({
              ...prevValue,
              height: 0,
              transition: `height ${animOutTimeMs}ms ease-in-out`,
            }));

            animationDataRef.current.startTimestampMs = timestamp;
            animationDataRef.current.lifecycle = 'delete';
          }

          frame = requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case 'delete':
        // -----------------------------------------------------------------------------------------

          if ((timestamp - animationDataRef.current.startTimestampMs) > animOutTimeMs) {
            dispatch(deleteNotification(id, true));
          } else {
            frame = requestAnimationFrame(animate);
          }
          break;

        // no default
      }
    };


    const handleDomChange = () => {
      if (notificationRef.current) {
        const { width } = notificationRef.current.getBoundingClientRect();

        if (width !== animationDataRef.current.measuredWidth) {
          switch (animationDataRef.current.lifecycle) {
            case 'start':
            case 'increase':
            case 'slideIn':
            case 'arrive':
              animationDataRef.current.measuredWidth = width;
              break;

            case 'show':
              animationDataRef.current.measuredWidth = width;

              // A standing notification's loop pauses, so the new width may have to start it.
              if (!frame) {
                frame = requestAnimationFrame(animate);
              }
              break;

            // no default
          }
        }
      }
    };


    // A requested deletion turns the notification to its slide-out wherever it stands, unless it is
    // on its way out already.
    if (isRequestedToDelete && ['start', 'increase', 'slideIn', 'arrive', 'show'].includes(animationDataRef.current.lifecycle)) {
      animationDataRef.current.lifecycle = 'slideOut';
    }

    document.addEventListener('domChange', handleDomChange);
    frame = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('domChange', handleDomChange);
      cancelAnimationFrame(frame);
    };
  }, [id, isRtl, isPreventAutoDelete, isRequestedToDelete, dispatch]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const innerContrClasses = classNames(css.innerContr, {
    [css.isIcon]: isIcon,
    [css.isArrived]: isArrived,
    [css.glass]: !color,
    [css.colorAttention]: (color === 'attention'),
    [css.colorAttentionHigh]: (color === 'attentionHigh'),
  });

  return (
    <div ref={notificationRef} className={css.notification} style={notificationStyle}>
      <div className={innerContrClasses}>
        {isIcon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <Icon icon={icon} />
        )}
        <Section rowGap="xs">
          {!!title && <Text type="title">{title}</Text>}
          {menuNode
            ? (
              <NavigationLink className={css.link} to={menuNode.urlPath} {...(contentData && { state: contentData })}>
                <Text>{bbCode(convertUnicode(message))}</Text>
              </NavigationLink>
            )
            : (
              <Text>{bbCode(convertUnicode(message))}</Text>
            )}
        </Section>
        {isDeleteButton && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <Button type="tinted" icon="DELETE" onClick={handleDeleteNotification} />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

Notification.displayName = 'Notification';


export type { NotificationProps };

export { Notification };
