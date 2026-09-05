/**
 * jsdom does not implement ResizeObserver and all offset* dimensions are 0.
 * The virtualizer's calculateRange returns null when the viewport size is 0,
 * producing zero virtual items. This stub fires the callback synchronously
 * with realistic dimensions so rows render in the test environment.
 */
export class ResizeObserverStub {
  private callback: (entries: unknown[]) => void;

  constructor(callback: (entries: unknown[]) => void) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback([
      {
        target,
        borderBoxSize: [{ inlineSize: 1200, blockSize: 800 }],
        contentBoxSize: [{ inlineSize: 1200, blockSize: 800 }],
      },
    ]);
  }

  unobserve() {}
  disconnect() {}
}
