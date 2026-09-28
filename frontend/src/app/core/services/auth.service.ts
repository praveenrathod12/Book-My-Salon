import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest, UserRole } from '../models/models';
import { DataService } from '../data/data-service';

const TOKEN_KEY = 'salon_access_token';
const REFRESH_KEY = 'salon_refresh_token';
const USER_KEY = 'salon_user';
const DEMO_SESSION_KEY = 'salon_demo_user_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private data = inject(DataService);

  private readonly _user = signal<AuthUser | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<UserRole | null>(() => this._user()?.role ?? null);
  readonly isOwner = computed(() => this._user()?.role === 'SALON_OWNER');
  readonly isCustomer = computed(() => this._user()?.role === 'CUSTOMER');

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.data.login(request).pipe(tap((res) => this.storeSession(res)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.data.register(request).pipe(tap((res) => this.storeSession(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DEMO_SESSION_KEY);
    this._user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    // Demo mode tracks the active user id separately for its in-memory store.
    localStorage.setItem(DEMO_SESSION_KEY, String(res.user.id));
    this._user.set(res.user);
  }

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
