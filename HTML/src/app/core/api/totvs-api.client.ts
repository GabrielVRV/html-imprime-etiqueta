import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';
import { ApiError } from './api-error';

export interface RetornoTotvs {
  cod_erro: number;
  desc_erro: string;
}

export interface RespostaTotvs {
  tt_retorno?: RetornoTotvs[];
}

/**
 * Cliente das APIs ut-api do Datasul. Erros de negócio chegam com HTTP 200 e
 * cod_erro <> 0 em tt_retorno; aqui eles viram ApiError, igual aos erros HTTP.
 */
@Injectable({ providedIn: 'root' })
export class TotvsApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  post<T extends RespostaTotvs>(endpoint: string, payload: object = {}): Observable<T> {
    return this.http.post<T>(this.baseUrl + endpoint, payload).pipe(
      map((resposta) => this.validarRetorno(resposta)),
      catchError((erro: unknown) => throwError(() => this.normalizarErro(erro))),
    );
  }

  private validarRetorno<T extends RespostaTotvs>(resposta: T): T {
    const erro = resposta.tt_retorno?.find((retorno) => retorno.cod_erro !== 0);
    if (erro) throw new ApiError(erro.desc_erro);
    return resposta;
  }

  private normalizarErro(erro: unknown): ApiError {
    if (erro instanceof ApiError) return erro;
    if (erro instanceof HttpErrorResponse) {
      return erro.status === 0
        ? new ApiError('Não foi possível conectar ao servidor.')
        : new ApiError(`Erro ${erro.status} ao chamar o servidor: ${erro.statusText}`);
    }
    return new ApiError('Erro inesperado ao chamar o servidor.');
  }
}
