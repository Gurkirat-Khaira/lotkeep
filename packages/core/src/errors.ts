// AppError and the API error envelope: { error, message?, details?, requestId }. Never a stack.
import { redactDeep } from "./redact";

export type ErrorStatus = 400 | 401 | 402 | 403 | 404 | 409 | 413 | 422 | 429 | 500;

export type ErrorBody = {
  error: string;
  message?: string;
  details?: unknown;
  requestId: string;
};

const SNAKE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export class AppError extends Error {
  override readonly name = "AppError";
  readonly code: string;
  readonly status: ErrorStatus;
  readonly details?: unknown;
  /** True when `message` is safe to show the client (set only by the helpers' message argument). */
  readonly expose: boolean;

  constructor(code: string, status: ErrorStatus, message?: string, details?: unknown) {
    if (!SNAKE.test(code)) throw new Error(`AppError code must be snake_case: ${code}`);
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.expose = message !== undefined && status !== 500; // a 500 never shows its message
    if (details !== undefined) this.details = details;
  }
}

export const notFound = (message?: string) => new AppError("not_found", 404, message);
export const forbidden = (code = "forbidden", message?: string) => new AppError(code, 403, message);
export const conflict = (code = "conflict", message?: string) => new AppError(code, 409, message);
export const invalid = (details: unknown, message?: string) =>
  new AppError("invalid_input", 422, message, details);

/** Builds the response body. Only explicit messages and details leave the server. */
export function toErrorBody(e: AppError, requestId: string): ErrorBody {
  const body: ErrorBody = { error: e.code, requestId };
  if (e.expose) body.message = e.message;
  if (e.details !== undefined) body.details = redactDeep(e.details);
  return body;
}
