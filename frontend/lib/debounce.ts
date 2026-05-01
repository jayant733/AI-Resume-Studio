export default function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), waitMs);
  };
}

