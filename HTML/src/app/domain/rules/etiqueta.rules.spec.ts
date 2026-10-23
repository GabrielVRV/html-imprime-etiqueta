import { ItemSeparacao } from '../models';
import {
  estaPendente,
  etiquetasImpressas,
  folhasNecessarias,
  percentualSeparado,
  sugerirEtiqueta,
} from './etiqueta.rules';

const item = (quantidadePendente: number): ItemSeparacao => ({
  itCodigo: '10-001',
  descItem: 'Parafuso',
  unidade: 'PC',
  quantidadeNecessaria: 10,
  quantidadeAtendida: 10 - quantidadePendente,
  quantidadePendente,
});

describe('etiqueta.rules', () => {
  it('considera pendente apenas quando falta quantidade', () => {
    expect(estaPendente(item(3))).toBe(true);
    expect(estaPendente(item(0))).toBe(false);
  });

  it('arredonda folhas para cima, duas etiquetas por folha', () => {
    expect(folhasNecessarias(1)).toBe(1);
    expect(folhasNecessarias(2)).toBe(1);
    expect(folhasNecessarias(3)).toBe(2);
    expect(folhasNecessarias(0)).toBe(0);
    expect(etiquetasImpressas(3)).toBe(4);
  });

  it('sugere uma etiqueta com a quantidade pendente', () => {
    expect(sugerirEtiqueta(item(7.5), 123)).toEqual({
      itCodigo: '10-001',
      nrOrdProd: 123,
      quantidadePorEtiqueta: 7.5,
      quantidadeEtiquetas: 1,
    });
  });

  it('calcula percentual separado', () => {
    expect(percentualSeparado(4, 1)).toBe(75);
    expect(percentualSeparado(0, 0)).toBe(100);
  });
});
