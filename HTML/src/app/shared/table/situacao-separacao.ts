import { PoTableColumn, PoTagType } from '@po-ui/ng-components';

export type SituacaoSeparacao = 'pendente' | 'completo';

export const situacaoSeparacao = (qtdPendentes: number): SituacaoSeparacao =>
  qtdPendentes > 0 ? 'pendente' : 'completo';

export const colunaSituacao = (rotuloCompleto = 'Completo'): PoTableColumn => ({
  property: 'situacao',
  label: 'Situação',
  type: 'label',
  width: '130px',
  labels: [
    { value: 'pendente', label: 'Pendente', type: PoTagType.Warning },
    { value: 'completo', label: rotuloCompleto, type: PoTagType.Success },
  ],
});
