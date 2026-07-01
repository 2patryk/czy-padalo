export interface City {
  slug: string;
  name: string;
  stationCode: string;
}

/** Initial handful of cities to validate the shape — full ~20-30 list filled in later (step 18). */
export const CITIES: City[] = [
  { slug: 'warszawa', name: 'Warszawa', stationCode: '352200375' },
  { slug: 'krakow', name: 'Kraków', stationCode: '350190566' },
  { slug: 'lodz', name: 'Łódź', stationCode: '351190465' },
  { slug: 'wroclaw', name: 'Wrocław', stationCode: '351160424' },
  { slug: 'poznan', name: 'Poznań', stationCode: '352160330' },
];
