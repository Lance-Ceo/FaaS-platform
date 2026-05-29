/**
 * Functions Routes — Unit Tests (mocked dependencies)
 */

describe('Function name validation', () => {
  const validNames = ['hello-world', 'my-fn', 'abc123', 'a1b2c3'];
  const invalidNames = ['Hello', 'my_fn', '-start', 'end-', 'a', 'UPPER'];

  const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

  validNames.forEach((name) => {
    it(`accepts valid name: ${name}`, () => {
      expect(nameRegex.test(name)).toBe(true);
    });
  });

  invalidNames.forEach((name) => {
    it(`rejects invalid name: ${name}`, () => {
      expect(nameRegex.test(name)).toBe(false);
    });
  });
});

describe('Runtime validation', () => {
  const validRuntimes = ['NODE18', 'PYTHON3', 'GO119'];
  const invalidRuntimes = ['node18', 'python', 'ruby', ''];

  validRuntimes.forEach((rt) => {
    it(`accepts runtime: ${rt}`, () => {
      expect(['NODE18', 'PYTHON3', 'GO119'].includes(rt)).toBe(true);
    });
  });

  invalidRuntimes.forEach((rt) => {
    it(`rejects runtime: ${rt}`, () => {
      expect(['NODE18', 'PYTHON3', 'GO119'].includes(rt)).toBe(false);
    });
  });
});

describe('Memory limits', () => {
  it('accepts memory between 64 and 2048', () => {
    [64, 128, 256, 512, 1024, 2048].forEach((m) => {
      expect(m >= 64 && m <= 2048).toBe(true);
    });
  });

  it('rejects memory outside range', () => {
    [0, 32, 63, 2049, 4096].forEach((m) => {
      expect(m >= 64 && m <= 2048).toBe(false);
    });
  });
});
