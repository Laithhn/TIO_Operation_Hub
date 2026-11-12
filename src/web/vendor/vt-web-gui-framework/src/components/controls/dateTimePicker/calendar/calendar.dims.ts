import type { SpaceKeys } from 'assets/styles';


// The calendar's measures: its sub-components lay out with them, and the calendar adds them up to
// its own height (see Calendar.tsx). No stylesheet draws with any of them, so they are written
// here, in the one module every reader imports; the circle of a day is the day's own and stands in
// day.scss. A spacing is stated as its key, the form the styling props take, and the height reads
// its pixels from the space map.
export const sectionPaddingTop: SpaceKeys = 'small';
export const sectionPaddingBottom: SpaceKeys = 'small';
export const dayMinWidth = 38;
export const dayHeight = 36;
export const timeSectionRowGap: SpaceKeys = 'small';
export const nowButtonPaddingTop: SpaceKeys = 'xs';
export const nowButtonPaddingBottom: SpaceKeys = 'xs';
