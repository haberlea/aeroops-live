import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees and reset any storage between tests so hook state
// never leaks from one case into the next.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
