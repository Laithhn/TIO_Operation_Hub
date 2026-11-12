import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import { setViewportDimensions } from 'app/app.slice';
import { isNonEmptyString, isNumber } from 'utils/type';

import type { Notification, NotificationsState, SetNotificationAction } from './notifications.types';


const initialState: NotificationsState = {
  maxWidth: 0,
  byId: {},
  allIds: [],
};


/**
 * Redux Toolkit slice that handles the partial state of the notifications. This slice is exported
 * as default below.
 */
const slice = createSlice({
  name: 'VIWGF/notifications',
  reducerPath: 'notifications',
  initialState,

  reducers: {
    /**
     * Reducer to set a new notification or to update an existing one.
     */
    setNotification: (state, { payload }: SetNotificationAction) => {
      const id = payload.id ?? nanoid();
      const isMenuNodeId = isNonEmptyString(payload.menuNodeId);

      if (state.byId[id]) {
        // -----------------------------------------------------------------------------------------
        // Modify an existing notification.
        // -----------------------------------------------------------------------------------------

        if (typeof payload.title === 'string') {
          state.byId[id].title = payload.title;
        }

        if (typeof payload.message === 'string') {
          state.byId[id].message = payload.message;
        }

        if (typeof payload.icon === 'string') {
          state.byId[id].icon = payload.icon;
        }

        if ((payload.color === null) || (payload.color && ['attention', 'attentionHigh'].includes(payload.color))) {
          state.byId[id].color = payload.color;
        }

        if (typeof payload.isDeleteButton === 'boolean') {
          state.byId[id].isDeleteButton = payload.isDeleteButton;
        }

        if (typeof payload.isPreventAutoDelete === 'boolean') {
          state.byId[id].isPreventAutoDelete = payload.isPreventAutoDelete;
        }

        if (typeof payload.menuNodeId === 'string') {
          state.byId[id].menuNodeId = payload.menuNodeId;
        }

        if (isNonEmptyString(state.byId[id].menuNodeId)) {
          if (payload.contentData !== undefined) {
            state.byId[id].contentData = payload.contentData;
          }
        } else {
          state.byId[id].contentData = null;
        }
      } else {
        // -----------------------------------------------------------------------------------------
        // Add a new notification.
        // -----------------------------------------------------------------------------------------

        state.byId[id] = {
          title: (typeof payload.title === 'string') ? payload.title : '',
          message: (typeof payload.message === 'string') ? payload.message : '',
          icon: (typeof payload.icon === 'string') ? payload.icon : '',
          color: (payload.color && ['attention', 'attentionHigh'].includes(payload.color)) ? payload.color : null,
          isDeleteButton: (payload.isDeleteButton === true),
          isPreventAutoDelete: (payload.isPreventAutoDelete === true),
          menuNodeId: isMenuNodeId ? payload.menuNodeId! : '',
          contentData: isMenuNodeId && (typeof payload.contentData === 'object') ? payload.contentData : null,
          isRequestedToDelete: false,
        };

        state.allIds.unshift(id);
      }
    },


    /**
     * Reducer to delete a notification, selected by its ID. Optionally set force to true, to delete
     * the notification at once without animation.
     */
    deleteNotification: {
      prepare: (id: string, force?: boolean) => ({
        payload: { id, force: force ?? false },
      }),
      reducer: (state, { payload: { id, force } }: PayloadAction<{ id: string; force: boolean }>) => {
        if (state.byId[id]) {
          if (force) {
            // 1.) delete the notification at once
            state.allIds = state.allIds.filter((storedId) => (storedId !== id));
            state.byId = state.allIds.reduce<NotificationsState['byId']>((acc, storedId) => ({
              ...acc,
              [storedId]: state.byId[storedId]!,
            }), {});
          } else if (!state.byId[id].isRequestedToDelete) {
            // 2.) set the request-to-delete flag of the notification, so it must be deleted by
            // itself
            state.byId[id].isRequestedToDelete = true;
          }
        }
      },
    },
  },


  extraReducers: (builder) => {
    builder
      .addCase(setViewportDimensions, (state, { payload: { width } }) => {
        // Derive the maximum width of a notification by the width of the viewport, broadcasted by
        // the app slice
        if (isNumber(width, { withoutInfinite: true })) {
          if (width < 500) {
            state.maxWidth = width!;
          } else if (width < 1000) {
            state.maxWidth = Math.floor(width / 20) * 10;
          } else {
            state.maxWidth = Math.floor(width / 30) * 10;
          }
        }
      });
  },


  selectors: {
    /**
     * Selector to return the maximum width of the notifications in pixels.
     */
    selectMaxWidth: (state: NotificationsState) => state.maxWidth,


    /**
     * Selector to return an array with the IDs of all notifications. The ID of the latest
     * notification is at the first position in the array.
     */
    selectAllIds: (state: NotificationsState) => state.allIds,


    /**
     * Selector to return an object with the data of a notification, selected by a given ID.
     */
    selectNotifcation: (state: NotificationsState, id: string): Notification | null => state.byId[id] ?? null,
  },
});


export const { reducer, name, reducerPath } = slice;

export const { setNotification, deleteNotification } = slice.actions;

export const { selectMaxWidth, selectAllIds, selectNotifcation } = slice.selectors;
