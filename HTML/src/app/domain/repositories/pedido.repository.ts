import { Observable } from 'rxjs';

import { OrdemDetalhe, Pedido, PedidoDetalhe } from '../models';

export abstract class PedidoRepository {
  /** Apenas pedidos com algum item pendente de separação. */
  abstract listarPedidos(): Observable<Pedido[]>;
  abstract obterPedido(nrPedido: number): Observable<PedidoDetalhe>;
  abstract obterOrdem(nrPedido: number, nrOrdProd: number): Observable<OrdemDetalhe>;
}
