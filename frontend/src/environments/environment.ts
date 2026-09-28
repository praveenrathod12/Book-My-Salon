// Default environment (used by `ng serve` and non-production builds).
// dataMode: 'api'  -> talk to the ASP.NET Core backend
//           'demo' -> use local mock data (no backend needed)
export const environment = {
  production: false,
  dataMode: 'demo' as 'api' | 'demo',
  apiUrl: 'http://localhost:5095/api'
};
