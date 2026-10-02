import type { Shape } from '../domain/domain.types.js';

export interface Resolution {
  readonly shape: Shape;
  readonly depth: number;
}
