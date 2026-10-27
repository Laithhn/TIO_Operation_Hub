import { Children } from 'react';

import defines from 'assets/defines';
import Link from 'components/controls/link';


/**
 *
 */
class Tag {
  static tagRegExp = /^\[(\/?)(b|i|u|s|mark|sup|sub|code|color|link)([\s=:].*)?\]$/i;
  #tagName;
  #tagValue;
  #params;
  #text;
  #parent;
  #children;


  constructor({ tagName, text, parent } = {}) {
    this.#tagName = tagName || null;
    this.#tagValue = '';
    this.#params = {};

    const addParam = (keyChars, valueChars) => {
      const key = keyChars.join('').trim();
      const value = valueChars.join('').trim() || true;

      if (key.toLowerCase() === this.#tagName) {
        this.#tagValue = value;
      } else {
        this.#params[key] = value;
      }
    };

    if (this.#tagName && text) {
      let keyChars = [],
        valueChars = [],
        target = keyChars,
        terminate = ' ';

      Array.from(text.slice(1, -1)).forEach((c) => {
        if ((target === keyChars) && ((c === '=') || (c === ':'))) {
          target = valueChars;
        } else if (!valueChars.length && c === '"') {
          terminate = c;
        } else if (c !== terminate) {
          target.push(c);
        } else {
          addParam(keyChars, valueChars);

          keyChars = [];
          valueChars = [];
          target = keyChars;
          terminate = ' ';
        }
      });

      addParam(keyChars, valueChars);
    } else {
      this.#text = text ?? '';
    }

    this.#parent = parent || null;
    this.#children = [];
  }


  /**
   * Static method to split an input into an array of parts with BBCode strings and the strings
   * between.
   */
  static splitToTokens = (input) => input.split(/(\[\/?.+?\])/);


  /**
   * Static method
   */
  static parseToken = (token) => {
    const parts = token.match(Tag.tagRegExp);

    if (Array.isArray(parts) && (parts.length > 2)) {
      return {
        tagName: parts[2].toLowerCase(),
        isClosingTag: (parts[1] === '/'),
      };
    }

    return {};
  };


  /**
   * Private method to return all contents of this tag combined to a raw or to a string with HTML
   * elements (default).
   */
  #getContent = () => this.#children.reduce((acc, child) => [
    ...acc,
    child.toText(),
  ], this.#text ? [this.#text] : []).join('');


  /**
   * Private method
   */
  #getReactComponents = () => Children.toArray(this.#children.reduce((acc, child) => [
    ...acc,
    child.toReact(),
  ], this.#text ? [this.#text] : []));


  getTagName = () => this.#tagName;
  getParent = () => this.#parent;


  /**
   * Public method
   */
  addChild = (child) => {
    this.#children.push(child);
  };


  /**
   * Public method
   */
  toText = () => {
    const pieces = [];

    if (this.#tagName) {
      let params = Object.keys(this.#params).map((paramName) => `${paramName}=${this.#params[paramName]}`).join(' ');
      params = params ? ` ${params}` : '';

      if (this.#tagValue) {
        pieces.push(`[${this.#tagName}=${this.#tagValue}${params}]`);
      } else {
        pieces.push(`[${this.#tagName}${params}]`);
      }
    }

    pieces.push(this.#getContent());

    if (this.#tagName) {
      pieces.push(`[/${this.#tagName}]`);
    }

    return pieces.join('');
  };


  /**
   * Public method
   */
  toReact = () => {
    switch (this.#tagName) {
      case 'b': return (<strong {...this.#params}>{this.#getReactComponents()}</strong>);
      case 'i': return (<em {...this.#params}>{this.#getReactComponents()}</em>);
      case 'u': return (<u {...this.#params}>{this.#getReactComponents()}</u>);
      case 's': return (<s {...this.#params}>{this.#getReactComponents()}</s>);
      case 'mark': return (<mark {...this.#params}>{this.#getReactComponents()}</mark>);
      case 'sup': return (<sup {...this.#params}>{this.#getReactComponents()}</sup>);
      case 'sub': return (<sub {...this.#params}>{this.#getReactComponents()}</sub>);
      case 'code': return (<code {...this.#params}>{this.#getReactComponents()}</code>);

      case 'color': {
        const colorName = this.#tagValue;
        const { darkTheme, ...restParams } = this.#params;
        const color = defines.typo.color[darkTheme ? 'light' : 'dark'][colorName];

        return color
          ? (<span {...restParams} style={{ color }}>{this.#getReactComponents()}</span>)
          : this.#getReactComponents();
      }

      case 'link': {
        const link = this.#tagValue || this.#getContent().trim();

        return link
          ? (<Link to={link}>{this.#getReactComponents()}</Link>)
          : this.#getReactComponents();
      }

      default:
        return this.#getReactComponents();
    }
  };
}

export default Tag;
