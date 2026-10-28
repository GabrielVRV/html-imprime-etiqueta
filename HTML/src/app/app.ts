import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';

/**
 * Fora do iframe do menu do Datasul a tela não abre (mesmo bloqueio do Cadastro de
 * Impressoras e do Padrão Relatórios). Sem o router-outlet nenhuma página monta, então
 * nada chama a API. É só de interface: quem barra de verdade é o Datasul, que não
 * responde a API sem sessão.
 */
const foraDoDatasul = environment.bloquearForaDoDatasul && window.self === window.top;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (foraDoDatasul) {
      <div class="tela-bloqueio">
        <div class="tela-bloqueio__card">
          <p class="tela-bloqueio__title">Acesso restrito</p>
          <p class="tela-bloqueio__hint">
            Esta tela só pode ser acessada por dentro do menu oficial do TOTVS Datasul.
          </p>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    .tela-bloqueio {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      box-sizing: border-box;
      background: #0b111c;
      font-family: Roboto, 'Segoe UI', Arial, sans-serif;
    }

    .tela-bloqueio__card {
      max-width: 420px;
      padding: 32px 36px;
      text-align: center;
      background: #131b28;
      border: 1px solid #273345;
      border-top: 3px solid #ff8078;
      border-radius: 16px;
      box-shadow:
        0 6px 20px -6px rgba(0, 0, 0, 0.55),
        0 1px 3px rgba(0, 0, 0, 0.4);
    }

    .tela-bloqueio__title {
      font-size: 17px;
      font-weight: 600;
      color: #ff8078;
      margin: 0 0 8px;
    }

    .tela-bloqueio__hint {
      font-size: 14px;
      color: #a7b5c9;
      margin: 0;
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly foraDoDatasul = foraDoDatasul;
}
