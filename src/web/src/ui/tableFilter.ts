// Column filters of the hub's DataTable (ui/kit.tsx): operators, matching and the one rule for "is this criterion active".
// The badge count and the row predicate both use isCriterionActive, so the Filter (n) badge always agrees with the rows shown (GUI-09).

export type TextFilterOperator = 'starts' | 'ends' | 'contains' | 'equal' | 'empty' | 'not-starts' | 'not-ends' | 'not-contains' | 'not-equal';

export const DEFAULT_OPERATOR: TextFilterOperator = 'starts';

export const TEXT_FILTER_OPERATORS: { value: TextFilterOperator; label: string }[] = [
  { value: 'starts', label: 'Starts With' }, { value: 'ends', label: 'Ends With' }, { value: 'contains', label: 'Contains' },
  { value: 'equal', label: 'Equal' }, { value: 'empty', label: 'Empty' }, { value: 'not-starts', label: 'Does Not Start With' },
  { value: 'not-ends', label: 'Does Not End With' }, { value: 'not-contains', label: 'Does Not Contain' }, { value: 'not-equal', label: 'Not Equal' }
];

export function matchesTextFilter(text: string, value: string, operator: TextFilterOperator) {
  const a = text.trim().toLocaleLowerCase(), b = value.trim().toLocaleLowerCase();
  switch (operator) {
    case 'starts': return a.startsWith(b);
    case 'ends': return a.endsWith(b);
    case 'contains': return a.includes(b);
    case 'equal': return a === b;
    case 'empty': return a.length === 0;
    case 'not-starts': return !a.startsWith(b);
    case 'not-ends': return !a.endsWith(b);
    case 'not-contains': return !a.includes(b);
    case 'not-equal': return a !== b;
  }
}

/**
 * A criterion filters rows only when it has a value (blank and whitespace-only values do not count), or when its operator is
 * "Empty", which needs no value. Choosing an operator without a value is an incomplete criterion: it neither filters nor counts.
 */
export function isCriterionActive(value: string | undefined, operator: TextFilterOperator = DEFAULT_OPERATOR) {
  return operator === 'empty' || !!value?.trim();
}

/** An operator was chosen but the value that would apply it is still missing. */
export function isCriterionIncomplete(value: string | undefined, operator: TextFilterOperator = DEFAULT_OPERATOR) {
  return operator !== DEFAULT_OPERATOR && !isCriterionActive(value, operator);
}

export type Criteria = { values: Record<string, string>; operators: Record<string, TextFilterOperator> };

export function activeCriteriaCount(keys: string[], { values, operators }: Criteria) {
  return keys.filter(k => isCriterionActive(values[k], operators[k])).length;
}

/** True when the row's cell texts satisfy every active criterion. */
export function rowMatches(text: Record<string, string>, keys: string[], { values, operators }: Criteria) {
  return keys.every(k => !isCriterionActive(values[k], operators[k]) || matchesTextFilter(text[k] ?? '', values[k] ?? '', operators[k] ?? DEFAULT_OPERATOR));
}
