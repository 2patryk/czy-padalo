import { Routes } from '@angular/router';
import { CityPageComponent } from './features/city-page/city-page.component';
import { cityPageResolver } from './features/city-page/city-page.resolver';

export const routes: Routes = [
  {
    path: ':citySlug',
    component: CityPageComponent,
    resolve: { report: cityPageResolver },
  },
];
