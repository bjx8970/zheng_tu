// tests/setup/jest.e2e.ts
import '@testing-library/jest-native';

// Detox globals
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): R;
      toHaveText(text: string): R;
      toExist(): R;
    }
  }
}

// Global test utilities for Detox
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});

export const launchApp = async (options: { newInstance?: boolean; delete?: boolean } = {}) => {
  const device = require('detox').device;
  await device.launchApp({ ...options, permissions: 'yes' });
};

export const terminateApp = async () => {
  const device = require('detox').device;
  await device.terminateApp();
};

export const reloadApp = async () => {
  const device = require('detox').device;
  await device.reloadReactNative();
};

export const waitForElement = async (id: string, timeout = 5000) => {
  const { element, expect } = require('detox');
  await waitFor(element(by.id(id))).toExist().withTimeout(timeout);
  return element(by.id(id));
};

export const tapElement = async (id: string) => {
  const { element } = require('detox');
  await element(by.id(id)).tap();
};

export const typeText = async (id: string, text: string) => {
  const { element } = require('detox');
  await element(by.id(id)).typeText(text);
};

export const scrollTo = async (id: string, direction: 'down' | 'up' = 'down') => {
  const { element } = require('detox');
  await element(by.id(id)).scroll(100, direction);
};