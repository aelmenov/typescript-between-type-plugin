import ts from 'typescript';
import type {
  Message,
  Report,
  UnknownValues,
} from '../analyzer/analyzer.types.js';

export class Diagnostics {
  private readonly reported = new Set<string>();

  constructor(
    private readonly source: ts.SourceFile,
    private readonly report: Report,
    readonly unknownValues: UnknownValues,
  ) {}

  emit(node: ts.Node, message: Message, data: Record<string, string>): void {
    if (node.getSourceFile() !== this.source) return;
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      node = node.expression;

    const key = `${node.pos}:${node.end}:${message}:${JSON.stringify(data)}`;

    if (this.reported.has(key)) return;

    this.reported.add(key);
    this.report(node, message, data);
  }
}
