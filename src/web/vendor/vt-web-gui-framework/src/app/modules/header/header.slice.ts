import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { enhancedReducerCreator } from 'store';
import { convertUnicode } from 'utils/convertUnicode';

import type { HeaderState } from './header.types';
import { createInitialState } from './utils/createInitialState';


const initialState: HeaderState = {
  logo: true,
  title: '',
};


/**
 * Redux Toolkit slice that handles the partial state of the app module "Header".
 */
const slice = createSlice({
  name: 'VIWGF/header',
  reducerPath: 'header',
  initialState,

  reducers: {
    /**
     * Reducer to set the logo of the header. Set to false to hide the logo. Set to true to display
     * the default VITRONIC logo. If a custom logo should be shown, then the filename of this logo
     * with path inside the assets folder must be set here.
     */
    setLogo: (state, { payload }: PayloadAction<boolean | string>) => {
      if (typeof payload === 'string') {
        const logo = payload.trim();
        state.logo = (logo === '') ? true : logo;
      } else {
        state.logo = payload;
      }
    },


    /**
     * Reducer to set the title to show in the center of the header. A translation key can be set
     * here, as well as Unicode characters like "\&\#160;" or "\&\#x00A0;". Note that the title is
     * only displayed under certain conditions.
     */
    setTitle: (state, { payload }: PayloadAction<string | number>) => {
      state.title = convertUnicode(String(payload));
    },
  },


  selectors: {
    /**
     * Selector to get the logo to show in the header. If the value is false, no logo has to be
     * displayed. If the value is true, the default VITRONIC logo has to be displayed. If a custom
     * logo has to be shown, then the filename of the logo with path inside the assets folder is
     * returned.
     */
    selectLogo: (state: HeaderState) => state.logo,


    /**
     * Selector to get the title for the header.
     */
    selectTitle: (state: HeaderState) => state.title,
  },
});


export const reducer = enhancedReducerCreator<HeaderState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const { setLogo, setTitle } = slice.actions;

export const { selectLogo, selectTitle } = slice.selectors;
