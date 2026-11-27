// Time comes only from an injected Clock. Domain code never calls Date.now() / new Date() for "now".

export interface Clock {
  now(): Date;
}

/** The real clock. The only place in domain code that reads system time. */
export const SystemClock: Clock = {
  now: () => new Date(Date.now()),
};

/** A clock frozen at `at` (ISO-8601), moved forward only by `advance`. For tests. */
export class FixedClock implements Clock {
  #ms: number;

  constructor(at: string) {
    const ms = Date.parse(at);
    if (Number.isNaN(ms)) throw new Error(`FixedClock: invalid timestamp ${JSON.stringify(at)}`);
    this.#ms = ms;
  }

  now(): Date {
    return new Date(this.#ms);
  }

  advance(ms: number): this {
    if (!Number.isFinite(ms)) throw new Error("FixedClock.advance: ms must be finite");
    this.#ms += ms;
    return this;
  }
}
