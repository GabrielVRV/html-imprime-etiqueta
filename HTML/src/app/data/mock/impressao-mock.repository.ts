import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { Impressora, ResultadoImpressao, SolicitacaoImpressao } from '../../domain/models';
import { folhasNecessarias } from '../../domain/rules/etiqueta.rules';
import { ImpressaoRepository } from '../../domain/repositories/impressao.repository';

const IMPRESSORAS_MOCK: Impressora[] = [
  { nome: 'Zebra Almoxarifado', caminho: '\\\\srv-print\\zebra-almox' },
  { nome: 'Zebra Expedição', caminho: '\\\\srv-print\\zebra-exp' },
  { nome: 'Zebra Montagem', caminho: '\\\\srv-print\\zebra-mont' },
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
