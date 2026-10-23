import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  PoBreadcrumb,
  PoInfoModule,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
  PoWidgetModule,
} from '@po-ui/ng-components';

import { carregarAoMudar } from '../../core/state/carregar-ao-mudar';
import { NR_ORDEM_SEM_ORDEM, Ordem } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { percentualSeparado } from '../../domain/rules/etiqueta.rules';
import { ProgressoSeparacaoComponent } from '../../shared/components/progresso-separacao.component';
import {
  colunaProgresso,
  colunaSituacao,
  SituacaoSeparacao,
  situacaoSeparacao,
} from '../../shared/table/situacao-separacao';

interface LinhaOrdem extends Ordem {
  ordem: string;
  sequencia: string;
  percentualSeparado: number;
  situacao: SituacaoSeparacao;
}

const toLinha = (ordem: Ordem): LinhaOrdem => {
  const semOrdem = ordem.nrOrdProd === NR_ORDEM_SEM_ORDEM;
  return {
    ...ordem,
    ordem: semOrdem ? 'Sem ordem' : String(ordem.nrOrdProd),
    sequencia: semOrdem ? '' : String(ordem.nrSequencia),
    percentualSeparado: percentualSeparado(ordem.qtdItens, ordem.qtdItensPendentes),
    situacao: situacaoSeparacao(ordem.qtdItensPendentes),
  };
};

@Component({
  selector: 'app-pedido-detalhe-page',
  imports: [
    DatePipe,
    PoPageModule,
    PoTableModule,
    PoWidgetModule,
    PoInfoModule,
    ProgressoSeparacaoComponent,
  ],
  templateUrl: './pedido-detalhe.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalhePage {
  private readonly router = inject(Router);
  private readonly repository = inject(PedidoRepository);

  readonly nrPedido = input.required({ transform: numberAttribute });

  private readonly carregamento = carregarAoMudar(this.nrPedido, (nrPedido) =>
    this.repository.obterPedido(nrPedido),
  );
  protected readonly pedido = this.carregamento.dados;
  protected readonly carregando = this.carregamento.carregando;

  protected readonly linhas = computed(() => (this.pedido()?.ordens ?? []).map(toLinha));
  protected readonly percentual = computed(() => {
    const pedido = this.pedido();
    return pedido ? percentualSeparado(pedido.qtdItens, pedido.qtdItensPendentes) : 0;
  });

  protected readonly breadcrumb = computed<PoBreadcrumb>(() => ({
    items: [{ label: 'Pedidos', link: '/pedidos' }, { label: `Pedido ${this.nrPedido()}` }],
  }));

  protected readonly colunas: PoTableColumn[] = [
    { property: 'ordem', label: 'Ordem', width: '120px' },
    { property: 'sequencia', label: 'Seq.', width: '70px' },
    { property: 'itCodigo', label: 'Item' },
    { property: 'descItem', label: 'Descrição' },
    { property: 'estado', label: 'Estado', width: '110px' },
    { property: 'qtdItensPendentes', label: 'Itens pendentes', type: 'number', width: '140px' },
    colunaProgresso,
    colunaSituacao('Completa'),
  ];

  protected readonly acoes: PoTableAction[] = [
    { label: 'Ver itens', action: (linha: LinhaOrdem) => this.abrir(linha) },
  ];

  private abrir(ordem: Ordem): void {
    this.router.navigate(['/pedidos', this.nrPedido(), 'ordens', ordem.nrOrdProd]);
  }
}
