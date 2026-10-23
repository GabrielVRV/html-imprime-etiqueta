import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoDatepickerRange,
  PoFieldModule,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { carregarAoMudar } from '../../core/state/carregar-ao-mudar';
import { FiltroPedidos, Pedido } from '../../domain/models';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { percentualSeparado } from '../../domain/rules/etiqueta.rules';
import { ProgressoSeparacaoComponent } from '../../shared/components/progresso-separacao.component';
import {
  colunaProgresso,
  colunaSituacao,
  SituacaoSeparacao,
  situacaoSeparacao,
} from '../../shared/table/situacao-separacao';
import { hojeMaisDias, paraIso } from '../../shared/utils/data-iso';

interface LinhaPedido extends Pedido {
  percentualSeparado: number;
  situacao: SituacaoSeparacao;
}

const toLinha = (pedido: Pedido): LinhaPedido => ({
  ...pedido,
  percentualSeparado: percentualSeparado(pedido.qtdItens, pedido.qtdItensPendentes),
  situacao: situacaoSeparacao(pedido.qtdItensPendentes),
});

const contemTexto = (pedido: Pedido, texto: string): boolean =>
  [pedido.nrPedido, pedido.nrPedCli, pedido.nomeAbrev, pedido.codEmitente].some((campo) =>
    String(campo).toLowerCase().includes(texto),
  );

@Component({
  selector: 'app-pedidos-page',
  imports: [FormsModule, PoPageModule, PoTableModule, PoFieldModule, ProgressoSeparacaoComponent],
  templateUrl: './pedidos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  private readonly router = inject(Router);
  private readonly repository = inject(PedidoRepository);

  // O datepicker reemite o valor ao receber o model; a igualdade evita recarregar em loop.
  protected readonly filtro = signal<FiltroPedidos>(
    { dataEntregaInicial: hojeMaisDias(-30), dataEntregaFinal: hojeMaisDias(30) },
    {
      equal: (a, b) =>
        a.dataEntregaInicial === b.dataEntregaInicial && a.dataEntregaFinal === b.dataEntregaFinal,
    },
  );
  private readonly busca = signal('');

  private readonly carregamento = carregarAoMudar(this.filtro, (filtro) =>
    this.repository.listarPedidos(filtro),
  );
  protected readonly carregando = this.carregamento.carregando;

  protected readonly linhas = computed(() => {
    const texto = this.busca().trim().toLowerCase();
    const pedidos = this.carregamento.dados() ?? [];
    return (texto ? pedidos.filter((p) => contemTexto(p, texto)) : pedidos).map(toLinha);
  });

  protected readonly pesquisa: PoPageFilter = {
    placeholder: 'Pedido, pedido do cliente ou cliente',
    action: (texto: string) => this.busca.set(texto ?? ''),
  };

  protected readonly colunas: PoTableColumn[] = [
    { property: 'nrPedido', label: 'Pedido', width: '110px' },
    { property: 'nrPedCli', label: 'Pedido cliente' },
    { property: 'nomeAbrev', label: 'Cliente' },
    { property: 'dataEntrega', label: 'Entrega', type: 'date', width: '120px' },
    { property: 'qtdOrdens', label: 'Ordens', type: 'number', width: '90px' },
    { property: 'qtdItensPendentes', label: 'Itens pendentes', type: 'number', width: '140px' },
    colunaProgresso,
    colunaSituacao(),
  ];

  protected readonly acoes: PoTableAction[] = [
    { label: 'Ver ordens', action: (linha: LinhaPedido) => this.abrir(linha) },
  ];

  protected readonly periodo = computed<PoDatepickerRange>(() => ({
    start: this.filtro().dataEntregaInicial,
    end: this.filtro().dataEntregaFinal,
  }));

  protected alterarPeriodo(periodo: PoDatepickerRange | null): void {
    if (!periodo?.start || !periodo.end) return;
    this.filtro.set({
      dataEntregaInicial: paraIso(periodo.start),
      dataEntregaFinal: paraIso(periodo.end),
    });
  }

  private abrir(pedido: Pedido): void {
    this.router.navigate(['/pedidos', pedido.nrPedido]);
  }
}
