import { HttpErrorResponse } from '@angular/common/http';

// Normalizes backend ({ message } / ApiResponse) and demo-mode errors into a string.
export function extractError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.error && typeof err.error === 'object' && 'message' in err.error) {
      return (err.error as { message?: string }).message || fallback;
    }
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    if (err.status === 0) return 'Cannot reach the server. Please check your connection.';
    return err.message || fallback;
  }
  if (err && typeof err === 'object' && 'error' in err) {
    const e = (err as { error?: { message?: string } }).error;
    if (e?.message) return e.message;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message?: string }).message || fallback;
  }
  return fallback;
}
