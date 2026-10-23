import { EtiquetaSolicitada, ItemSeparacao } from '../models';

/** O modelo ITEM-CASP.prn imprime duas etiquetas por folha. */
export const ETIQUETAS_POR_FOLHA = 2;

export function estaPendente(item: ItemSeparacao): boolean {
  return item.quantidadePendente > 0;
}

export function folhasNecessarias(quantidadeEtiquetas: number): number {
  return Math.ceil(Math.max(0, quantidadeEtiquetas) / ETIQUETAS_POR_FOLHA);
}

export function etiquetasImpressas(quantidadeEtiquetas: number): number {
  return folhasNecessarias(quantidadeEtiquetas) * ETIQUETAS_POR_FOLHA;
}

export function sugerirEtiqueta(item: ItemSeparacao, nrOrdProd: number): EtiquetaSolicitada {
  return {
    itCodigo: item.itCodigo,
    nrOrdProd,
    quantidadePorEtiqueta: item.quantidadePendente,
    quantidadeEtiquetas: 1,
  };
}

export function percentualSeparado(qtdItens: number, qtdItensPendentes: number): number {
  if (qtdItens <= 0) return 100;
  return Math.round(((qtdItens - qtdItensPendentes) / qtdItens) * 100);
}
