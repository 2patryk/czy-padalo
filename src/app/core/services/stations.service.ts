import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Coordinates } from '../models/geolocation.model';
import { Station } from '../models/station.model';
import { ImgwApiService } from './imgw-api.service';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two coordinates, in kilometers. */
function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface NearestStation {
  station: Station;
  distanceKm: number;
}

@Service()
export class StationsService {
  private readonly imgwApi = inject(ImgwApiService);

  /** Returns `null` if the station list is empty. */
  findNearestStation(origin: Coordinates): Observable<NearestStation | null> {
    return this.imgwApi.getStations().pipe(map((stations) => this.nearest(origin, stations)));
  }

  private nearest(origin: Coordinates, stations: Station[]): NearestStation | null {
    let closest: NearestStation | null = null;

    for (const station of stations) {
      const distanceKm = haversineDistanceKm(origin, {
        latitude: station.latitude,
        longitude: station.longitude,
      });

      if (!closest || distanceKm < closest.distanceKm) {
        closest = { station, distanceKm };
      }
    }

    return closest;
  }
}
