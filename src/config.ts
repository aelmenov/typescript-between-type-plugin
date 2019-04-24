import { Reports } from './types';

export const PLUGIN_NAME = 'typescript-nrange-type-plugin';

export const OUT_OF_RANGE_CODE = 0xf101;

export const reports: Reports = {
    errors: {
        [OUT_OF_RANGE_CODE]: `Some error.`
    }
}
