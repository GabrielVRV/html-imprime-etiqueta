import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { TotvsApiClient } from '../../core/api/totvs-api.client';
import {
  FiltroPedidos,
  OrdemDetalhe,
  PaginaPedidos,
  PedidoDetalhe,
  TAMANHO_PAGINA_PEDIDOS,
} from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { ListarPedidosResposta, ObterOrdemResposta, ObterPedidoResposta } from './dtos';
import { toItemSeparacao, toOrdem, toPedido } from './mappers';

@Injectable()
export class PedidoHttpRepository extends PedidoRepository {
  private readonly api = inject(TotvsApiClient);

  listarPedidos(filtro: FiltroPedidos): Observable<PaginaPedidos> {
    return this.api
      .post<ListarPedidosResposta>('pedidos/', {
        busca: filtro.busca,
        pagina: filtro.pagina,
        tamanho: TAMANHO_PAGINA_PEDIDOS,
      })
      .pipe(
        map((resposta) => ({
          pedidos: (resposta.tt_pedido ?? []).map(toPedido),
          temMais: resposta.tt_pagina?.[0]?.tem_mais ?? false,
        })),
      );
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
