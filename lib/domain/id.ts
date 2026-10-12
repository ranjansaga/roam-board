/** Stable client/server id generation. */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
