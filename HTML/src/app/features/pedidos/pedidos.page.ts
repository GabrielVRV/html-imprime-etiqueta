import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { map } from 'rxjs';

import { telaPequena } from '../../core/layout/tela-pequena';
import { carregarAoMudar } from '../../core/state/carregar-ao-mudar';
import { FiltroPedidos, Pedido } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';

@Component({
  selector: 'app-pedidos-page',
  imports: [PoPageModule, PoTableModule],
  templateUrl: './pedidos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  private readonly router = inject(Router);
  private readonly repository = inject(PedidoRepository);
  private readonly pequena = telaPequena();

  private readonly filtro = signal<FiltroPedidos>({ busca: '', pagina: 1 });
  private readonly carregamento = carregarAoMudar(this.filtro, (filtro) =>
    this.repository.listarPedidos(filtro).pipe(map((pagina) => ({ filtro, ...pagina }))),
  );

  /** Página 1 substitui a lista; as seguintes ("Carregar mais") são acrescentadas. */
  protected readonly pedidos = linkedSignal({
    source: this.carregamento.dados,
    computation: (resultado, anterior?: { value: Pedido[] }): Pedido[] => {
      if (!resultado) return [];
      if (resultado.filtro.pagina === 1) return resultado.pedidos;
      return [...(anterior?.value ?? []), ...resultado.pedidos];
    },
  });

  protected readonly temMais = computed(() => this.carregamento.dados()?.temMais ?? false);
  protected readonly carregandoPrimeiraPagina = computed(
    () => this.carregamento.carregando() && this.filtro().pagina === 1,
  );
  protected readonly carregandoMais = computed(
    () => this.carregamento.carregando() && this.filtro().pagina > 1,
  );

  protected readonly pesquisa: PoPageFilter = {
    placeholder: 'Pedido do cliente, pedido ou cliente',
    action: (texto: string) => this.filtro.set({ busca: (texto ?? '').trim(), pagina: 1 }),
  };

  protected readonly acoesPagina: PoPageAction[] = [
    { label: 'Atualizar', action: () => this.filtro.set({ ...this.filtro(), pagina: 1 }) },
  ];

  protected readonly colunas = computed<PoTableColumn[]>(() => [
    {
      property: 'nrPedCli',
      label: 'Pedido cliente',
      type: 'link',
      action: (_: string, pedido: Pedido) => this.abrir(pedido),
    },
    { property: 'nrPedido', label: 'Pedido', width: '100px', visible: !this.pequena() },
    { property: 'nomeAbrev', label: 'Cliente' },
    { property: 'dataEntrega', label: 'Entrega', type: 'date', visible: !this.pequena() },
    { property: 'qtdOrdens', label: 'Ordens', type: 'number', visible: !this.pequena() },
    { property: 'qtdItensPendentes', label: 'Pendentes', type: 'number' },
  ]);

  /** Parte da última página recebida: se "Carregar mais" falhar, tentar de novo pede a mesma. */
  protected carregarMais(): void {
    const ultimo = this.carregamento.dados()?.filtro;
    if (ultimo) this.filtro.set({ ...ultimo, pagina: ultimo.pagina + 1 });
  }

  private abrir(pedido: Pedido): void {
    this.router.navigate(['/pedidos', pedido.nrPedido]);
  }
}
