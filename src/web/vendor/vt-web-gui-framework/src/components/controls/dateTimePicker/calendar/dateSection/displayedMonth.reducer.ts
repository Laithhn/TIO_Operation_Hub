import { isNumber } from 'utils/type';

import type { DateTimeObj } from '../../dateTimePicker.types';

import type { DisplayedMonthActions, DisplayedMonthState } from './dateSection.type';


export const displayedMonthInitialArg: DisplayedMonthState = {
  month: (new Date()).getMonth() + 1,
  year: (new Date()).getFullYear(),
};


export const displayedMonthInit = (dateTimeObj: DateTimeObj): DisplayedMonthState => ({
  month: dateTimeObj.month ?? displayedMonthInitialArg.month,
  year: dateTimeObj.year ?? displayedMonthInitialArg.year,
});


export const displayedMonthReducer = (state: DisplayedMonthState, action: DisplayedMonthActions) => {
  switch (action?.type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_FROM_PROP': {
    // ---------------------------------------------------------------------------------------------

      const month = action.payload.month ?? displayedMonthInitialArg.month;
      const year = action.payload.year ?? displayedMonthInitialArg.year;

      if ((month === state.month) && (year === state.year)) {
        return state;
      }

      return {
        ...state,
        month,
        year,
      };
    }

    // ---------------------------------------------------------------------------------------------
    case 'SET_MONTH':
    // ---------------------------------------------------------------------------------------------

      if (action.payload === state.month) {
        return state;
      }

      return {
        ...state,
        month: action.payload,
      };

    // ---------------------------------------------------------------------------------------------
    case 'SET_YEAR':
    // ---------------------------------------------------------------------------------------------

      if (action.payload === state.year) {
        return state;
      }

      return {
        ...state,
        year: action.payload,
      };

    // ---------------------------------------------------------------------------------------------
    case 'DECREMENT_MONTH':
    // ---------------------------------------------------------------------------------------------

      if (state.month === 1) {
        return {
          ...state,
          month: 12,
          year: state.year - 1,
        };
      }

      return {
        ...state,
        month: state.month - 1,
      };

    // ---------------------------------------------------------------------------------------------
    case 'INCREMENT_MONTH':
    // ---------------------------------------------------------------------------------------------

      if (state.month === 12) {
        return {
          ...state,
          month: 1,
          year: state.year + 1,
        };
      }

      return {
        ...state,
        month: state.month + 1,
      };

    default:
      return state;
  }
};


export const setFromProp = (dataTimeObj: DateTimeObj): DisplayedMonthActions => ({
  type: 'SET_FROM_PROP',
  payload: dataTimeObj,
});


export const setMonth = (month: unknown): DisplayedMonthActions => {
  const convMonth = Number(month);

  if (isNumber(convMonth, { withoutInfinite: true, gt: 0 })) {
    return { type: 'SET_MONTH', payload: convMonth };
  }

  return undefined;
};


export const setYear = (year: unknown): DisplayedMonthActions => {
  const convYear = Number(year);

  if (isNumber(convYear, { withoutInfinite: true, gt: 0 })) {
    return { type: 'SET_YEAR', payload: convYear };
  }

  return undefined;
};


export const decrementMonth = (): DisplayedMonthActions => ({
  type: 'DECREMENT_MONTH',
});


export const incrementMonth = (): DisplayedMonthActions => ({
  type: 'INCREMENT_MONTH',
});


export const selectMonth = (state: DisplayedMonthState) => state.month;


export const selectYear = (state: DisplayedMonthState) => state.year;
