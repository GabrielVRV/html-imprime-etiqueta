import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { TotvsApiClient } from '../../core/api/totvs-api.client';
import { OrdemDetalhe, Pedido, PedidoDetalhe } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { ListarPedidosResposta, ObterOrdemResposta, ObterPedidoResposta } from './dtos';
import { toItemSeparacao, toOrdem, toPedido } from './mappers';

@Injectable()
export class PedidoHttpRepository extends PedidoRepository {
  private readonly api = inject(TotvsApiClient);

  listarPedidos(): Observable<Pedido[]> {
    return this.api
      .post<ListarPedidosResposta>('pedidos/')
      .pipe(map((resposta) => (resposta.tt_pedido ?? []).map(toPedido)));
  }

  obterPedido(nrPedido: number): Observable<PedidoDetalhe> {
    return this.api.post<ObterPedidoResposta>('pedido/', { nr_pedido: nrPedido }).pipe(
      map((resposta) => {
        const pedido = resposta.tt_pedido?.[0];
        if (!pedido) throw new ApiError(`Pedido ${nrPedido} não encontrado.`);
        return { ...toPedido(pedido), ordens: (resposta.tt_ordem ?? []).map(toOrdem) };
      }),
    );
  }

  obterOrdem(nrPedido: number, nrOrdProd: number): Observable<OrdemDetalhe> {
    return this.api
      .post<ObterOrdemResposta>('ordem/', { nr_pedido: nrPedido, nr_ord_prod: nrOrdProd })
      .pipe(
        map((resposta) => {
          const ordem = resposta.tt_ordem?.[0];
          if (!ordem) throw new ApiError(`Ordem ${nrOrdProd} não encontrada no pedido.`);
          return {
            ...toOrdem(ordem),
            nrPedido,
            itens: (resposta.tt_item ?? []).map(toItemSeparacao),
          };
        }),
      );
  }
}
