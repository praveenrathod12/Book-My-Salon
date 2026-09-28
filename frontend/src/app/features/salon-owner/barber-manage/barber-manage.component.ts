import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Barber, BarberSchedule } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { PrettyDatePipe } from '../../../shared/pipes/pretty-date.pipe';
import { extractError } from '../../../core/utils/error.util';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-barber-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent, PrettyDatePipe],
  templateUrl: './barber-manage.component.html',
  styleUrl: './barber-manage.component.css'
})
export class BarberManageComponent {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  readonly barberId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly error = signal('');
  readonly barber = signal<Barber | null>(null);
  readonly schedule = signal<BarberSchedule[]>([]);
  readonly savingSchedule = signal(false);

  readonly newLeaveDate = signal('');
  readonly newLeaveReason = signal('');
  readonly addingLeave = signal(false);

  readonly today = new Date().toISOString().slice(0, 10);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.getBarber(this.barberId).subscribe({
      next: (b) => {
        this.barber.set(b);
        const order = [1, 2, 3, 4, 5, 6, 0];
        this.schedule.set(
          order.map(
            (d) =>
              b.schedules.find((s) => s.dayOfWeek === d) ?? {
                dayOfWeek: d,
                isOff: false,
                startTime: '09:00',
                endTime: '18:00'
              }
          )
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractError(err, 'Could not load barber.'));
        this.loading.set(false);
      }
    });
  }

  dayName(d: number): string {
    return DAY_NAMES[d];
  }

  saveSchedule() {
    this.savingSchedule.set(true);
    this.data.updateBarberSchedule(this.barberId, this.schedule()).subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.notify.success('Schedule updated.');
        this.load();
      },
      error: (err) => {
        this.savingSchedule.set(false);
        this.notify.error(extractError(err, 'Could not update schedule.'));
      }
    });
  }

  addLeave() {
    if (!this.newLeaveDate()) {
      this.notify.error('Pick a leave date.');
      return;
    }
    this.addingLeave.set(true);
    this.data.addBarberLeave(this.barberId, this.newLeaveDate(), this.newLeaveReason() || undefined).subscribe({
      next: () => {
        this.addingLeave.set(false);
        this.newLeaveDate.set('');
        this.newLeaveReason.set('');
        this.notify.success('Leave added.');
        this.load();
      },
      error: (err) => {
        this.addingLeave.set(false);
        this.notify.error(extractError(err, 'Could not add leave.'));
      }
    });
  }

  removeLeave(leaveId: number) {
    this.data.removeBarberLeave(this.barberId, leaveId).subscribe({
      next: () => {
        this.notify.success('Leave removed.');
        this.load();
      },
      error: (err) => this.notify.error(extractError(err, 'Could not remove leave.'))
    });
  }
}
