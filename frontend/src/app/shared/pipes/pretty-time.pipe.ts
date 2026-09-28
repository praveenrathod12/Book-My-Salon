import { Pipe, PipeTransform } from '@angular/core';

// "17:30" -> "5:30 PM"
@Pipe({ name: 'prettyTime', standalone: true })
export class PrettyTimePipe implements PipeTransform {
  transform(hhmm: string | null | undefined): string {
    if (!hhmm) return '';
    const [hStr, mStr] = hhmm.split(':');
    let h = Number(hStr);
    const m = mStr ?? '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }
}
