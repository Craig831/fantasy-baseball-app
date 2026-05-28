/**
 * Default MSW handler list. Individual tests append per-test handlers via
 * `mswServer.use(...)`. The default list is empty so any unhandled request
 * fails loudly (per `onUnhandledRequest: 'error'` in mswServer.ts).
 */

import type { HttpHandler } from 'msw';

export const handlers: HttpHandler[] = [];
