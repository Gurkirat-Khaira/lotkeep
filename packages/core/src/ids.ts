// Primary keys are UUIDv7: time-ordered, so B-tree indexes stay compact and cursors sort by time.
import { v7 } from "uuid";

export const newId = (): string => v7();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for a canonical UUID string (any version). Use before passing ids to SQL settings. */
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);
