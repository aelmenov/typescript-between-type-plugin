"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getHash(source) {
    let hash = 0;
    if (source.length !== 0) {
        for (let char of source) {
            hash = (hash << 5) - hash + char.charCodeAt(0);
            hash |= 0;
        }
    }
    return hash;
}
exports.getHash = getHash;
function isValidTypeScriptVersion(typescript) {
    const [major] = typescript.version.split('.');
    return +major >= 3;
}
exports.isValidTypeScriptVersion = isValidTypeScriptVersion;
