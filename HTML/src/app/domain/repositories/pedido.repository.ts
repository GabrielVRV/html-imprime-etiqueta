import { Observable } from 'rxjs';

import { FiltroPedidos, OrdemDetalhe, Pedido, PedidoDetalhe } from '../models';

export abstract class PedidoRepository {
  abstract listarPedidos(filtro: FiltroPedidos): Observable<Pedido[]>;
  abstract obterPedido(nrPedido: number): Observable<PedidoDetalhe>;
  abstract obterOrdem(nrPedido: number, nrOrdProd: number): Observable<OrdemDetalhe>;
}
