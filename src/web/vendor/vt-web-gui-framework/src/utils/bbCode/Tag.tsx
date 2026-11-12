import { cloneElement, Fragment, isValidElement } from 'react';

import { getTypoColorClass, type TypoColorKeys } from 'assets/styles';
import { Link } from 'components/controls/link';
import { classNames } from 'utils/classNames';

import * as css from './tag.scss';


class Tag {
  static #tagRegExp = /^\[(?<closingTag>\/?)(?<tagName>b|i|u|s|mark|sup|sub|code|color|link|br)(?<tagValueAndParams>[\s=:].*)?(?<selfClosingTag>\/?)]$/i;
  #tagName: string | null;
  #tagValue: string | true = true;
  #params: Record<string, string | true> = {};
  #text = '';
  #parent: Tag | null;
  #children: Tag[] = [];


  constructor({ tagName, tagStr, parent }: { tagName?: string; tagStr?: string; parent?: Tag } = {}) {
    this.#tagName = tagName || null;


    const addParam = (tagChars: string[], valueChars: string[]) => {
      const key = tagChars.join('').trim();
      const value = valueChars.join('').trim() || true;

      if (key.toLowerCase() === this.#tagName) {
        this.#tagValue = value;
      } else {
        this.#params[key] = value;
      }
    };


    if (this.#tagName && tagStr) {
      let keyChars: string[] = [],
        valueChars: string[] = [],
        target = keyChars,
        terminate = ' ';

      // the tag string is the complete tag inclusive "[" and "]" and everything between (tag name,
      // value, parameters): "[tagName=tagValue param1=value1 param2:value2 param3="value3"]". The
      // tagValue and the parameter values are optional. If not given, they are set to true.
      Array.from(tagStr.slice(1, -1)).forEach((c) => {
        if ((target === keyChars) && ((c === '=') || (c === ':'))) {
          target = valueChars;
        } else if (!valueChars.length && c === '"') {
          terminate = c;
        } else if (c === terminate) {
          addParam(keyChars, valueChars);

          keyChars = [];
          valueChars = [];
          target = keyChars;
          terminate = ' ';
        } else {
          target.push(c);
        }
      });

      addParam(keyChars, valueChars);
    } else {
      this.#text = tagStr ?? '';
    }

    this.#parent = parent ?? null;
  }


  /**
   * Private method to return all contents of this tag combined to a raw or to a string with HTML
   * elements (default).
   */
  #getContent = (): string => this.#children.reduce((acc, child) => [
    ...acc,
    child.toText(),
  ], this.#text ? [this.#text] : []).join('');


  /**
   * Private method to combine all contents of this tag (text and children) to an array of React
   * nodes. Each node gets an explicit, stable key based on its position, so that React does not
   * complain about missing keys when the array is rendered as a list. Note that React.Children.toArray
   * is not sufficient here, as its generated keys do not satisfy React 19's key validation.
   */
  #getReactComponents = (): React.ReactNode[] => (
    this.#children.reduce((acc: React.ReactNode[], child) => [
      ...acc,
      child.toReact(),
    ], this.#text ? [this.#text] : []).map((node, index) => (
      isValidElement(node)
        ? cloneElement(node, { key: index }) // eslint-disable-line react/no-array-index-key
        : <Fragment key={index}>{node}</Fragment> // eslint-disable-line react/no-array-index-key
    ))
  );


  /**
   * Static method to split a given input into an array of parts with BBCode strings and the strings
   * between (tokens).
   */
  static splitToTokens = (input: string): string[] => input.split(/(?<sep>\[\/?.+?\/?])/);


  /**
   * Static method to parse a given token into an object with the name of the tag and boolean flags
   * wheather it is a closing tag, a self-closing tag or not. If the token is not a BBCode token, an
   * empty object is returned.
   */
  static parseToken = (token: string): { tagName?: string; isClosingTag?: boolean; isSelfClosingTag?: boolean } => {
    const { closingTag, tagName, selfClosingTag } = token.match(Tag.#tagRegExp)?.groups ?? {};

    if (tagName) {
      const isClosingTag = (closingTag === '/');

      return {
        tagName: tagName.toLowerCase(),
        isClosingTag,
        isSelfClosingTag: !isClosingTag && (selfClosingTag === '/'),
      };
    }

    return {};
  };


  getTagName = () => this.#tagName;
  getParent = () => this.#parent;


  /**
   * Public method
   */
  addChild = (child: Tag): void => {
    this.#children.push(child);
  };


  /**
   * Public method
   */
  toText = (): string => {
    const pieces = [];

    if (this.#tagName) {
      let params = Object.keys(this.#params).map((paramName) => `${paramName}=${this.#params[paramName]}`).join(' ');
      params = params ? ` ${params}` : '';

      if (typeof this.#tagValue === 'string') {
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
  toReact = (): React.ReactNode => {
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
        // the colour's class takes the form for the ground the text sits on
        const colorClass = getTypoColorClass(css, this.#tagValue as TypoColorKeys);

        return (<span {...this.#params} className={classNames(css.color, colorClass)}>{this.#getReactComponents()}</span>);
      }

      case 'link': {
        const link = (typeof this.#tagValue === 'string') ? this.#tagValue : this.#getContent().trim();

        return link ? (<Link to={link}>{this.#getReactComponents()}</Link>) : this.#getReactComponents();
      }

      case 'br': return (<br />);

      default:
        return this.#getReactComponents();
    }
  };
}


export { Tag };
