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

export interface FiltroPedidos {
  /** ISO yyyy-mm-dd */
  dataEntregaInicial: string;
  /** ISO yyyy-mm-dd */
  dataEntregaFinal: string;
}
