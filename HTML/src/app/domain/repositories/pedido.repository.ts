import { Observable } from 'rxjs';

import { FiltroPedidos, OrdemDetalhe, PaginaPedidos, PedidoDetalhe } from '../models';

export abstract class PedidoRepository {
  /** Apenas pedidos com algum item pendente de separação, por data de entrega. */
  abstract listarPedidos(filtro: FiltroPedidos): Observable<PaginaPedidos>;
  abstract obterPedido(nrPedido: number): Observable<PedidoDetalhe>;
  abstract obterOrdem(nrPedido: number, nrOrdProd: number): Observable<OrdemDetalhe>;
}
