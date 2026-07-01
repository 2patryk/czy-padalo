import { Routes } from '@angular/router';
import { CityPageComponent } from './features/city-page/city-page.component';
import { cityPageResolver } from './features/city-page/city-page.resolver';
import { LocationPickerComponent } from './features/location-picker/location-picker.component';

export const routes: Routes = [
  { path: '', component: LocationPickerComponent },
  {
    path: ':citySlug',
    component: CityPageComponent,
    resolve: { report: cityPageResolver },
  },
];
