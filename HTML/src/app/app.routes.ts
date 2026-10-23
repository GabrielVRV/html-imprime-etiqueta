import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
  {
    path: 'pedidos',
    title: 'Pedidos',
    loadComponent: () => import('./features/pedidos/pedidos.page').then((m) => m.PedidosPage),
  },
  {
    path: 'pedidos/:nrPedido',
    title: 'Ordens do pedido',
    loadComponent: () =>
      import('./features/pedido-detalhe/pedido-detalhe.page').then((m) => m.PedidoDetalhePage),
  },
  {
    path: 'pedidos/:nrPedido/ordens/:nrOrdProd',
    title: 'Itens da ordem',
    loadComponent: () =>
      import('./features/ordem-itens/ordem-itens.page').then((m) => m.OrdemItensPage),
  },
  { path: '**', redirectTo: 'pedidos' },
];
