import { RespostaTotvs } from '../../core/api/totvs-api.client';

/** Espelho das temp-tables de include/api_imprime_etiqueta.i */
export interface PedidoDto {
  nr_pedido: number;
  nr_pedcli: string;
  cod_emitente: number;
  nome_abrev: string;
  dt_entrega: string | null;
  qtd_ordens: number;
  qtd_itens: number;
  qtd_itens_pendentes: number;
}

export interface OrdemDto {
  nr_ord_prod: number;
  nr_sequencia: number;
  it_codigo: string;
  desc_item: string;
  qt_ordem: number;
  estado: string;
  qtd_itens: number;
  qtd_itens_pendentes: number;
}

export interface ItemDto {
  it_codigo: string;
  desc_item: string;
  un: string;
  quant_orig: number;
  quant_atend: number;
  quant_pendente: number;
}

export interface ImpressoraDto {
  area: string;
  endereco: string;
}

export interface EtiquetaDto {
  it_codigo: string;
  nr_ord_prod: number;
  quantidade: number;
  qtd_etiquetas: number;
}

export interface ListarPedidosResposta extends RespostaTotvs {
  tt_pedido?: PedidoDto[];
}

export interface ObterPedidoResposta extends RespostaTotvs {
  tt_pedido?: PedidoDto[];
  tt_ordem?: OrdemDto[];
}

export interface ObterOrdemResposta extends RespostaTotvs {
  tt_ordem?: OrdemDto[];
  tt_item?: ItemDto[];
}

export interface ListarImpressorasResposta extends RespostaTotvs {
  tt_impressora?: ImpressoraDto[];
}

export interface ImprimirResposta extends RespostaTotvs {
  tt_resultado?: { qtd_folhas: number }[];
}
