/**
 * Sample Test Suite
 *
 * This is a placeholder test suite to verify that the Jest configuration
 * is working correctly. It will be removed once actual tests are added.
 */

import { testUtils } from './setup';

describe('Test Environment', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to test utilities', () => {
    const id = testUtils.randomId();
    expect(id).toMatch(/^test-/);
  });

  it('should have environment variables configured', () => {
    expect(process.env['NODE_ENV']).toBe('test');
    expect(process.env['SKYFI_API_KEY']).toBeDefined();
  });

  it('should support async tests', async () => {
    await testUtils.wait(10);
    expect(true).toBe(true);
  });
});

describe('TypeScript Configuration', () => {
  it('should support strict type checking', () => {
    const value: string = 'test';
    expect(typeof value).toBe('string');
  });

  it('should support modern JavaScript features', () => {
    const obj = { a: 1, b: 2 };
    const spread = { ...obj, c: 3 };
    expect(spread).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should support async/await', async () => {
    const asyncFn = async (): Promise<string> => Promise.resolve('success');
    const result = await asyncFn();
    expect(result).toBe('success');
  });
});
