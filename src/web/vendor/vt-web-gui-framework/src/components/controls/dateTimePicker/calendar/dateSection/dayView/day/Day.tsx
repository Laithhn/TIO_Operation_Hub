import { useImperativeHandle, useRef } from 'react';

import { useI18n } from 'components/hooks/useI18n';
import { classNames } from 'utils/classNames';

import * as css from './day.scss';
import type { DayProps } from './day.types.ts';
import { SelectedMarker } from './selectedMarker/SelectedMarker.tsx';


/**
 * React sub-component of the control component "DateTimePicker" to display a single day in the
 * calendar.
 */
const Day = ({
  ref, dayNum, isOtherMonth, isToday, selected, dayWidth, onSelect, onMoveSelected, onTabKey,
  onArrowKey,
}: DayProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const dayRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isSelected = (selected !== 'unselected');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        dayRef.current?.focus();
      });
    },
  }), []);


  /**
   * Handler for the synthetic React event "onPointerDown" of the native main element of this
   * component. Pointer down at a selected day (not inside a range, only start and end day) can be
   * the beginning of the moving of the selection within the current month.
   */
  const handlePointerDown: React.PointerEventHandler<HTMLSpanElement> = () => {
    if (
      !isOtherMonth
      && (
        (selected === 'singleSelected')
        || (selected === 'selectedStart')
        || (selected === 'selectedEnd')
      )
    ) {
      onMoveSelected({ dayNum, startMoving: true });
    }
  };


  /**
   * Handler for the synthetic React event "onPointerEnter" of the native main element of this
   * component. Entering a day of the current month with the pointer while moving the selection is
   * reported by a callback prop.
   */
  const handlePointerEnter: React.PointerEventHandler<HTMLSpanElement> = () => {
    if (!isOtherMonth) {
      onMoveSelected({ dayNum, startMoving: false });
    }
  };


  /**
   * Handler for the synthetic React event "onClick" of the native main element of this component.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();
    onSelect({ dayNum, isOtherMonth });
  };


  /**
   * Handler for the synthetic React event "onKeyDown" of the native main element of this component
   * for keyboard control (selection, navigation).
   */
  const handleKeyDownThisMonth: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.stopPropagation();
        onSelect({ dayNum, isOtherMonth: false });
        break;

      case 'Tab':
        event.stopPropagation();
        onTabKey({ event });
        break;

      case 'ArrowLeft':
        event.stopPropagation();
        onArrowKey({ dayNum, pos: 'left', event });
        break;

      case 'ArrowRight':
        event.stopPropagation();
        onArrowKey({ dayNum, pos: 'right', event });
        break;

      case 'ArrowUp':
        event.stopPropagation();
        onArrowKey({ dayNum, pos: 'up', event });
        break;

      case 'ArrowDown':
        event.stopPropagation();
        onArrowKey({ dayNum, pos: 'down', event });
        break;
      // no default
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const numberClasses = classNames(css.number, {
    [css.typoDisabled]: isOtherMonth,
    [css.today]: isToday,
    [css.selected]: isSelected,
  });

  return (
    <span
      ref={dayRef}
      role="button"
      // A day of the neighbouring month can be clicked but not walked to: it has no key handler and
      // no ref, so the tab key skips it rather than landing on an element that answers nothing.
      tabIndex={isOtherMonth ? -1 : 0}
      className={classNames(css.day, { [css.selected]: isSelected })}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onClick={handleClick}
      onKeyDown={isOtherMonth ? undefined : handleKeyDownThisMonth}
    >
      {isSelected && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <SelectedMarker selected={selected} dayWidth={dayWidth} isRtl={isRtl} />
      )}
      <span className={numberClasses}>{dayNum}</span>
    </span>
  );
  //                                                                                  </editor-fold>
};

Day.displayName = 'Day';


export { Day };
