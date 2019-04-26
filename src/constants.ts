export const PLUGIN_NAME = 'typescript-between-type-plugin';

export const INVALID_TYPESCRIPT_VERSION = 0xf000;
export const LESS_THAN_RANGE_CODE = 0xf101;
export const GREATER_THAN_RANGE_CODE = 0xf102;

export const BETWEEN_TYPE_IN_STRING_REGEX = /Between\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>/g;
export const BETWEEN_TYPE_REGEX = /^Between\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>$/;
export const BETWEEN_VALUE_REGEX = /[\-]?([\d]+|Infinity){1}/g;
