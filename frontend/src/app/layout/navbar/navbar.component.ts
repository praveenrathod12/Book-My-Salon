import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IS_DEMO_MODE } from '../../core/data/data.providers';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly isDemo = IS_DEMO_MODE;
  readonly menuOpen = signal(false);
  readonly user = this.auth.user;
  readonly isOwner = this.auth.isOwner;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    const parts = u.name.split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeMenu();
    this.router.navigate(['/']);
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 820) this.menuOpen.set(false);
  }
}
