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
import { DecimalPipe } from '@angular/common';
import {
  PoBreadcrumb,
  PoInfoModule,
  PoPageAction,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { telaPequena } from '../../core/layout/tela-pequena';
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
  itemCompleto: string;
  situacao: SituacaoSeparacao;
}

const toLinha = (item: ItemSeparacao): LinhaItem => ({
  ...item,
  $selected: estaPendente(item),
  itemCompleto: `${item.itCodigo} - ${item.descItem}`,
  situacao: situacaoSeparacao(item.quantidadePendente),
});

@Component({
  selector: 'app-ordem-itens-page',
  imports: [DecimalPipe, PoPageModule, PoTableModule, PoInfoModule, ImpressaoModalComponent],
  templateUrl: './ordem-itens.page.html',
  styleUrl: '../../shared/styles/resumo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdemItensPage {
  private readonly repository = inject(PedidoRepository);
  private readonly pequena = telaPequena();
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
  protected readonly semOrdem = computed(() => this.nrOrdProd() === NR_ORDEM_SEM_ORDEM);
  protected readonly qtdPendentes = computed(() => this.linhas().filter(estaPendente).length);
  protected readonly selecionados = linkedSignal(() => this.linhas().filter((l) => l.$selected));

  protected readonly titulo = computed(() =>
    this.semOrdem()
      ? 'Itens sem ordem de produção'
      : `Ordem ${this.nrOrdProd()}${this.ordem() ? ' — ' + this.ordem()!.itCodigo : ''}`,
  );

  protected readonly breadcrumb = computed<PoBreadcrumb>(() => ({
    items: [
      { label: 'Pedidos', link: '/pedidos' },
      { label: `Pedido ${this.nrPedido()}`, link: `/pedidos/${this.nrPedido()}` },
      { label: this.semOrdem() ? 'Sem ordem' : `Ordem ${this.nrOrdProd()}` },
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

  protected readonly colunas = computed<PoTableColumn[]>(() => [
    // No celular código e descrição dividem uma coluna para caber sem rolagem lateral.
    { property: 'itemCompleto', label: 'Item', visible: this.pequena() },
    { property: 'itCodigo', label: 'Item', width: '130px', visible: !this.pequena() },
    { property: 'descItem', label: 'Descrição', visible: !this.pequena() },
    { property: 'unidade', label: 'UN', width: '60px', visible: !this.pequena() },
    {
      property: 'quantidadeNecessaria',
      label: 'Necessária',
      type: 'number',
      format: '1.0-4',
      visible: !this.pequena(),
    },
    {
      property: 'quantidadeAtendida',
      label: 'Atendida',
      type: 'number',
      format: '1.0-4',
      visible: !this.pequena(),
    },
    { property: 'quantidadePendente', label: 'Pendente', type: 'number', format: '1.0-4' },
    { ...colunaSituacao('Atendido'), visible: !this.pequena() },
  ]);

  protected atualizarSelecao(): void {
    this.selecionados.set(this.linhas().filter((linha) => linha.$selected));
  }
}
