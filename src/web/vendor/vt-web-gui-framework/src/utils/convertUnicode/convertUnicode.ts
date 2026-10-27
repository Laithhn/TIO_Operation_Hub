/**
 * Exported function to convert and return a given decimal or hexadecimal Unciode string like
 * "\&\#160;" or "\&\#x00A0;" inside a given string into real signs.
 */
export const convertUnicode = (str: string): string => (
  (typeof str === 'string')
    ? str.replace(
      /&#(?<hexIndicator>x?)(?<code>[0-9a-f]+);/ig,
      (_, hexIndicator: string, code: string) => String.fromCharCode(
        parseInt(code, ((hexIndicator.toLowerCase() === 'x') ? 16 : 10)),
      ),
    )
    : ''
);
