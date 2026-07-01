import { haversineDistanceKm } from './stations.service';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { latitude: 52.2297, longitude: 21.0122 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it('matches the known great-circle distance between Warszawa and Kraków (~252 km)', () => {
    const warszawa = { latitude: 52.2297, longitude: 21.0122 };
    const krakow = { latitude: 50.0647, longitude: 19.945 };
    expect(haversineDistanceKm(warszawa, krakow)).toBeCloseTo(252, 0);
  });

  it('is symmetric', () => {
    const a = { latitude: 52.2297, longitude: 21.0122 };
    const b = { latitude: 50.0647, longitude: 19.945 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});
