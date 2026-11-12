// Minimal sandbox stand-in for vitest's describe/it/expect.
let failures = 0, passes = 0; const queue: Promise<void>[] = []; let prefix = '';
export function describe(name: string, fn: () => void) { const prev = prefix; prefix = prefix + name + ' › '; fn(); prefix = prev; }
export function it(name: string, fn: () => void | Promise<void>) {
  const full = prefix + name;
  queue.push(Promise.resolve().then(fn).then(() => { passes++; console.log('  ✓', full); }, (e) => { failures++; console.log('  ✗', full, '\n     ', e.message); }));
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function expect(actual: any) {
  const fail = (m: string) => { throw new Error(m); };
  const api = {
    toBe: (e: unknown) => Object.is(actual, e) || fail(`expected ${JSON.stringify(actual)} to be ${JSON.stringify(e)}`),
    toEqual: (e: unknown) => eq(actual, e) || fail(`expected ${JSON.stringify(actual)} to equal ${JSON.stringify(e)}`),
    toContain: (e: string) => actual.includes(e) || fail(`expected text to contain «${e}»`),
    toBeTruthy: () => !!actual || fail(`expected ${JSON.stringify(actual)} to be truthy`),
    toBeGreaterThan: (e: number) => actual > e || fail(`expected ${actual} > ${e}`),
    not: { toContain: (e: string) => !actual.includes(e) || fail(`expected text NOT to contain «${e}»`) },
  };
  return api;
}
export async function report() { await Promise.all(queue); console.log(`\n${passes} passed, ${failures} failed`); if (failures) process.exit(1); }
