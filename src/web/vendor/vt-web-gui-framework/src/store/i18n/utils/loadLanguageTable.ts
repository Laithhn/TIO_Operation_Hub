import type { I18nLanguageTable } from '../i18n.types';


/**
 * Async helper function to load the language table of a given URL path and convert and return the
 * result into an object.
 *
 * @param path - The full file path to the language table.
 * @param format - The format of the file of the language table: "json" or "xml".
 */
export const loadLanguageTable = async ({ path, format }: { path: string; format: string }): Promise<I18nLanguageTable> => {
  const response = await fetch(path);
  let table: I18nLanguageTable;

  if (format === 'xml') {
    // parse XML data into table object
    const data = await response.text();
    const xmlData = new DOMParser().parseFromString(data, 'application/xml');

    table = {};
    xmlData.querySelectorAll('Entry').forEach((xmlEntry) => {
      const id = xmlEntry.getAttribute('id');

      if (id) {
        table[id] = xmlEntry.textContent || '';
      }
    });
  } else {
    // copy JSON data into table object
    table = await (response.json() as Promise<I18nLanguageTable>);
  }

  return table;
};
