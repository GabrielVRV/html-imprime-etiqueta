import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  importProvidersFrom,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { PoNotificationModule } from '@po-ui/ng-components';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { API_BASE_URL } from './core/api/api-base-url.token';
import { provideRepositories } from './data/provide-repositories';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Hash location: o build é servido como arquivo estático dentro do Datasul, sem rewrite de rotas.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
    provideHttpClient(),
    provideAnimationsAsync(),
    importProvidersFrom(PoNotificationModule),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideRepositories({ useMock: environment.useMock }),
  ],
};
