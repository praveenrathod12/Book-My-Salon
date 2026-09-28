import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="container footer-inner">
        <span>✂ SalonHub — Discover salons and book appointments in seconds.</span>
        <span class="muted">Built with Angular + ASP.NET Core</span>
      </div>
    </footer>
  `,
  styles: [
    `
      .footer {
        border-top: 1px solid var(--line);
        background: #fff;
        padding: 1.25rem 0;
        margin-top: auto;
      }
      .footer-inner {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.85rem;
        color: var(--muted);
      }
    `
  ]
})
export class FooterComponent {}
