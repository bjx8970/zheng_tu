// tests/setup/jest.integration.ts
import '@testing-library/jest-native';

// MSW setup for Supabase mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const supabaseMockServer = setupServer(
  rest.post('*/rest/v1/*', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: null, error: null }));
  }),
  rest.patch('*/rest/v1/*', (req, res, ctx) => {
    return res(ctx.status(204));
  }),
  rest.get('*/rest/v1/*', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: [], error: null }));
  }),
  rest.rpc('*/rpc/*', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: null, error: null }));
  })
);

beforeAll(() => supabaseMockServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => supabaseMockServer.resetHandlers());
afterAll(() => supabaseMockServer.close());

// Global test utilities
global.createTestStore = (initialState = {}) => {
  // Will be implemented with actual store factory
  return { getState: () => initialState, setState: jest.fn() };
};