import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  inject,
  linkedSignal,
  numberAttribute,
  viewChild,
} from '@angular/core';
import {
  PoBreadcrumb,
  PoPageAction,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { carregarAoMudar } from '../../core/state/carregar-ao-mudar';
import { ItemSeparacao, NR_ORDEM_SEM_ORDEM } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { estaPendente } from '../../domain/rules/etiqueta.rules';
import {
  colunaSituacao,
  SituacaoSeparacao,
  situacaoSeparacao,
} from '../../shared/table/situacao-separacao';
import { ImpressaoModalComponent } from '../impressao/impressao-modal.component';

/** `$selected` é a propriedade que o po-table lê e altera para controlar a seleção. */
interface LinhaItem extends ItemSeparacao {
  $selected: boolean;
  situacao: SituacaoSeparacao;
}

const toLinha = (item: ItemSeparacao): LinhaItem => ({
  ...item,
  $selected: estaPendente(item),
  situacao: situacaoSeparacao(item.quantidadePendente),
});

@Component({
  selector: 'app-ordem-itens-page',
  imports: [PoPageModule, PoTableModule, ImpressaoModalComponent],
  templateUrl: './ordem-itens.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdemItensPage {
  private readonly repository = inject(PedidoRepository);
  private readonly modalImpressao = viewChild.required(ImpressaoModalComponent);

  readonly nrPedido = input.required({ transform: numberAttribute });
  readonly nrOrdProd = input.required({ transform: numberAttribute });

  private readonly chave = computed(() => ({
    nrPedido: this.nrPedido(),
    nrOrdProd: this.nrOrdProd(),
  }));
  private readonly carregamento = carregarAoMudar(this.chave, ({ nrPedido, nrOrdProd }) =>
    this.repository.obterOrdem(nrPedido, nrOrdProd),
  );
  protected readonly ordem = this.carregamento.dados;
  protected readonly carregando = this.carregamento.carregando;

  protected readonly linhas = computed(() => (this.ordem()?.itens ?? []).map(toLinha));
  protected readonly selecionados = linkedSignal(() => this.linhas().filter((l) => l.$selected));

  protected readonly titulo = computed(() =>
    this.nrOrdProd() === NR_ORDEM_SEM_ORDEM
      ? 'Itens sem ordem de produção'
      : `Ordem ${this.nrOrdProd()}${this.ordem() ? ' — ' + this.ordem()!.itCodigo : ''}`,
  );

  protected readonly breadcrumb = computed<PoBreadcrumb>(() => ({
    items: [
      { label: 'Pedidos', link: '/pedidos' },
      { label: `Pedido ${this.nrPedido()}`, link: `/pedidos/${this.nrPedido()}` },
      { label: this.titulo() },
    ],
  }));

  protected readonly acoes = computed<PoPageAction[]>(() => [
    {
      label: `Imprimir etiquetas (${this.selecionados().length})`,
      action: () => this.modalImpressao().abrir(),
      disabled: this.selecionados().length === 0,
    },
    { label: 'Atualizar', action: () => this.carregamento.recarregar() },
  ]);

  protected readonly colunas: PoTableColumn[] = [
    { property: 'itCodigo', label: 'Item', width: '140px' },
    { property: 'descItem', label: 'Descrição' },
    { property: 'unidade', label: 'UN', width: '60px' },
    { property: 'quantidadeNecessaria', label: 'Necessária', type: 'number', format: '1.0-4' },
    { property: 'quantidadeAtendida', label: 'Atendida', type: 'number', format: '1.0-4' },
    { property: 'quantidadePendente', label: 'Pendente', type: 'number', format: '1.0-4' },
    colunaSituacao('Atendido'),
  ];

  protected atualizarSelecao(): void {
    this.selecionados.set(this.linhas().filter((linha) => linha.$selected));
  }
}
