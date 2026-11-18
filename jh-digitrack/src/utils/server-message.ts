/**
 * The last message in a Frappe error response's `_server_messages`, as plain
 * text. Works on the raw response body and on the error object frappe-js-sdk
 * throws, which copies the response body's keys.
 */
export function serverMessage(payload: unknown): string | undefined {
  const raw = (payload as { _server_messages?: string } | null | undefined)?._server_messages;
  if (!raw) return undefined;
  try {
    const last = (JSON.parse(raw) as string[]).at(-1);
    if (!last) return undefined;
    let message = last;
    try {
      message = (JSON.parse(last) as { message?: string }).message ?? last;
    } catch {
      // Already a plain string.
    }
    return new DOMParser().parseFromString(message, "text/html").body.textContent?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** The server's message for a failed call, or `fallback` when it sent none. */
export const errorMessage = (error: unknown, fallback: string) => serverMessage(error) || fallback;
