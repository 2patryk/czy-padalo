import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StationHistory } from '../models/station.model';
import { ImgwApiService } from './imgw-api.service';

describe('ImgwApiService', () => {
  let service: ImgwApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ImgwApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('sends the station code as the "id" query param — id !== code, see PLAN.md gotchas', () => {
    service.getStationHistory('351190465', 24).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === 'https://hydro-back.imgw.pl/station/meteo/data',
    );
    expect(req.request.params.get('id')).toBe('351190465');
    expect(req.request.params.get('hoursInterval')).toBe('24');
    req.flush({ precip: [] } satisfies StationHistory);
  });

  it('caches getStationHistory results within the TTL, avoiding a second HTTP call', () => {
    service.getStationHistory('351190465', 24).subscribe();
    httpMock.expectOne(() => true).flush({ precip: [] } satisfies StationHistory);

    service.getStationHistory('351190465', 24).subscribe();
    httpMock.expectNone(() => true);
  });

  it('issues a new HTTP call once the TTL has expired', () => {
    vi.useFakeTimers();

    service.getStationHistory('351190465', 24).subscribe();
    httpMock.expectOne(() => true).flush({ precip: [] } satisfies StationHistory);

    vi.advanceTimersByTime(11 * 60 * 1000); // > 10 min station-history TTL

    service.getStationHistory('351190465', 24).subscribe();
    httpMock.expectOne(() => true).flush({ precip: [] } satisfies StationHistory);
  });
});
