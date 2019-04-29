import { GREATER_THAN_RANGE_CODE, INVALID_TYPESCRIPT_VERSION, LESS_THAN_RANGE_CODE } from './config';
import { ReportMessageList } from './types';

export const reportMessageList: ReportMessageList = {
  log: {
    [INVALID_TYPESCRIPT_VERSION]: `Invalid TypeScript version detected. TypeScript 3.x required.`,
  },

  errors: {
    [LESS_THAN_RANGE_CODE]: (name: TemplateStringsArray | string) =>
      (value: TemplateStringsArray | string) =>
        (minValue: TemplateStringsArray | string) =>
          `Value of the "${name}" variable is less than minimal value of the specified range.\nYou specifiy "${value}" but minimal value is "${minValue}".`,

    [GREATER_THAN_RANGE_CODE]: (name: TemplateStringsArray | string) =>
      (value: TemplateStringsArray | string) =>
        (maxValue: TemplateStringsArray | string) =>
          `Value of the "${name}" variable is greater than maximal value of the specified range.\nYou specified "${value}" but maximal value is "${maxValue}".`,
  }
};
