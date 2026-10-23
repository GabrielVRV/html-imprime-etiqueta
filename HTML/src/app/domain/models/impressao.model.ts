export interface Impressora {
  area: string;
  endereco: string;
}

export interface EtiquetaSolicitada {
  itCodigo: string;
  nrOrdProd: number;
  quantidadePorEtiqueta: number;
  quantidadeEtiquetas: number;
}

export interface SolicitacaoImpressao {
  impressora: string;
  lote: string;
  serie: string;
  etiquetas: EtiquetaSolicitada[];
}

export interface ResultadoImpressao {
  folhasEnviadas: number;
}
