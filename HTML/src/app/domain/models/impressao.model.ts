/** Impressora de etiqueta ativa do Cadastro de Impressoras. */
export interface Impressora {
  nome: string;
  /** Destino gravado na fila do roboEtiquetaItem. */
  caminho: string;
}

export interface EtiquetaSolicitada {
  itCodigo: string;
  nrOrdProd: number;
  nrSequencia: number;
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
