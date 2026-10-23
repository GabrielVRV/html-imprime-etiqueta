import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { ImpressaoRepository } from '../domain/repositories/impressao.repository';
import { PedidoRepository } from '../domain/repositories/pedido.repository';
import { ImpressaoHttpRepository } from './http/impressao-http.repository';
import { PedidoHttpRepository } from './http/pedido-http.repository';
import { ImpressaoMockRepository } from './mock/impressao-mock.repository';
import { PedidoMockRepository } from './mock/pedido-mock.repository';

export function provideRepositories({ useMock }: { useMock: boolean }): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PedidoRepository, useClass: useMock ? PedidoMockRepository : PedidoHttpRepository },
    {
      provide: ImpressaoRepository,
      useClass: useMock ? ImpressaoMockRepository : ImpressaoHttpRepository,
    },
  ]);
}
