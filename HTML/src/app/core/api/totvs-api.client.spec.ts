import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';
import { ApiError } from './api-error';
import { TotvsApiClient } from './totvs-api.client';

describe('TotvsApiClient', () => {
  let client: TotvsApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/' },
      ],
    });
    client = TestBed.inject(TotvsApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('devolve a resposta quando tt_retorno não tem erro', async () => {
    const resposta = firstValueFrom(client.post('pedidos/', { a: 1 }));
    const req = http.expectOne('/api/pedidos/');
    expect(req.request.body).toEqual({ a: 1 });
    req.flush({ tt_retorno: [{ cod_erro: 0, desc_erro: 'OK' }] });

    await expect(resposta).resolves.toEqual({ tt_retorno: [{ cod_erro: 0, desc_erro: 'OK' }] });
  });

  it('converte erro de negócio em ApiError', async () => {
    const resposta = firstValueFrom(client.post('pedidos/'));
    http.expectOne('/api/pedidos/').flush({ tt_retorno: [{ cod_erro: -1, desc_erro: 'Falhou' }] });

    await expect(resposta).rejects.toEqual(new ApiError('Falhou'));
  });

  it('converte erro HTTP em ApiError', async () => {
    const resposta = firstValueFrom(client.post('pedidos/'));
    http.expectOne('/api/pedidos/').flush('', { status: 500, statusText: 'Server Error' });

    await expect(resposta).rejects.toBeInstanceOf(ApiError);
  });
});
