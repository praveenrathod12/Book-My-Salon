// Full-stack production build: point apiUrl at your deployed backend.
// Replace the placeholder with your hosted API base URL before deploying.
export const environment = {
  production: true,
  dataMode: 'api' as 'api' | 'demo',
  apiUrl: 'https://YOUR-BACKEND-URL/api'
};
