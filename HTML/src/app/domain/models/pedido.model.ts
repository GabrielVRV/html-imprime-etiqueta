import { Ordem } from './ordem.model';

export interface Pedido {
  nrPedido: number;
  nrPedCli: string;
  codEmitente: number;
  nomeAbrev: string;
  /** ISO yyyy-mm-dd */
  dataEntrega: string | null;
  qtdOrdens: number;
  qtdItens: number;
  qtdItensPendentes: number;
}

export interface PedidoDetalhe extends Pedido {
  ordens: Ordem[];
}

export const TAMANHO_PAGINA_PEDIDOS = 20;

export interface FiltroPedidos {
  /** Pedido do cliente ou cliente (começando pelo texto), ou número exato do pedido. */
  busca: string;
  /** Começa em 1. */
  pagina: number;
}

export interface PaginaPedidos {
  pedidos: Pedido[];
  temMais: boolean;
}
