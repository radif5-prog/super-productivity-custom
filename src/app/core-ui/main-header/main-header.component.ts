import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { T } from '../../t.const';
import { filter, map, switchMap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { SnackService } from '../../core/snack/snack.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { KeyboardConfig, keyboardConfigOrEmpty } from '@sp/keyboard-config';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleCounterButtonComponent } from '../../features/simple-counter/simple-counter-button/simple-counter-button.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LongPressDirective } from '../../ui/longpress/longpress.directive';
import { isOnline$ } from '../../util/is-online';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { SyncStatus } from '../../op-log/sync-exports';
import { PluginHeaderBtnsComponent } from '../../plugins/ui/plugin-header-btns.component';
import { PluginWorkContextHeaderBtnsComponent } from '../../plugins/ui/plugin-work-context-header-btns.component';
import { PluginSidePanelBtnsComponent } from '../../plugins/ui/plugin-side-panel-btns.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { PageTitleComponent } from './page-title/page-title.component';
import { PlayButtonComponent } from './play-button/play-button.component';
import { TrackedTaskPillComponent } from './tracked-task-pill/tracked-task-pill.component';
import { RemoteTrackingPillComponent } from '../../features/tracking-presence/remote-tracking-pill/remote-tracking-pill.component';
import { TrackingPresenceService } from '../../features/tracking-presence/tracking-presence.service';
import { DesktopPanelButtonsComponent } from './desktop-panel-buttons/desktop-panel-buttons.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { FocusButtonComponent } from './focus-button/focus-button.component';
import { EmlDropDirective } from '../../core/drop-paste-input/eml-drop.directive';
import { wheelDeltaPx } from '../../util/wheel-delta-px';
import { openSyncSettingsDialog } from '../../imex/sync/open-sync-settings-dialog';

const ACTION_ROW_REVEAL_PIN_MS = 400;

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
    TranslatePipe,
    SimpleCounterButtonComponent,
    LongPressDirective,
    EmlDropDirective,
    PluginHeaderBtnsComponent,
    PluginWorkContextHeaderBtnsComponent,
    PluginSidePanelBtnsComponent,
    CdkScrollable,
    PageTitleComponent,
    PlayButtonComponent,
    TrackedTaskPillComponent,
    RemoteTrackingPillComponent,
    DesktopPanelButtonsComponent,
    FocusButtonComponent,
  ],
})
export class MainHeaderComponent implements OnDestroy {
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _destroyRef = inject(DestroyRef);
  private _teleportedNav: HTMLElement | null = null;
  private _teleportObserver: MutationObserver | null = null;
  readonly projectService = inject(ProjectService);
  readonly matDialog = inject(MatDialog);
  readonly workContextService = inject(WorkContextService);
  readonly taskService = inject(TaskService);
  readonly layoutService = inject(LayoutService);
  readonly simpleCounterService = inject(SimpleCounterService);
  readonly syncWrapperService = inject(SyncWrapperService);
  readonly globalConfigService = inject(GlobalConfigService);
  private readonly _snackService = inject(SnackService);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _dataInitStateService = inject(DataInitStateService);

  readonly toggleMobileNavEvent = output<void>();

  readonly isDataLoaded = toSignal(this._dataInitStateService.isAllDataLoadedInitially$, {
    initialValue: false,
  });

  readonly T = T;
  readonly isXs = this.layoutService.isXs;

  private readonly _currentTaskContext$ = this.taskService.currentTaskParentOrCurrent$.pipe(
    filter((ct) => !!ct),
    switchMap((currentTask) =>
      this.workContextService.activeWorkContextId$.pipe(
        filter((activeWorkContextId) => !!activeWorkContextId),
        switchMap((activeWorkContextId) => {
          if (
            currentTask.projectId === activeWorkContextId ||
            currentTask.tagIds.includes(activeWorkContextId as string)
          ) {
            return of(null);
          }
          return currentTask.projectId
            ? this.projectService.getByIdOnce$(currentTask.projectId)
            : of(null);
        }),
      ),
    ),
  );

