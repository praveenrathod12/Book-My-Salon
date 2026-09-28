// Public demo build for Vercel: fully self-contained using local mock data.
// No backend required, so the deployed site always works.
export const environment = {
  production: true,
  dataMode: 'demo' as 'api' | 'demo',
  apiUrl: ''
};
