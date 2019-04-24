import * as ts from 'typescript/lib/tsserverlibrary';

export function getHash(source: string) {
    let hash = 0;

    if (source.length !== 0) {
        for (let char of source) {
            hash = (hash << 5) - hash + char.charCodeAt(0);
            hash |= 0;
        }
    }

    return hash;
}

export function isValidTypeScriptVersion(typescript: typeof ts) {
    const [ major ] = typescript.version.split('.');

    return +major >= 3;
}
