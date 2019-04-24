import { TypeNode } from 'typescript';

export class NRange {
    public static REXEX = /^nrange\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>$/;
    public static NUMBER_REXEX = /[\-]?([\d]+|Infinity){1}/g;

    private readonly _node: TypeNode;
    private readonly _types: string[];
    private _range: [ number, number ];

    constructor(node: TypeNode) {
        this._node = node;
        this._types = node.getText().trim().split('|');
    }

    public getRange() {
        if (!this._range) this.calculateRange();

        return this._range;
    }

    private calculateRange() {
        let min = 0;
        let max = 0;

        this._types.forEach(type => {
            if (NRange.REXEX.test(type)) {
                const parsedRange = type.match(NRange.NUMBER_REXEX);

                if (parsedRange && parsedRange.length === 2) {
                    let [ start, end ] = parsedRange.map(x => +x);

                    if (end < start) {
                        [ start, end ] = [ end, start ];
                    }

                    if (start < min) min = start;
                    if (end > max) max = end;
                }
            }
        });

        this._range = [ min, max ];
    }
}
