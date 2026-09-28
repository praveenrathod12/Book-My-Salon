import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith, switchMap, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../../core/data/data-service';
import { Salon } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface ListState {
  loading: boolean;
  error: string;
  salons: Salon[];
}

@Component({
  selector: 'app-salon-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, InrPipe],
  templateUrl: './salon-list.component.html',
  styleUrl: './salon-list.component.css'
})
export class SalonListComponent {
  private data = inject(DataService);

  readonly search = new FormControl('', { nonNullable: true });

  readonly state = toSignal(
    this.search.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        this.loading.set(true);
        return this.data.getSalons(term.trim() || undefined).pipe(
          switchMap((salons) => of<ListState>({ loading: false, error: '', salons })),
          catchError(() =>
            of<ListState>({ loading: false, error: 'Could not load salons. Please try again.', salons: [] })
          )
        );
      })
    ),
    { initialValue: { loading: true, error: '', salons: [] } as ListState }
  );

  // Kept only to drive the initial spinner before the first emission resolves.
  readonly loading = signal(true);
}
