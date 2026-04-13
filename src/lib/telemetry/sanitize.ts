export function truncate(input: string, maxLen: number) {
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen);
}

export function sanitizeStack(stack: string | undefined | null) {
  if (!stack) return undefined;
  return truncate(stack, 20000);
}

export function sanitizeMessage(message: string | undefined | null) {
  if (!message) return undefined;
  return truncate(message, 2000);
}

