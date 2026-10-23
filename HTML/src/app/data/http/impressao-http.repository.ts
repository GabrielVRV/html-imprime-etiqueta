import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { TotvsApiClient } from '../../core/api/totvs-api.client';
import { Impressora, ResultadoImpressao, SolicitacaoImpressao } from '../../domain/models';
import { ImpressaoRepository } from '../../domain/repositories/impressao.repository';
import { ImprimirResposta, ListarImpressorasResposta } from './dtos';
import { toEtiquetaDto, toImpressora } from './mappers';

@Injectable()
export class ImpressaoHttpRepository extends ImpressaoRepository {
  private readonly api = inject(TotvsApiClient);

  listarImpressoras(): Observable<Impressora[]> {
    return this.api
      .post<ListarImpressorasResposta>('impressoras/')
      .pipe(map((resposta) => (resposta.tt_impressora ?? []).map(toImpressora)));
  }

  imprimir(solicitacao: SolicitacaoImpressao): Observable<ResultadoImpressao> {
    return this.api
      .post<ImprimirResposta>('imprimir/', {
        impressora: solicitacao.impressora,
        lote: solicitacao.lote,
        serie: solicitacao.serie,
        tt_etiqueta: solicitacao.etiquetas.map(toEtiquetaDto),
      })
      .pipe(map((resposta) => ({ folhasEnviadas: resposta.tt_resultado?.[0]?.qtd_folhas ?? 0 })));
  }
}
