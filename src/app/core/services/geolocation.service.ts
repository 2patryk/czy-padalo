import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinates, GeolocationError } from '../models/geolocation.model';

/** Client-side only — `navigator.geolocation` doesn't exist during SSR. */
@Service()
export class GeolocationService {
  private readonly platformId = inject(PLATFORM_ID);

  getCurrentPosition(): Observable<Coordinates> {
    return new Observable<Coordinates>((subscriber) => {
      if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
        subscriber.error({ type: 'unsupported' } satisfies GeolocationError);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          subscriber.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          subscriber.complete();
        },
        (error) => subscriber.error(this.toGeolocationError(error)),
      );
    });
  }

  private toGeolocationError(error: GeolocationPositionError): GeolocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return { type: 'permission-denied' };
      case error.TIMEOUT:
        return { type: 'timeout' };
      default:
        return { type: 'unavailable' };
    }
  }
}
