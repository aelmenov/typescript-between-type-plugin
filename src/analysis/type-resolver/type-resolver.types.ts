import type ts from 'typescript';

export type Problem = (node: ts.Node, message: string) => void;
