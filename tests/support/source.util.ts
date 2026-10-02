export function dedent(code: string): string {
  const lines = code.replace(/^\s*\n|\n\s*$/g, '').split('\n');
  const indentation = Math.min(
    ...lines
      .filter((line) => line.trim().length > 0)
      .map((line) => line.length - line.trimStart().length),
  );

  return lines.map((line) => line.slice(indentation)).join('\n');
}
