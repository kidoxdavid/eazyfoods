import { defineConfig } from 'vitest/config';

// The click-everything run changes data (it deletes, approves, cancels), so it is kept apart from the normal suite: CLICK_ALL=1 npx vitest run tests/exhaustive
const exhaustive = !!(process.env.CLICK_ALL || process.env.QA_AUDIT);
export default defineConfig({
  test: {
    globalSetup: ['./global-setup.ts'], testTimeout: 90_000, hookTimeout: 120_000, fileParallelism: false,
    include: exhaustive ? ['tests/exhaustive/**/*.test.ts'] : ['tests/*.test.ts'],
  },
});
