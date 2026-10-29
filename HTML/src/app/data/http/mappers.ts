import { EtiquetaSolicitada, Impressora, ItemSeparacao, Ordem, Pedido } from '../../domain/models';
import { EtiquetaDto, ImpressoraDto, ItemDto, OrdemDto, PedidoDto } from './dtos';

export const toPedido = (dto: PedidoDto): Pedido => ({
  nrPedido: dto.nr_pedido,
  nrPedCli: dto.nr_pedcli,
  codEmitente: dto.cod_emitente,
  nomeAbrev: dto.nome_abrev,
  dataEntrega: dto.dt_entrega,
  qtdOrdens: dto.qtd_ordens,
  qtdItens: dto.qtd_itens,
  qtdItensPendentes: dto.qtd_itens_pendentes,
});

export const toOrdem = (dto: OrdemDto): Ordem => ({
  nrOrdProd: dto.nr_ord_prod,
  nrSequencia: dto.nr_sequencia,
  itCodigo: dto.it_codigo,
  descItem: dto.desc_item,
  quantidadeOrdem: dto.qt_ordem,
  estado: dto.estado,
  qtdItens: dto.qtd_itens,
  qtdItensPendentes: dto.qtd_itens_pendentes,
});

export const toItemSeparacao = (dto: ItemDto): ItemSeparacao => ({
  itCodigo: dto.it_codigo,
  descItem: dto.desc_item,
  unidade: dto.un,
  quantidadeNecessaria: dto.quant_orig,
  quantidadeAtendida: dto.quant_atend,
  quantidadePendente: dto.quant_pendente,
  quantidadeSaldo: dto.quant_saldo,
});

export const toImpressora = (dto: ImpressoraDto): Impressora => ({
  nome: dto.nome,
  caminho: dto.caminho,
});

export const toEtiquetaDto = (etiqueta: EtiquetaSolicitada): EtiquetaDto => ({
  it_codigo: etiqueta.itCodigo,
  nr_ord_prod: etiqueta.nrOrdProd,
  quantidade: etiqueta.quantidadePorEtiqueta,
  qtd_etiquetas: etiqueta.quantidadeEtiquetas,
});
