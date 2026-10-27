import type { PayloadAction } from '@reduxjs/toolkit';

import type { ContentData } from 'app/modules/content';
import type { Color } from 'assets/styles';


export interface Notification {
  /** A title of the notification to display above the message. */
  title: string;
  /** The notification message to display. */
  message: string;
  /** The name of an icon to display next to the notification message. */
  icon: string;
  /** The background color of the notification, or null for the glass every notification carries
   * by default. */
  color: (keyof Pick<Color, 'attention' | 'attentionHigh'>) | null;
  /** If true, an additional delete button is displayed next to the message text. */
  isDeleteButton: boolean;
  /** If true, the notification is not deleted automatically after a certain (internal calculated)
   * timeout. */
  isPreventAutoDelete: boolean;
  /** The ID of a primary menu node. If set, this menu node is selected at click onto the
   * notification message. */
  menuNodeId: string;
  /** Optionally content data, that will be distributed to the content, if a menu node ID is
   * given. */
  contentData: ContentData | null;
  /** If true, the notification is requested to delete with animation. */
  isRequestedToDelete: boolean;
}


/** The Redux state of the slice of the app module "Notification". */
export interface NotificationsState {
  /** The maximum width of the notifications inclusive the space at the left and right side. */
  maxWidth: number;
  /** Object of objects of the value entries of the notifications. */
  byId: Record<string, Notification>;
  /** Array of all keys of the existing notifications. The ID of the latest notification is at the
   * first position in the array. */
  allIds: string[];
}


export type SetNotificationAction = PayloadAction<{
  /** Optionally an ID. If not set, the notification can neither be updated nor deleted by action
   * creator deleteNotification. */
  id?: string;
  /** An optional title of the notification to display above the message. */
  title?: string;
  /** The optional notification message to display. Unicodes (like "&#10;" for line breaks) and
   * BBCodes can be used here. */
  message?: string;
  /** Optionally the name of an icon to display next to the notification message. Set to null, to
   * delete the icon. */
  icon?: string;
  /** Optionally the background color of the notification: "attention" or "attentionHigh". Without
   * one, a notification carries the glass every surface over the page has and is light whatever it
   * covers; null returns an existing notification to that glass. */
  color?: (keyof Pick<Color, 'attention' | 'attentionHigh'>) | null;
  /** Set to true, to have an additional delete button next to the message text. */
  isDeleteButton?: boolean;
  /** Set to true, to not delete the notification automatically after a certain (internal
   * calculated) timeout. */
  isPreventAutoDelete?: boolean;
  /** Optionally the ID of a primary menu node. If given, this menu node is selected at click onto
   * the notification message. Set to null, to delete an existing ID. */
  menuNodeId?: string;
  /** Optionally content data, that will be distributed to the content, if a menuNodeId is given.
   * Set to null, to delete existing content data. */
  contentData?: ContentData;
}>;
