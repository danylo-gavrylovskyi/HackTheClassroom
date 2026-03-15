/**
 * Next.js instrumentation — запускається першим на сервері.
 *
 * Проблема: Node.js 22+ має вбудований глобальний `localStorage`,
 * але без прапора --localstorage-file=/valid/path він існує як
 * зламаний об'єкт (getItem не є функцією). Next.js 15 намагається
 * використати його і падає з TypeError.
 *
 * Рішення: замінюємо поламаний localStorage на справжній in-memory
 * Storage ще до того як будь-який код Next.js до нього доторкнеться.
 */
export async function register() {
    if (
        typeof globalThis.localStorage !== "undefined" &&
        typeof (globalThis.localStorage as Storage).getItem !== "function"
    ) {
        const store: Record<string, string> = {};

        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            writable: true,
            value: {
                getItem(key: string): string | null {
                    return Object.prototype.hasOwnProperty.call(store, key)
                        ? store[key]
                        : null;
                },
                setItem(key: string, value: string): void {
                    store[key] = String(value);
                },
                removeItem(key: string): void {
                    delete store[key];
                },
                clear(): void {
                    Object.keys(store).forEach((k) => delete store[k]);
                },
                key(index: number): string | null {
                    return Object.keys(store)[index] ?? null;
                },
                get length(): number {
                    return Object.keys(store).length;
                },
            } satisfies Storage,
        });
    }
}
