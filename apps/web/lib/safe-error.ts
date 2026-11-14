/**
 * Services throw plain Errors with friendly messages, but a database or network failure also arrives as an Error
 * and its message can include SQL, table names or connection details. Those must never reach a person.
 */
const INTERNAL = /failed query|neon|relation ".*"|column ".*"|syntax error|violates .* constraint|duplicate key|ECONN|ETIMEDOUT|fetch failed|\bparams:|\bselect\b.*\bfrom\b|\binsert into\b|\bupdate\b.*\bset\b/i;

export function safeMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (!(e instanceof Error) || !e.message) return fallback;
  if (INTERNAL.test(e.message)) {
    console.error("internal error hidden from user:", e);
    return fallback;
  }
  return e.message;
}
