import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'mm' })
export class MmPipe implements PipeTransform {
  transform(value: number): string {
    return `${value.toFixed(1)} mm`;
  }
}
