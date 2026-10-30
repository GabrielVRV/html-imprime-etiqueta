import { ItemSeparacao } from '../models';
import {
  estaPendente,
  folhasNecessarias,
  percentualSeparado,
  quantidadeEtiquetasValida,
  sugerirEtiqueta,
} from './etiqueta.rules';

const item = (quantidadePendente: number): ItemSeparacao => ({
  nrSequencia: 0,
  itCodigo: '10-001',
  descItem: 'Parafuso',
  unidade: 'PC',
  quantidadeNecessaria: 10,
  quantidadeAtendida: 10 - quantidadePendente,
  quantidadePendente,
  quantidadeSaldo: 0,
});

describe('etiqueta.rules', () => {
  it('considera pendente apenas quando falta quantidade', () => {
    expect(estaPendente(item(3))).toBe(true);
    expect(estaPendente(item(0))).toBe(false);
  });

  it('calcula folhas com duas etiquetas por folha', () => {
    expect(folhasNecessarias(2)).toBe(1);
    expect(folhasNecessarias(6)).toBe(3);
    expect(folhasNecessarias(0)).toBe(0);
  });

  it('aceita só quantidade de etiquetas par e positiva', () => {
    expect(quantidadeEtiquetasValida(2)).toBe(true);
    expect(quantidadeEtiquetasValida(10)).toBe(true);
    expect(quantidadeEtiquetasValida(1)).toBe(false);
    expect(quantidadeEtiquetasValida(3)).toBe(false);
    expect(quantidadeEtiquetasValida(0)).toBe(false);
  });

  it('sugere uma folha (duas etiquetas) com a quantidade pendente', () => {
    expect(sugerirEtiqueta(item(7.5), 123)).toEqual({
      itCodigo: '10-001',
      nrOrdProd: 123,
      nrSequencia: 0,
      quantidadePorEtiqueta: 7.5,
      quantidadeEtiquetas: 2,
    });
  });

  it('leva a sequência do pedido na etiqueta de item sem ordem', () => {
    expect(sugerirEtiqueta({ ...item(1), nrSequencia: 20 }, 0).nrSequencia).toBe(20);
  });

  it('calcula percentual separado', () => {
    expect(percentualSeparado(4, 1)).toBe(75);
    expect(percentualSeparado(0, 0)).toBe(100);
  });
});