  readonly currentTaskContext = toSignal(this._currentTaskContext$);
  readonly currentTask = toSignal(this.taskService.currentTask$);
  readonly currentTaskId = this.taskService.currentTaskId;
  readonly isRemoteTrackingShown = inject(TrackingPresenceService).isRemoteSessionShown;
  readonly enabledSimpleCounters = toSignal(this.simpleCounterService.enabledSimpleCounters$, {
    initialValue: [],
  });
  readonly isShowIssuePanel = this.layoutService.isShowIssuePanel;
  readonly isShowNotes = this.layoutService.isShowNotes;
  readonly isShowScheduleDayPanel = this.layoutService.isShowScheduleDayPanel;

  readonly isIssuesPanelEnabled = computed(
    () => this.globalConfigService.appFeatures().isIssuesPanelEnabled,
  );
  readonly isScheduleDayPanelEnabled = computed(
    () => this.globalConfigService.appFeatures().isSchedulerEnabled,
  );
  readonly isProjectNotesEnabled = computed(
    () => this.globalConfigService.appFeatures().isProjectNotesEnabled,
  );

  /** Number of built-in panel actions shown by the mobile overflow menu. */
  readonly mobilePanelItemCount = computed(
    () =>
      Number(this.isScheduleDayPanelEnabled()) +
      Number(this.isIssuesPanelEnabled()) +
      Number(this.isProjectNotesEnabled()),
  );

  private readonly _activePanelKey = computed<string | null>(() => {
    if (this.isShowNotes()) {
      return 'NOTES';
    }
    if (this.isShowIssuePanel()) {
      return 'ISSUES';
    }
    if (this.isShowScheduleDayPanel()) {
      return 'SCHEDULE';
    }
    if (this.layoutService.isShowPluginPanel()) {
      return `PLUGIN:${this.layoutService.activePluginId()}`;
    }
    return null;
  });

  readonly syncIsEnabledAndReady = toSignal(this.syncWrapperService.isEnabledAndReady$);
  readonly syncState = toSignal(this.syncWrapperService.syncState$);
  readonly isSyncInProgress = toSignal(this.syncWrapperService.isSyncInProgress$);
  readonly hasNoPendingOps = toSignal(this.syncWrapperService.hasNoPendingOps$, {
    initialValue: false,
  });
  readonly superSyncIsConfirmedInSync = toSignal(
    this.syncWrapperService.superSyncIsConfirmedInSync$,
    { initialValue: false },
  );
  readonly isOnline = toSignal(isOnline$);

  readonly syncTooltip = computed(() => {
    if (!this.syncIsEnabledAndReady()) {
      return T.MH.TRIGGER_SYNC;
    }
    if (!this.isOnline()) {
      return T.MH.SYNC_STATE.OFFLINE;
    }
    if (this.syncState() === 'ERROR') {
      return T.MH.SYNC_STATE.ERROR;
    }
    if (this.isSyncInProgress()) {
      return T.MH.SYNC_STATE.SYNCING;
    }
    if (this.hasNoPendingOps()) {
      return this.superSyncIsConfirmedInSync()
        ? T.MH.SYNC_STATE.IN_SYNC_CONFIRMED
        : T.MH.SYNC_STATE.IN_SYNC;
    }
    return T.MH.TRIGGER_SYNC;
  });

  readonly syncIcon = computed(() => {
    if (!this.syncIsEnabledAndReady()) {
      return 'sync_off';
    }
    if (!this.isOnline()) {
      return 'wifi_off';
    }
    if (this.syncState() === 'ERROR') {
      return 'sync_error';
    }
    if (this.isSyncInProgress()) {
      return 'sync_ring';
    }
    return this.hasNoPendingOps() ? 'sync_done' : 'sync_ring';
  });

  readonly isSyncIconSpinning = computed(
    () => this.syncIcon() === 'sync_ring' && !!this.isSyncInProgress(),
  );

  readonly syncConfirmation = computed(() => {
    if (!this.syncIsEnabledAndReady() || !this.isOnline() || !this.hasNoPendingOps()) {
      return null;
    }
    return this.superSyncIsConfirmedInSync() ? 'remote' : 'local';
  });

