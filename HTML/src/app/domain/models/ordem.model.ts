import { ItemSeparacao } from './item-separacao.model';

/** Agrupa os itens do pedido que não têm ordem de produção. */
export const NR_ORDEM_SEM_ORDEM = 0;

export interface Ordem {
  nrOrdProd: number;
  nrSequencia: number;
  itCodigo: string;
  descItem: string;
  quantidadeOrdem: number;
  estado: string;
  qtdItens: number;
  qtdItensPendentes: number;
}

export interface OrdemDetalhe extends Ordem {
  nrPedido: number;
  itens: ItemSeparacao[];
}
