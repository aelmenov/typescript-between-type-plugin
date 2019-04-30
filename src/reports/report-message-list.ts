import { RangeList } from '../between/types';
import { ASSIGNABLE_GREATER_THAN_RANGE_CODE, ASSIGNABLE_LESS_THAN_RANGE_CODE, INVALID_TYPESCRIPT_VERSION } from './config';
import { ReportMessageList } from './types';

export const reportMessageList: ReportMessageList = {
  log: {
    [INVALID_TYPESCRIPT_VERSION]: `Invalid TypeScript version detected. TypeScript 3.x required.`,
  },

  errors: {
    [ASSIGNABLE_LESS_THAN_RANGE_CODE]: (value: TemplateStringsArray | string) =>
      (minValue: TemplateStringsArray | string) =>
        (ranges: RangeList) =>
          getMessageOfTheOutOfRange('less', value, minValue, ranges),

    [ASSIGNABLE_GREATER_THAN_RANGE_CODE]: (value: TemplateStringsArray | string) =>
      (maxValue: TemplateStringsArray | string) =>
        (ranges: RangeList) =>
          getMessageOfTheOutOfRange('greater', value, maxValue, ranges),
  }
};

function getMessageOfTheOutOfRange(
  comparison: TemplateStringsArray | string,
  value: TemplateStringsArray | string,
  availableValue: TemplateStringsArray | string,
  ranges: RangeList
) {
  const type = ranges.map(x => `Between<${x.join(', ')}>`).join(' | ');

  return `Value '${value}' is not assignable to type '${type}'.\nYour value is ${comparison} than '${availableValue}'.`;
}
