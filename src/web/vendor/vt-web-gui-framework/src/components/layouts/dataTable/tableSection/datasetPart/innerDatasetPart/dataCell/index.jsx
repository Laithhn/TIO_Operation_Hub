import PropTypes from 'prop-types';
import { memo, useRef } from 'react';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import { useCellMeasurer } from 'components/helpers/tablePreparer';

import css from './dataCell.scss';


/**
 * Memoized React component of a dataset cell, displayed in an partial dataset (components
 * DatasetPart and InnerDatasetPart) of a data table (component DataTable). Due to performance
 * reasons this component does not require the use of hook useStylingProps. Note that it can only
 * memoized, if it has a simple content (string or number).
 */
const DataCell = memo(({
  tableId, columnGroupId, datasetId, gridArea, placeSelf, alignSelf, justifySelf, textAlign,
  backgroundColor, valueSize, valueColor, disabled, cellMetaData, content, onClick, isNewCellIterator,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const innerContrRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let isSimpleContentWithBackground, isClickable, innerContrClasses, innerContrStyle;

  if ((typeof content === 'string') || (typeof content === 'number')) {
    // simple data cell

    isSimpleContentWithBackground = (backgroundColor !== DataCell.defaultProps.backgroundColor);
    isClickable = (typeof onClick === 'function');

    innerContrClasses = classNames(css.innerContrSimple, {
      [css.typoValueSmall]: ((valueSize !== Enums.ValueSize.NORMAL) && (valueSize !== Enums.ValueSize.LARGE)),
      [css.typoSizeNormal]: (valueSize === Enums.ValueSize.NORMAL),
      [css.typoValueLarge]: (valueSize === Enums.ValueSize.LARGE),
      [css.typoDarkTheme]: backgroundColor.darkTheme,
      [css.typoDisabled]: disabled,
    });

    innerContrStyle = {
      ...(!isSimpleContentWithBackground && !isClickable && { gridArea }),
      ...((placeSelf !== DataCell.defaultProps.placeSelf) && { placeSelf: placeSelf.cssValue }),
      ...((alignSelf !== DataCell.defaultProps.alignSelf) && { alignSelf: alignSelf.cssValue }),
      ...((justifySelf !== DataCell.defaultProps.justifySelf) && { justifySelf: justifySelf.cssValue }),
      ...((textAlign !== DataCell.defaultProps.textAlign) && { textAlign: textAlign.cssValue }),
      ...((valueColor !== DataCell.defaultProps.valueColor) && { color: valueColor.color }),
    };
  } else {
    // complex data cell

    isSimpleContentWithBackground = false;
    isClickable = false;
    innerContrClasses = css.innerContrComplex;

    innerContrStyle = {
      gridArea,
      ...((placeSelf !== DataCell.defaultProps.placeSelf) && { placeSelf: placeSelf.cssValue }),
      ...((alignSelf !== DataCell.defaultProps.alignSelf) && { alignSelf: alignSelf.cssValue }),
      ...((justifySelf !== DataCell.defaultProps.justifySelf) && { justifySelf: justifySelf.cssValue }),
    };
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

  useCellMeasurer(columnGroupId, datasetId, cellMetaData, innerContrRef);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const innerContr = (
    <div ref={innerContrRef} className={innerContrClasses} style={innerContrStyle}>
      {content}
    </div>
  );


  if (isSimpleContentWithBackground || isClickable) {
    const outerContrClasses = classNames(css.outerContr, {
      [css.clickable]: isClickable,
    });

    return (
      <div
        className={outerContrClasses}
        style={{ gridArea, background: backgroundColor.color }}
        {...(isClickable && {
          onClick: (event) => {
            // Deprecated: at next major version, only the new definition of onClick is used.
            //  The old one and prop isNewCellIterator has to be deleted.
            if (isNewCellIterator) {
              onClick({
                tableId, columnGroupId, datasetId, cellId: gridArea,
              }, event);
            } else {
              onClick(datasetId, gridArea, tableId, event);
            }
          },
        })}
      >
        {innerContr}
      </div>
    );
  }

  return innerContr;
  //                                                                                  </editor-fold>
});

DataCell.displayName = 'DataCell';

DataCell.propTypes = {
  tableId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  columnGroupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  gridArea: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  placeSelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  alignSelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  justifySelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  textAlign: PropTypes.instanceOf(Enums.TextAlign),
  backgroundColor: PropTypes.instanceOf(Enums.BackgroundColor),
  valueSize: PropTypes.instanceOf(Enums.ValueSize),
  valueColor: PropTypes.instanceOf(Enums.ValueColor),
  disabled: PropTypes.bool,
  cellMetaData: PropTypes.shape({
    cellId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    startRowIdx: PropTypes.number,
    endRowIdx: PropTypes.number,
    startColumnIdx: PropTypes.number,
    endColumnIdx: PropTypes.number,
    measureHeight: PropTypes.bool,
    measureWidth: PropTypes.bool,
  }),
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
  onClick: PropTypes.func,
  isNewCellIterator: PropTypes.bool,
};

DataCell.defaultProps = {
  tableId: '',
  gridArea: '',
  placeSelf: Enums.PlaceSelfItems.AUTO,
  alignSelf: Enums.PlaceSelfItems.AUTO,
  justifySelf: Enums.PlaceSelfItems.AUTO,
  textAlign: Enums.TextAlign.AUTO,
  backgroundColor: Enums.BackgroundColor.NONE,
  valueSize: Enums.ValueSize.SMALL,
  valueColor: Enums.ValueColor.NONE,
  disabled: false,
  cellMetaData: {
    startRowIdx: 0,
    endRowIdx: 0,
    startColumnIdx: 0,
    endColumnIdx: 0,
    measureHeight: false,
    measureWidth: false,
  },
  content: '',
  onClick: null,
  isNewCellIterator: false,
};

export default DataCell;
