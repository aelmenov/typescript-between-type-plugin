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
