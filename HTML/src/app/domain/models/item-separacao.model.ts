export interface ItemSeparacao {
  itCodigo: string;
  descItem: string;
  unidade: string;
  quantidadeNecessaria: number;
  quantidadeAtendida: number;
  quantidadePendente: number;
  /** Saldo em estoque disponível para separar (sem CON, RET, CQ e localizações de separação e reserva). */
  quantidadeSaldo: number;
}
