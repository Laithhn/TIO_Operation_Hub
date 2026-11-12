import { useImperativeHandle, useRef } from 'react';

import { useI18n } from 'components/hooks/useI18n';
import { parseDateTime } from 'utils/date';

import formatLib from '../formatLib.json';

import * as css from './dateTimeField.scss';
import type { DateTimeFieldProps } from './dateTimeField.types';
import { DateTimePart } from './dateTimePart/DateTimePart';
import type { DateTimePartHandle, DateTimePartProps } from './dateTimePart/dateTimePart.types';
import { Separator } from './separator/Separator';


/**
 * React component of a date and / or time field.
 */
const DateTimeField = ({
  ref, disable = false, dense = false, dateTimeFormat: {
    parts, allFormatIds, numFormatIds,
  }, dateTimeObj, onChange, onFocusPrev, onFocusNext, onBlurFirst, onBlurLast,
}: DateTimeFieldProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const allNumericPartsRef = useRef<Record<string, DateTimePartHandle | null>>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    /**
     * Imperative handle to focus the first numeric part of this data time field by the parent
     * component.
     */
    focusFirst: () => {
      const [id] = allFormatIds;

      if (id) {
        requestAnimationFrame(() => {
          allNumericPartsRef.current[id]!.focus();
        });
      }
    },

    /**
     * Imperative handle to focus the last numeric part of this data time field by the parent
     * component. By setting the boolean argument clear to true, the value of this last part is
     * additionally cleared.
     */
    focusLast: (clear) => {
      const id = allFormatIds[numFormatIds - 1];

      if (id) {
        if (clear) {
          onChange({ [id]: null });
        }

        requestAnimationFrame(() => {
          allNumericPartsRef.current[id]!.focus();
        });
      }
    },
  }), [allFormatIds, numFormatIds, onChange]);


  /**
   * React callback reference of all numeric parts.
   */
  const numericPartRefCallback: (node: DateTimePartHandle | null, id: string) => (undefined | (() => void)) = (node, id) => {
    if (!node) {
      return undefined;
    }

    allNumericPartsRef.current[id] = node;

    return () => {
      allNumericPartsRef.current[id] = null;
    };
  };


  /**
   * Handler for the synthetic React event "onPaste" of the native main element of the date time
   * field.
   */
  const handlePasteDateTime: React.ClipboardEventHandler<HTMLSpanElement> = (event) => {
    const obj = parseDateTime(event.clipboardData.getData('text/plain'));

    if (obj) {
      onChange(obj);
    }
  };


  /**
   * Handler for the callback prop "onFocusPrev" of a part: the arrow left, or Backspace on an empty
   * part, moves the focus to the previous part - clearing it where asked to - or, from the first
   * part, out of the field.
   */
  const handleFocusPrev: DateTimePartProps['onFocusPrev'] = ({ id, clear }) => {
    const idx = allFormatIds.indexOf(id);

    if (idx >= 0) {
      if (idx > 0) {
        const prevId = allFormatIds[idx - 1]!;

        if (clear) {
          onChange({ [prevId]: null });
        }

        requestAnimationFrame(() => {
          allNumericPartsRef.current[prevId]?.focus();
        });
      } else {
        onFocusPrev?.((typeof clear === 'boolean') ? { clear } : {});
      }
    }
  };


  /**
   * Handler for the callback prop "onFocusNext" of a part: the arrow right, or a value that is
   * complete, moves the focus to the next part or, from the last part, out of the field.
   */
  const handleFocusNext: DateTimePartProps['onFocusNext'] = ({ id }) => {
    const idx = allFormatIds.indexOf(id);

    if (idx >= 0) {
      if (idx < (numFormatIds - 1)) {
        requestAnimationFrame(() => {
          allNumericPartsRef.current[allFormatIds[idx + 1]!]?.focus();
        });
      } else {
        onFocusNext?.();
      }
    }
  };


  /**
   * Handler for the callback prop "onKeyTab" of every part: Shift+Tab on the first part and Tab on
   * the last one leave the field, which the two blur props report. One handler for all parts rather
   * than one per edge, because a field of a single part is both edges at once - two handlers spread
   * onto it left only the second standing.
   */
  const handleKeyTab: NonNullable<DateTimePartProps['onKeyTab']> = ({ id, isShiftKey }) => {
    const idx = allFormatIds.indexOf(id);

    if (isShiftKey && (idx === 0)) {
      onBlurFirst?.();
    } else if (!isShiftKey && (idx >= (numFormatIds - 1))) {
      onBlurLast?.();
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

  return (
    <span
      className={css.dateTimeField}
      dir="ltr"
      onPaste={handlePasteDateTime}
    >
      {parts.map(({ chars, isFormatPart }, idx) => {
        if (isFormatPart) {
          const {
            id, minValue, maxValue, numDigits, translatePhC, phC,
          } = formatLib[chars]!;
          const modMaxValue = (id === 'day') ? dateTimeObj.daysOfMonth : maxValue;

          return (
            <DateTimePart
              key={id}
              ref={(node) => numericPartRefCallback(node, id)}
              id={id}
              disable={disable}
              dateTimeObj={dateTimeObj}
              minValue={minValue}
              maxValue={modMaxValue}
              numDigits={numDigits}
              placeholderChar={translatePhC ? translateText(phC) : phC}
              onChange={onChange}
              onFocusPrev={handleFocusPrev}
              onFocusNext={handleFocusNext}
              onKeyTab={handleKeyTab}
            />
          );
        }

        return (<Separator key={idx} dense={dense} value={chars} />); // eslint-disable-line react/no-array-index-key
      })}
    </span>
  );
  //                                                                                  </editor-fold>
};

DateTimeField.displayName = 'DateTimeField';


export { DateTimeField };
