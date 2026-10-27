/**
 * Exported function to dispatch a custom event to the document to indicate changes on the DOM.
 */
const dispatchDomChangeEvent = () => {
  const domChangeEvent = new CustomEvent('domChange', {
    detail: {},
  });

  document.dispatchEvent(domChangeEvent);
};

export default dispatchDomChangeEvent;