  readonly isTimeTrackingEnabled = computed(
    () => this.globalConfigService.appFeatures().isTimeTrackingEnabled,
  );
  readonly isFocusModeEnabled = computed(
    () => this.globalConfigService.appFeatures().isFocusModeEnabled,
  );
  readonly isSyncIconEnabled = computed(
    () => this.globalConfigService.appFeatures().isSyncIconEnabled,
  );
  readonly hasBottomNav = this.layoutService.isShowMobileBottomNav;

  readonly hasCounterDropdown = computed(
    () => this.isXs() && this.enabledSimpleCounters().some((c) => !c.isHideButton),
  );
  readonly isShowSimpleCounterBtnsDropdown = signal(false);
  readonly isAnyCounterRunning = computed(() =>
    this.enabledSimpleCounters().some((c) => c.isOn && !c.isHideButton),
  );

  private readonly _hasTrackableTasks$ = this.workContextService.undoneTasks$.pipe(
    map((tasks) => tasks.length > 0),
  );
  readonly hasTrackableTasks = toSignal(this._hasTrackableTasks$, { initialValue: true });

  private readonly _subs = new Subscription();

  private readonly _isVerticalActionBar = computed(
    () => !this.isXs() && !!this.globalConfigService.misc()?.isVerticalActionBar,
  );

  private readonly _actionScroll =
    viewChild.required<ElementRef<HTMLElement>>('actionScroll');

  readonly canScrollFurther = signal(false);
  readonly canScrollBack = signal(false);

  private _pendingReveal: { edge: 'start' | 'end'; until: number } | null = null;
  private _isViewReady = false;

  onActionScroll(): void {
    const el = this._actionScroll().nativeElement;
    const travelled = Math.abs(el.scrollLeft);
    this.canScrollFurther.set(travelled + el.clientWidth < el.scrollWidth - 2);
    this.canScrollBack.set(travelled > 2);
  }

  onActionWheel(ev: WheelEvent): void {
    if (ev.deltaX !== 0) {
      return;
    }

    const el = this._actionScroll().nativeElement;
    if (el.scrollWidth - el.clientWidth <= 0) {
      return;
    }

    const towardsEnd = document.documentElement.dir === 'rtl' ? -1 : 1;
    const step = towardsEnd * wheelDeltaPx(ev.deltaY, ev.deltaMode, el.clientWidth);
    const before = el.scrollLeft;
    el.scrollLeft = before + step;

    if (el.scrollLeft !== before) {
      ev.preventDefault();
    }
  }

  toggleMobileNav(): void {
    this.toggleMobileNavEvent.emit();
  }

  toggleIssuePanel(): void {
    this.layoutService.toggleAddTaskPanel();
  }

  toggleNotes(): void {
    this.layoutService.toggleNotes();
  }

  toggleScheduleDayPanel(): void {
    this.layoutService.toggleScheduleDayPanel();
  }

