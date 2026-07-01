export interface City {
  slug: string;
  name: string;
  stationCode: string;
}

/** ~30 largest Polish cities, each mapped to its nearest IMGW meteo station. */
export const CITIES: City[] = [
  { slug: 'warszawa', name: 'Warszawa', stationCode: '352200375' },
  { slug: 'krakow', name: 'Kraków', stationCode: '350190566' },
  { slug: 'lodz', name: 'Łódź', stationCode: '351190465' },
  { slug: 'wroclaw', name: 'Wrocław', stationCode: '351160424' },
  { slug: 'poznan', name: 'Poznań', stationCode: '352160330' },
  { slug: 'gdansk', name: 'Gdańsk', stationCode: '254180260' },
  { slug: 'szczecin', name: 'Szczecin', stationCode: '353140205' },
  { slug: 'bydgoszcz', name: 'Bydgoszcz', stationCode: '253180220' },
  { slug: 'lublin', name: 'Lublin', stationCode: '351220495' },
  { slug: 'bialystok', name: 'Białystok', stationCode: '353230295' },
  { slug: 'katowice', name: 'Katowice', stationCode: '350190560' },
  { slug: 'gdynia', name: 'Gdynia', stationCode: '254180060' },
  { slug: 'czestochowa', name: 'Częstochowa', stationCode: '350190550' },
  { slug: 'radom', name: 'Radom', stationCode: '251200150' },
  { slug: 'sosnowiec', name: 'Sosnowiec', stationCode: '350190560' },
  { slug: 'torun', name: 'Toruń', stationCode: '353180250' },
  { slug: 'kielce', name: 'Kielce', stationCode: '350200570' },
  { slug: 'rzeszow', name: 'Rzeszów', stationCode: '350220580' },
  { slug: 'gliwice', name: 'Gliwice', stationCode: '250180330' },
  { slug: 'zabrze', name: 'Zabrze', stationCode: '250180640' },
  { slug: 'olsztyn', name: 'Olsztyn', stationCode: '353200272' },
  { slug: 'bielsko-biala', name: 'Bielsko-Biała', stationCode: '349190600' },
  { slug: 'bytom', name: 'Bytom', stationCode: '250190560' },
  { slug: 'zielona-gora', name: 'Zielona Góra', stationCode: '351150400' },
  { slug: 'rybnik', name: 'Rybnik', stationCode: '250180590' },
  { slug: 'opole', name: 'Opole', stationCode: '250170870' },
  { slug: 'gorzow-wielkopolski', name: 'Gorzów Wielkopolski', stationCode: '352150300' },
  { slug: 'plock', name: 'Płock', stationCode: '352190360' },
  { slug: 'tychy', name: 'Tychy', stationCode: '250190520' },
  { slug: 'elblag', name: 'Elbląg', stationCode: '254190190' },
];
