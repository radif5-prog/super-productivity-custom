import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuItem } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { BoardCfg } from '../boards.model';
import { BoardsService } from '../boards.service';
import { getViewLayoutSwitch } from '../boards.util';
import { LayoutService } from '../../../core-ui/layout/layout.service';

/**
 * A view's ⋮ menu, shared by its side-menu row and the title bar. Open it with
 * `[matMenuTriggerFor]="viewMenu.menu()"`.
 */
@Component({
  selector: 'view-menu',
  standalone: true,
  imports: [MatIcon, MatMenu, MatMenuContent, MatMenuItem, TranslatePipe],
  // The items sit in this template, next to their <mat-menu>: MatMenu's arrow
  // keys only reach items written in its own template (#11403).
  template: `
    <mat-menu #menu="matMenu">
      <ng-template matMenuContent>
        @if (isXs()) {
          @let layoutSwitch = viewLayoutSwitch();
          <button
            mat-menu-item
            (click)="toggleViewLayout()"
          >
            <mat-icon>{{ layoutSwitch.icon }}</mat-icon>
            <span>{{ layoutSwitch.label | translate }}</span>
          </button>
        }
        <button
          mat-menu-item
          (click)="boardsService.editBoard(board())"
        >
          <mat-icon>edit</mat-icon>
          <span>{{ T.G.EDIT | translate }}</span>
        </button>
        <button
          mat-menu-item
          (click)="boardsService.duplicateBoard(board())"
        >
          <mat-icon>file_copy</mat-icon>
          <span>{{ T.G.DUPLICATE | translate }}</span>
        </button>
        <button
          mat-menu-item
          (click)="boardsService.removeBoard(board())"
        >
          <mat-icon class="color-warn-i">delete_forever</mat-icon>
          <span>{{ T.G.DELETE | translate }}</span>
        </button>
      </ng-template>
    </mat-menu>
  `,
  // Renders only a <mat-menu>, which draws into the overlay: the host must not
  // take part in layout (e.g. take a flex gap).
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewMenuComponent {
  readonly boardsService = inject(BoardsService);
  readonly isXs = inject(LayoutService).isXs;
  board = input.required<BoardCfg>();
  readonly menu = viewChild.required(MatMenu);
  protected readonly T = T;

  protected viewLayoutSwitch(): ReturnType<typeof getViewLayoutSwitch> {
    return getViewLayoutSwitch(this.board());
  }

  protected toggleViewLayout(): void {
    const board = this.board();
    this.boardsService.setViewLayout(board, this.viewLayoutSwitch().layout);
  }
}
