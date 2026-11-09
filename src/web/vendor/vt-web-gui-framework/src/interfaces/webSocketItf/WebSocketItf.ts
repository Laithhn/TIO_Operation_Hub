import { getType, isNonEmptyString, isNumber } from 'utils/type';

import {
  type Listener, WebSocketListener, type WebSocketMetadata, WebSocketStatus,
} from './webSocketItf.types';


// The longest delay the automatic re-opening grows to, unless the configured delay is longer.
const maxAutoReconnectDelayMs = 60_000;


/**
 * Class to handle a WebSocket connection to a server using the JavaScript WebSocket object.
 */
class WebSocketItf {
  static #listeners = {
    [WebSocketListener.onStatusChanged]: new Set<Listener[WebSocketListener.onStatusChanged]>(),
    [WebSocketListener.onSend]: new Set<Listener[WebSocketListener.onSend]>(),
    [WebSocketListener.onMessage]: new Set<Listener[WebSocketListener.onMessage]>(),
    [WebSocketListener.onError]: new Set<Listener[WebSocketListener.onError]>(),
  };

  #url: string;
  #isAutoReconnectEnabled: boolean;
  #autoReconnectTimeMs = 0;
  #meta: WebSocketMetadata;

  #connection: WebSocket | null = null;
  #status: WebSocketStatus = WebSocketStatus.closed;
  // True once the connection has been open, which rules out its certificate as the cause of a
  // later error.
  #hasOpened = false;
  #nextAutoReconnectTimestamp = 0;
  #autoReconnectTimeout: ReturnType<typeof setTimeout> | number = 0;
  #autoReconnectDelayMs = 0;


  /**
   * Constructor to create a new WebSocket connection.
   */
  constructor(meta: WebSocketMetadata) {
    if (!isNonEmptyString(meta.url)) {
      throw new Error('VIWGF/interfaces/webSocketItf: the given URL to create a WebSocket connection is not a valid string.');
    }

    this.#url = meta.url;
    this.#isAutoReconnectEnabled = isNumber(meta.autoReconnect, { withoutInfinite: true, gte: 0 });
    this.#autoReconnectTimeMs = this.#isAutoReconnectEnabled ? (meta.autoReconnect as number) : 0;
    this.#autoReconnectDelayMs = this.#autoReconnectTimeMs;
    this.#meta = meta;
  }


  /**
   * Public static method to check if a given WebSocket ID is valid.
   */
  static isValidId(id: unknown) {
    return isNonEmptyString(id);
  }


  /**
   * Public static method to add a listener function for a given listening type.
   */
  static addListener<T extends WebSocketListener>(type: T, listener: Listener[T]) {
    // @ts-expect-error ToDo: generic does not work here
    WebSocketItf.#listeners[type].add(listener);
  }


  /**
   * Public static method to remove a listener function if exists, that was previously registered
   * with the static method addListener.
   */
  static removeListener<T extends WebSocketListener>(type: T, listener: Listener[T]) {
    // @ts-expect-error ToDo: generic does not work here
    WebSocketItf.#listeners[type].delete(listener);
  }


  /**
   * Private method to call all listeners of the given type with the given data.
   */
  #callListeners<T extends WebSocketListener>(type: T, data: Parameters<Listener[T]>[0]) {
    WebSocketItf.#listeners[type].forEach((listener) => {
      // @ts-expect-error ToDo: generic does not work here
      listener(data, this.#meta);
    });
  }


  /**
   * Private method to handle the re-opening of the connection, if enabled and if its status is
   * CLOSED or ERROR. Each attempt waits twice as long as the one before, up to a minute or the
   * configured delay if that is longer, so that a connection that keeps failing, on an untrusted
   * certificate for one, does not retry at a fixed rate forever. An opened connection starts again
   * from the configured delay.
   */
  #reconnect() {
    if (
      this.#isAutoReconnectEnabled
      && ((this.#status === WebSocketStatus.closed) || (this.#status === WebSocketStatus.error))
    ) {
      if (!this.#nextAutoReconnectTimestamp) {
        this.#nextAutoReconnectTimestamp = Date.now() + this.#autoReconnectDelayMs;

        this.#autoReconnectTimeout = setTimeout(() => {
          this.open();
        }, this.#autoReconnectDelayMs);

        // A configured delay of 0 retries at once the first time, and after a second the next.
        this.#autoReconnectDelayMs = Math.min(
          Math.max(this.#autoReconnectDelayMs * 2, 1000),
          Math.max(this.#autoReconnectTimeMs, maxAutoReconnectDelayMs),
        );
      }
    } else {
      clearTimeout(this.#autoReconnectTimeout);
      this.#nextAutoReconnectTimestamp = 0;
    }
  }


  /**
   * Private method to investigate the status of the WebSocket connection. If a next status is given
   * as argument, take this one, otherwise get it from the WebSocket connection itself. If the
   * WebSocket is not connected, set the status to CLOSED. If the resulting status changed, call all
   * listeners of type "onStatusChange".
   */
  #setStatus(givenStatus?: WebSocketStatus): WebSocketStatus {
    let nextStatus: WebSocketStatus;

    if (givenStatus) {
      nextStatus = givenStatus;
    } else if (!this.#connection) {
      nextStatus = WebSocketStatus.closed;
    } else {
      switch (this.#connection.readyState) {
        case 0: nextStatus = WebSocketStatus.connecting; break;
        case 1: nextStatus = WebSocketStatus.open; break;
        case 2: nextStatus = WebSocketStatus.closing; break;
        case 3: nextStatus = WebSocketStatus.closed; break;
        default: nextStatus = WebSocketStatus.error; break;
      }
    }

    if (nextStatus !== this.#status) {
      this.#status = nextStatus;
      this.#reconnect();
      this.#callListeners(WebSocketListener.onStatusChanged, { status: this.#status, nextAutoReconnect: this.#nextAutoReconnectTimestamp });
    }

    return this.#status;
  }


  /**
   * Public method to open the WebSocket connection if not already done.
   */
  open() {
    if (
      !this.#connection
      || (this.#status === WebSocketStatus.closed)
      || (this.#status === WebSocketStatus.error)
    ) {
      try {
        this.#connection = new WebSocket(this.#url);
        this.#setStatus();

        // WebSocket event: connection is opened.
        this.#connection.onopen = () => {
          this.#hasOpened = true;
          this.#autoReconnectDelayMs = this.#autoReconnectTimeMs;
          this.#setStatus();

          // WebSocket event: receiving a new message. If it is a JSON string then it is tried to
          // converted it into an object.
          this.#connection!.onmessage = (event) => {
            if (this.#setStatus() === WebSocketStatus.open) {
              let msg: unknown;

              if (typeof event.data === 'string') {
                try {
                  msg = JSON.parse(event.data);
                } catch {
                  msg = event.data;
                }
              } else {
                msg = event.data;
              }

              this.#callListeners(WebSocketListener.onMessage, msg);
            }
          };

          // WebSocket event: connection was closed.
          this.#connection!.onclose = () => {
            this.#setStatus();
          };
        };

        // WebSocket event: an error occured. A browser reports no cause, but a "wss:" connection
        // that has never been open may have failed on its certificate, so its text names that.
        this.#connection.onerror = () => {
          const text = (!this.#hasOpened && /^wss:/i.test(this.#url))
            ? `The WebSocket connection to "${this.#url}" failed before it was ever open. Likely causes are a server certificate the browser does not trust - Safari never extends an exception granted on its warning page to a WebSocket - or a server that cannot be reached.`
            : `An error, e.g. an interruption of the connection, occured at the WebSocket connection to "${this.#url}".`;

          this.#setStatus(WebSocketStatus.error);
          this.#callListeners(WebSocketListener.onError, { timestamp: Date.now(), title: 'WebSocketConnection > open', text });
        };
      } catch (e) {
        this.#setStatus(WebSocketStatus.error);
        this.#callListeners(WebSocketListener.onError, { timestamp: Date.now(), title: 'WebSocketConnection > open', text: `Trying to open and handle a WebSocket connection to "${this.#url}" failed: ${(e instanceof Error) ? e.message : String(e)}` });
      }
    }
  }


  /**
   * Public method to close the WebSocket connection.
   */
  close() {
    this.#connection?.close();
    this.#setStatus();
  }


  /**
   * Public method to enable or disable the feature to re-open the WebSocket connection
   * automatically after the status changed to CLOSED or ERROR.
   *
   * @param value - Set to true to enable or to false to disable.
   */
  setAutoReconnect(value: boolean) {
    if (value !== this.#isAutoReconnectEnabled) {
      this.#isAutoReconnectEnabled = value;
      this.#reconnect();
      this.#callListeners(WebSocketListener.onStatusChanged, { status: this.#status, nextAutoReconnect: this.#nextAutoReconnectTimestamp });
    }
  }


  /**
   * Public method to send a message to the WebSocket server. The WebSocket connection must be open.
   * The given data is converted into a JSON string before sending, unless it is an ArrayBuffer, a
   * Blob, an ArrayBufferView (Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
   * Int32Array, Uint32Array, Float32Array, Float64Array, DataView), or if it is a string and raw is
   * set to true.
   *
   * @param data - The data to send.
   * @param raw - If set to true (default: false), a given string is not converted into a
   *   stringified JSON string.
   */
  send(data: unknown, raw = false) {
    if (this.#connection && (this.#status === WebSocketStatus.open)) {
      if (
        (raw && (typeof data === 'string'))
        || ['arraybuffer', 'blob', 'int8array', 'uint8array', 'uint8clampedarray', 'int16array', 'uint16array', 'int32array', 'uint32array', 'float32array', 'float64array', 'dataview'].includes(getType(data))
      ) {
        this.#connection.send(data as string | Blob | BufferSource);
        this.#callListeners(WebSocketListener.onSend, data);
      } else {
        try {
          this.#connection.send(JSON.stringify(data));
          this.#callListeners(WebSocketListener.onSend, data);
        } catch {
          this.#callListeners(WebSocketListener.onSend, { timestamp: Date.now(), title: 'WebSocketConnection > send', text: `Given data couldn't be sent to "${this.#url}" because it's not serializable. Its type is "${getType(data)}".` });
        }
      }
    }
  }
}


export { WebSocketItf };
