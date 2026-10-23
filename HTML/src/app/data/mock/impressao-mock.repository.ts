import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { Impressora, ResultadoImpressao, SolicitacaoImpressao } from '../../domain/models';
import { folhasNecessarias } from '../../domain/rules/etiqueta.rules';
import { ImpressaoRepository } from '../../domain/repositories/impressao.repository';

const IMPRESSORAS_MOCK: Impressora[] = [
  { area: 'Almoxarifado', endereco: '\\\\srv-print\\zebra-almox' },
  { area: 'Expedição', endereco: '\\\\srv-print\\zebra-exp' },
  { area: 'Montagem', endereco: '\\\\srv-print\\zebra-mont' },
];

@Injectable()
export class ImpressaoMockRepository extends ImpressaoRepository {
  listarImpressoras(): Observable<Impressora[]> {
    return of(IMPRESSORAS_MOCK).pipe(delay(200));
  }

  imprimir(solicitacao: SolicitacaoImpressao): Observable<ResultadoImpressao> {
    const folhasEnviadas = solicitacao.etiquetas.reduce(
      (total, etiqueta) => total + folhasNecessarias(etiqueta.quantidadeEtiquetas),
      0,
    );
    return of({ folhasEnviadas }).pipe(delay(600));
  }
}