  constructor() {
    effect(() => {
      if (!this.hasCounterDropdown()) {
        this.isShowSimpleCounterBtnsDropdown.set(false);
      }
    });

    effect(() => {
      const enabled = this._isVerticalActionBar();
      this.isDataLoaded();
      this._syncTeleport(enabled);
    });

    let prevTrackedId: string | null | undefined;
    effect(() => {
      const trackedId = this.currentTaskId() ?? null;
      const isFirstRun = prevTrackedId === undefined;
      const isChanged = trackedId !== prevTrackedId;
      prevTrackedId = trackedId;

      if (isFirstRun || !isChanged) {
        return;
      }

      untracked(() => this._reveal('start'));
    });

    let prevPanelKey: string | null | undefined;
    effect(() => {
      const panelKey = this._activePanelKey();
      const isFirstRun = prevPanelKey === undefined;
      const isChanged = panelKey !== prevPanelKey;
      prevPanelKey = panelKey;

      if (isFirstRun || !isChanged) {
        return;
      }

      untracked(() => {
        if (this.hasBottomNav()) {
          return;
        }
        this._reveal(panelKey === null ? 'start' : 'end');
      });
    });

    afterNextRender(() => {
      this._isViewReady = true;
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const el = this._actionScroll().nativeElement;
      const ro = new ResizeObserver(() => {
        this.onActionScroll();
        this._applyPendingReveal('auto');
      });
      ro.observe(el);
      this._destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  private _reveal(edge: 'start' | 'end'): void {
    this._pendingReveal = { edge, until: Date.now() + ACTION_ROW_REVEAL_PIN_MS };
    this._applyPendingReveal('smooth');
  }

  private _applyPendingReveal(behavior: ScrollBehavior): void {
    const pending = this._pendingReveal;
    if (!pending || !this._isViewReady) {
      return;
    }

    if (Date.now() > pending.until) {
      this._pendingReveal = null;
      return;
    }

    const el = this._actionScroll().nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      return;
    }

    const towardsEnd = document.documentElement.dir === 'rtl' ? -1 : 1;
    const left = pending.edge === 'start' ? 0 : towardsEnd * maxScroll;
    el.scrollTo({
      left,
      behavior: this._prefersReducedMotion() ? 'auto' : behavior,
    });
  }

  private _prefersReducedMotion(): boolean {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private _syncTeleport(enabled: boolean): void {
    if (enabled) {
      if (this._teleportedNav?.isConnected) {
        return;
      }

      if (!this._teleportNav()) {
        this._teleportObserver?.disconnect();
        this._teleportObserver = new MutationObserver(() => {
          if (this._teleportNav()) {
            this._teleportObserver?.disconnect();
          }
        });
        this._teleportObserver.observe(this._elRef.nativeElement, {
          childList: true,
          subtree: true,
        });
      }
      return;
    }

    this._teleportObserver?.disconnect();
    this._teleportObserver = null;
    this._restoreNav();
  }

  private _teleportNav(): boolean {
    if (this._teleportedNav?.isConnected) {
      return true;
    }

    this._teleportedNav = null;
    const nav = this._elRef.nativeElement.querySelector(
      'nav.action-nav-right',
    ) as HTMLElement | null;
    if (!nav) {
      return false;
    }

    nav.classList.add('action-nav-right--teleported');
    document.body.appendChild(nav);
    this._teleportedNav = nav;
    return true;
  }

  private _restoreNav(): void {
    const nav = this._teleportedNav;
    if (!nav) {
      return;
    }

    this._teleportedNav = null;
    nav.classList.remove('action-nav-right--teleported');
    const wrapper = this._elRef.nativeElement.querySelector('.wrapper');
    if (wrapper) {
      wrapper.appendChild(nav);
    } else {
      nav.remove();
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._teleportObserver?.disconnect();
    this._teleportedNav?.remove();
    this._teleportedNav = null;
  }

  trackById(_index: number, item: SimpleCounter): string {
    return item.id;
  }

  sync(): void {
    this.syncWrapperService.sync(true).then((r) => {
      if (this._snackService.hasPendingPersistentAction()) {
        return;
      }

      if (
        r === SyncStatus.UpdateLocal ||
        r === SyncStatus.UpdateRemoteAll ||
        r === SyncStatus.UpdateRemote
      ) {
        this._snackService.open({ type: 'SUCCESS', msg: T.F.SYNC.S.SUCCESS_VIA_BUTTON });
      } else if (r === SyncStatus.InSync) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.S.ALREADY_IN_SYNC,
        });
      }
    });
  }

  onSyncButtonClick(): void {
    if (this.syncIsEnabledAndReady()) {
      this.sync();
    } else {
      this.setupSync();
    }
  }

  private dialogSyncCfgRef: MatDialogRef<unknown> | null = null;

  async setupSync(): Promise<void> {
    if (this.dialogSyncCfgRef) {
      return;
    }

    this.dialogSyncCfgRef = await openSyncSettingsDialog(
      this.matDialog,
      this._configService.sync(),
    );
    this._subs.add(
      this.dialogSyncCfgRef.afterClosed().subscribe(() => {
        this.dialogSyncCfgRef = null;
      }),
    );
  }

  get kb(): KeyboardConfig {
    return keyboardConfigOrEmpty(this._configService.cfg()?.keyboard as KeyboardConfig);
  }
}
