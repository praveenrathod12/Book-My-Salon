import { Pipe, PipeTransform } from '@angular/core';

// "2026-10-05" -> "Mon, 05 Oct 2026"
@Pipe({ name: 'prettyDate', standalone: true })
export class PrettyDatePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
