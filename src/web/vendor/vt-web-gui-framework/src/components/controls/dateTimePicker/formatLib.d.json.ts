import type { FormatId } from './dateTimePicker.types';


declare const formatLib: Readonly<Record<string, {
  id: FormatId;
  minValue?: number;
  maxValue?: number;
  numDigits: number;
  phC: string;
  translatePhC: boolean;
}>>;


export default formatLib;
