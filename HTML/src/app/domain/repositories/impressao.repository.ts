import { Observable } from 'rxjs';

import { Impressora, ResultadoImpressao, SolicitacaoImpressao } from '../models';

export abstract class ImpressaoRepository {
  abstract listarImpressoras(): Observable<Impressora[]>;
  abstract imprimir(solicitacao: SolicitacaoImpressao): Observable<ResultadoImpressao>;
}
