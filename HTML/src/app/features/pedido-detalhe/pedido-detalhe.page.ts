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
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { telaPequena } from '../../core/layout/tela-pequena';
import { carregarAoMudar } from '../../core/state/carregar-ao-mudar';
import { NR_ORDEM_SEM_ORDEM, Ordem } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { percentualSeparado } from '../../domain/rules/etiqueta.rules';
import { ProgressoSeparacaoComponent } from '../../shared/components/progresso-separacao.component';
import {
  colunaSituacao,
  SituacaoSeparacao,
  situacaoSeparacao,
} from '../../shared/table/situacao-separacao';

interface LinhaOrdem extends Ordem {
  ordem: string;
  sequencia: string;
  situacao: SituacaoSeparacao;
}

const toLinha = (ordem: Ordem): LinhaOrdem => {
  const semOrdem = ordem.nrOrdProd === NR_ORDEM_SEM_ORDEM;
  return {
    ...ordem,
    ordem: semOrdem ? 'Sem ordem' : String(ordem.nrOrdProd),
    sequencia: semOrdem ? '' : String(ordem.nrSequencia),
    situacao: situacaoSeparacao(ordem.qtdItensPendentes),
  };
};

@Component({
  selector: 'app-pedido-detalhe-page',
  imports: [DatePipe, PoPageModule, PoTableModule, PoInfoModule, ProgressoSeparacaoComponent],
  templateUrl: './pedido-detalhe.page.html',
  styleUrl: '../../shared/styles/resumo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalhePage {
  private readonly router = inject(Router);
  private readonly repository = inject(PedidoRepository);
  private readonly pequena = telaPequena();

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

  protected readonly colunas = computed<PoTableColumn[]>(() => [
    {
      property: 'ordem',
      label: 'Ordem',
      type: 'link',
      width: this.pequena() ? undefined : '110px',
      action: (_: string, ordem: LinhaOrdem) => this.abrir(ordem),
    },
    { property: 'sequencia', label: 'Seq.', width: '70px', visible: !this.pequena() },
    { property: 'itCodigo', label: 'Item', visible: !this.pequena() },
    { property: 'descItem', label: 'Descrição' },
    { property: 'estado', label: 'Estado', width: '110px', visible: !this.pequena() },
    { property: 'qtdItensPendentes', label: 'Pendentes', type: 'number' },
    { ...colunaSituacao('Completa'), visible: !this.pequena() },
  ]);

  private abrir(ordem: Ordem): void {
    this.router.navigate(['/pedidos', this.nrPedido(), 'ordens', ordem.nrOrdProd]);
  }
}
