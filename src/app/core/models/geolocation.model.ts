export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type GeolocationError =
  | { type: 'unsupported' }
  | { type: 'permission-denied' }
  | { type: 'unavailable' }
  | { type: 'timeout' };
