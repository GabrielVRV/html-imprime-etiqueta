import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import {
  FiltroPedidos,
  ItemSeparacao,
  Ordem,
  OrdemDetalhe,
  Pedido,
  PedidoDetalhe,
} from '../../domain/models';
import { estaPendente } from '../../domain/rules/etiqueta.rules';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { PEDIDOS_MOCK, PedidoMock } from './mock-data';

const LATENCIA_MS = 400;

const contarItens = (itens: ItemSeparacao[]) => ({
  qtdItens: itens.length,
  qtdItensPendentes: itens.filter(estaPendente).length,
});

const toPedido = ({ ordens, ...pedido }: PedidoMock): Pedido => ({
  ...pedido,
  qtdOrdens: ordens.filter((ordem) => ordem.nrOrdProd !== 0).length,
  ...contarItens(ordens.flatMap((ordem) => ordem.itens)),
});

@Injectable()
export class PedidoMockRepository extends PedidoRepository {
  listarPedidos(filtro: FiltroPedidos): Observable<Pedido[]> {
    const pedidos = PEDIDOS_MOCK.filter(
      ({ dataEntrega }) =>
        !!dataEntrega &&
        dataEntrega >= filtro.dataEntregaInicial &&
        dataEntrega <= filtro.dataEntregaFinal,
    ).map(toPedido);
    return of(pedidos).pipe(delay(LATENCIA_MS));
  }

  obterPedido(nrPedido: number): Observable<PedidoDetalhe> {
    const pedido = this.buscar(nrPedido);
    if (!pedido) return throwError(() => new ApiError(`Pedido ${nrPedido} não encontrado.`));

    const ordens: Ordem[] = pedido.ordens.map(({ itens, ...ordem }) => ({
      ...ordem,
      ...contarItens(itens),
    }));
    return of({ ...toPedido(pedido), ordens }).pipe(delay(LATENCIA_MS));
  }

  obterOrdem(nrPedido: number, nrOrdProd: number): Observable<OrdemDetalhe> {
    const ordem = this.buscar(nrPedido)?.ordens.find((o) => o.nrOrdProd === nrOrdProd);
    if (!ordem) {
      return throwError(() => new ApiError(`Ordem ${nrOrdProd} não encontrada no pedido.`));
    }
    return of({ ...ordem, nrPedido, ...contarItens(ordem.itens) }).pipe(delay(LATENCIA_MS));
  }

  private buscar(nrPedido: number): PedidoMock | undefined {
    return PEDIDOS_MOCK.find((pedido) => pedido.nrPedido === nrPedido);
  }
}
