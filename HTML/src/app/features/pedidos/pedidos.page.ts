import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { telaPequena } from '../../core/layout/tela-pequena';
import { carregar } from '../../core/state/carregar-ao-mudar';
import { Pedido } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';

const contemTexto = (pedido: Pedido, texto: string): boolean =>
  [pedido.nrPedido, pedido.nrPedCli, pedido.nomeAbrev, pedido.codEmitente].some((campo) =>
    String(campo).toLowerCase().includes(texto),
  );

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

  private readonly busca = signal('');
  private readonly carregamento = carregar(() => this.repository.listarPedidos());
  protected readonly carregando = this.carregamento.carregando;

  protected readonly pedidos = computed(() => {
    const texto = this.busca().trim().toLowerCase();
    const pedidos = this.carregamento.dados() ?? [];
    return texto ? pedidos.filter((pedido) => contemTexto(pedido, texto)) : pedidos;
  });

  protected readonly pesquisa: PoPageFilter = {
    placeholder: 'Pedido ou cliente',
    action: (texto: string) => this.busca.set(texto ?? ''),
  };

  protected readonly acoesPagina: PoPageAction[] = [
    { label: 'Atualizar', action: () => this.carregamento.recarregar() },
  ];

  protected readonly colunas = computed<PoTableColumn[]>(() => [
    {
      property: 'nrPedido',
      label: 'Pedido',
      type: 'link',
      width: this.pequena() ? undefined : '100px',
      action: (_: number, pedido: Pedido) => this.abrir(pedido),
    },
    { property: 'nomeAbrev', label: 'Cliente' },
    { property: 'nrPedCli', label: 'Pedido cliente', visible: !this.pequena() },
    { property: 'dataEntrega', label: 'Entrega', type: 'date', visible: !this.pequena() },
    { property: 'qtdOrdens', label: 'Ordens', type: 'number', visible: !this.pequena() },
    { property: 'qtdItensPendentes', label: 'Pendentes', type: 'number' },
  ]);

  private abrir(pedido: Pedido): void {
    this.router.navigate(['/pedidos', pedido.nrPedido]);
  }
}
