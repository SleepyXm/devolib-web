export const withRetry = (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
  return setTimeout(fn, delay);
};