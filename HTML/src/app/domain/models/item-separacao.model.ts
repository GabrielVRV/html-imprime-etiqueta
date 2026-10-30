export interface ItemSeparacao {
  /** Sequência do pedido nos itens sem ordem; 0 nos itens de uma ordem. */
  nrSequencia: number;
  itCodigo: string;
  descItem: string;
  unidade: string;
  quantidadeNecessaria: number;
  quantidadeAtendida: number;
  quantidadePendente: number;
  /** Saldo em estoque disponível para separar (sem CON, RET, CQ e localizações de separação e reserva). */
  quantidadeSaldo: number;
}
