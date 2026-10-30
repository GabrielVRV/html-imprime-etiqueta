import { ItemSeparacao, Ordem, Pedido } from '../../domain/models';
import { hojeMaisDias } from '../../shared/utils/data-iso';

interface OrdemMock extends Omit<Ordem, 'qtdItens' | 'qtdItensPendentes'> {
  itens: ItemSeparacao[];
}

export interface PedidoMock extends Omit<Pedido, 'qtdOrdens' | 'qtdItens' | 'qtdItensPendentes'> {
  ordens: OrdemMock[];
}

const item = (
  itCodigo: string,
  descItem: string,
  quantidadeNecessaria: number,
  quantidadeAtendida: number,
  unidade = 'PC',
  quantidadeSaldo = quantidadeNecessaria,
): ItemSeparacao => ({
  nrSequencia: 0,
  itCodigo,
  descItem,
  unidade,
  quantidadeNecessaria,
  quantidadeAtendida,
  quantidadePendente: Math.max(0, quantidadeNecessaria - quantidadeAtendida),
  quantidadeSaldo,
});

const itemSemOrdem = (nrSequencia: number, ...dados: Parameters<typeof item>): ItemSeparacao => ({
  ...item(...dados),
  nrSequencia,
});

export const PEDIDOS_MOCK: PedidoMock[] = [
  {
    nrPedido: 104575,
    nrPedCli: 'REP-0098',
    codEmitente: 3105,
    nomeAbrev: 'REVENDA-SUL',
    dataEntrega: hojeMaisDias(1),
    ordens: [
      {
        nrOrdProd: 0,
        nrSequencia: 0,
        itCodigo: '',
        descItem: 'Itens do pedido sem ordem de produção',
        quantidadeOrdem: 0,
        estado: '',
        itens: [
          itemSemOrdem(10, '40110001', 'Rolamento 6205', 12, 0),
          itemSemOrdem(20, '10020011', 'Parafuso sextavado M12x40', 100, 100),
          itemSemOrdem(30, '40110001', 'Rolamento 6205', 6, 2),
          itemSemOrdem(40, '60330001', 'Rolete de carga', 8, 0, 'PC', 2),
        ],
      },
    ],
  },
  {
    nrPedido: 104512,
    nrPedCli: 'PC-88123',
    codEmitente: 1520,
    nomeAbrev: 'AGROSUL',
    dataEntrega: hojeMaisDias(2),
    ordens: [
      {
        nrOrdProd: 556001,
        nrSequencia: 10,
        itCodigo: '31476522-5002',
        descItem: 'Silo secador 12m',
        quantidadeOrdem: 1,
        estado: 'Liberada',
        itens: [
          item('10020011', 'Parafuso sextavado M12x40', 240, 240),
          item('10020015', 'Porca sextavada M12', 240, 120),
          item('20510044', 'Chapa lateral galvanizada', 36, 12),
          item('20510090', 'Anel de reforço', 8, 0, 'PC', 3),
          item('30880012', 'Vedação de borracha', 15.5, 0, 'M'),
        ],
      },
      {
        nrOrdProd: 556002,
        nrSequencia: 20,
        itCodigo: '31477022-3001',
        descItem: 'Transportador helicoidal',
        quantidadeOrdem: 2,
        estado: 'Iniciada',
        itens: [
          item('40110001', 'Rolamento 6205', 4, 4),
          item('40110020', 'Mancal flangeado', 4, 4),
        ],
      },
      {
        nrOrdProd: 0,
        nrSequencia: 0,
        itCodigo: '',
        descItem: 'Itens do pedido sem ordem de produção',
        quantidadeOrdem: 0,
        estado: '',
        itens: [itemSemOrdem(30, '90000123', 'Kit manual técnico', 1, 0, 'UN')],
      },
    ],
  },
  {
    nrPedido: 104530,
    nrPedCli: 'OC-2026/117',
    codEmitente: 2210,
    nomeAbrev: 'COOP-VALE',
    dataEntrega: hojeMaisDias(5),
    ordens: [
      {
        nrOrdProd: 556120,
        nrSequencia: 10,
        itCodigo: '31480010-1000',
        descItem: 'Elevador de canecas 20m',
        quantidadeOrdem: 1,
        estado: 'Liberada',
        itens: [
          item('50220001', 'Caneca plástica 9"', 180, 0),
          item('50220010', 'Correia elevadora', 42, 0, 'M'),
          item('10020011', 'Parafuso sextavado M12x40', 360, 0),
        ],
      },
    ],
  },
  {
    nrPedido: 104488,
    nrPedCli: 'PED-5531',
    codEmitente: 1877,
    nomeAbrev: 'GRAOS-MT',
    dataEntrega: hojeMaisDias(-3),
    ordens: [
      {
        nrOrdProd: 555870,
        nrSequencia: 10,
        itCodigo: '31476000-2000',
        descItem: 'Fita transportadora 30m',
        quantidadeOrdem: 1,
        estado: 'Iniciada',
        itens: [
          item('60330001', 'Rolete de carga', 60, 60),
          item('60330005', 'Rolete de retorno', 20, 20),
        ],
      },
    ],
  },
];
