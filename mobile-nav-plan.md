Результаты анализа

1. MagicSideNav: MatSidenav в добавленных файлах не  
   используется

В проекте мобильное меню реализовано не через Angular  
Material MatSidenav, а собственным <nav class="nav-sidenav">в:

• src/app/core-ui/magic-side-nav/magic-side-nav.component.h tml  
 • src/app/core-ui/magic-side-nav/magic-side-nav.component.t s  
 • src/app/core-ui/magic-side-nav/magic-side-nav.component.s css

Следовательно, свойств Material position="start" /  
position="end" и mode="over" / mode="push" здесь нет.  
Эквивалент режима over реализован CSS-ом: .nav-sidenav имеетposition: fixed, а затемнение — .nav-backdrop-mobile, также
fixed.

Сейчас меню принудительно находится справа именно из-за:

• в HTML: [class.position-right]="isMobile()";  
 • в SCSS: .nav-sidenav.position-right { left: auto; right:
0; ... };  
 • анимация названа mobileNavRight, поэтому направление  
 transform-анимации, вероятно, также задано справа в не  
 добавленном файле magic-side-nav.animations.ts.

---

План изменений

1. Перенести мобильное боковое меню влево

Файл:  
src/app/core-ui/magic-side-nav/magic-side-nav.component.html
1 Убрать мобильное назначение класса position-right у  
 элемента <nav class="nav-sidenav">:  
 • сейчас: [class.position-right]="isMobile()";  
 • на мобильном меню этот класс больше не должен  
 добавляться;  
 • класс можно сохранить только для потенциальной  
 отдельной десктопной конфигурации, если она реально  
 поддерживается.  
 2 Не добавлять position="start" или mode="over": это не  
 MatSidenav.  
 • Текущее поведение уже соответствует over: drawer  
 поверх контента, фиксированная позиция, отдельный  
 backdrop.  
 • Нужно сохранить именно это поведение, изменив лишь  
 сторону появления.

Файл:  
src/app/core-ui/magic-side-nav/magic-side-nav.component.scss
1 Базовое положение .nav-sidenav уже левое:  
 • left: 0;  
 • right не задан;  
 • border-right и тень ориентированы для левого меню.  
 После удаления position-right на мобильном меню оно  
 автоматически станет левым.  
 2 Проверить, что мобильный блок .nav-sidenav.mobile не  
 переопределяет left/right. Сейчас он задаёт ширину, фон и тень, но сторону не меняет — дополнительных изменений  
 там, вероятно, не потребуется.  
 3 Блок .nav-sidenav.position-right оставить только если  
 приложение поддерживает правую боковую панель на desktop. Не использовать его для mobile.  
 4 Оставить .nav-backdrop-mobile на весь viewport (inset:  
 0), так как его положение не зависит от стороны drawer.

Файл, который необходимо добавить для просмотра перед  
реализацией:

src/app/core-ui/magic-side-nav/magic-side-nav.animations.ts

1 В шаблоне используется триггер [@mobileNavRight].  
 2 Нужно переименовать его в нейтральный, например  
 mobileNav, либо оставить имя для совместимости, но  
 изменить transform-анимацию.  
 3 Для состояния открытия drawer должен входить слева:  
 • скрытое состояние: translateX(-100%);  
 • видимое состояние: translateX(0).  
 4 Анимацию backdrop менять не нужно, если она завязана  
 только на opacity.  
 5 Длительность должна остаться синхронизированной с  
 задержкой снятия isOpeningMobileNav в  
 MagicSideNavComponent:  
 • сейчас комментарий указывает длительность около 225ms; • guard снимается через 300ms;  
 • при изменении duration обновить комментарий и  
 таймер/буфер одновременно.

Файл:  
src/app/core-ui/magic-side-nav/magic-side-nav.component.ts

1 Логику isMobile, showMobileMenuOverlay, focus trap,  
 history и закрытие по навигации менять не требуется:  
 направление drawer определяется шаблоном, SCSS и  
 animation trigger.  
 2 Нужно отдельно проверить, что LayoutService.isXs  
 действительно означает breakpoint < 600px.  
 • Требование говорит о < 600px либо isHandset.  
 • В SCSS есть переменная --mobile-breakpoint: 768px, но
она в предоставленном файле фактически не  
 используется.  
 • Нельзя вводить второй независимый breakpoint в стилях: drawer, bottom-nav и нижний отступ контента должны  
 включаться одним и тем же условием.  
 3 Если isXs не соответствует < 600px, изменить источник  
 isMobile на единый handset-сигнал LayoutService,  
 используемый всеми мобильными компонентами, либо  
 скорректировать определение isXs централизованно.

---

2. Увеличить нижнюю панель и добавить подписи

Файл:  
src/app/core-ui/mobile-bottom-nav/mobile-bottom-nav.component.scss

1 Не задавать новую высоту только локально через height у  
 .mobile-bottom-nav, пока не проверено место объявления  
 --bottom-nav-height.  
 • Сейчас высота панели рассчитывается централизованно:  
 • height: calc(var(--bottom-nav-height) +  
 var(--bottom-nav-safe-area));  
 • полезная высота кнопок: var(--bottom-nav-height).  
 • Увеличить значение переменной --bottom-nav-height в её глобальном источнике до 60–65px (рекомендуемо 64px).  
 • Это автоматически сохранит правильное суммирование с  
 --bottom-nav-safe-area.  
 2 Для .mobile-bottom-nav сохранить:  
 • padding-bottom: var(--bottom-nav-safe-area);  
 • общую высоту как bottom-nav-height + safe-area;  
 • bottom: var(--bottom-nav-extra-offset).  
 Это не даст кнопкам попасть в системную gesture-area и  
 обеспечит заливку фона под safe-area.  
 3 Для .nav-button:  
 • сохранить высоту var(--bottom-nav-height);  
 • добавить вертикальный внутренний layout для пары  
 «иконка + подпись»;  
 • добавить достаточные вертикальные отступы/межстрочный
интервал;  
 • обеспечить минимальную интерактивную область не менее
48×48px для каждого пункта;  
 • не уменьшать ширину touch target из-за появления пяти
пунктов.  
 4 Для .nav-button mat-icon:  
 • установить визуальный размер в диапазоне 24–28px;  
 рекомендуемое единое значение — 26px;  
 • синхронно задать font-size, width, height;  
 • не увеличивать icon size у обычных кнопок до размера  
 FAB, чтобы не сломать иерархию элементов.  
 5 Добавить отдельный CSS-класс подписи, например  
 .nav-label:  
 • небольшой читаемый размер, ориентировочно 11–12px;  
 • line-height без переноса в две строки;  
 • max-width: 100%, overflow: hidden, text-overflow:  
 ellipsis, white-space: nowrap;  
 • наследование текущего цвета, чтобы active-состояние  
 автоматически окрашивало и текст;  
 • небольшой контролируемый отступ между иконкой и  
 подписью.  
 6 Для .add-task-button:  
 • текущий FAB имеет размер var(--s7) и поднят над  
 панелью через margin-bottom: var(--s3);  
 • после увеличения панели проверить его вертикальное  
 положение: он не должен перекрывать подписи соседних  
 пунктов или выходить слишком высоко над bar;  
 • если центральный пункт также обязан иметь текстовую  
 подпись, заменить голый FAB на обёртку/компоновку  
 «кнопка + label», сохранив минимум 48×48px для самой  
 кнопки;  
 • при этом не прятать FAB текстом через aria-label:  
 визуальная подпись должна реально присутствовать.  
 7 Правило .add-task-button.smaller пересмотреть:  
 • сейчас вариант при backlog уменьшает кнопку до  
 var(--bottom-nav-height);  
 • после увеличения высоты и появления label это может  
 сделать FAB слишком большим или нарушить вертикальную
композицию;  
 • привести обычный и smaller варианты к согласованной  
 высоте, оставив удобную touch area и место для  
 подписи.  
 8 Не менять --bottom-nav-safe-area на фиксированный  
 пиксельный отступ: он должен продолжать учитывать  
 iOS/Android safe area.

Файл:  
src/app/core-ui/mobile-bottom-nav/mobile-bottom-nav.component.html

Добавить видимые подписи ко всем видимым навигационным  
действиям.

1 Кнопка Today:  
 • после <mat-icon>wb_sunny</mat-icon> добавить текстовый label;  
 • использовать существующий ключ T.G.TODAY_TAG_TITLE |  
 translate.  
 2 Настраиваемый второй slot:  
 • после иконки добавить label;  
 • для route-slot использовать slot.labelKey | translate; • для plugin-slot использовать slot.label;  
 • текст должен быть тем же, что используется в  
 aria-label.  
 3 Центральная кнопка добавления задачи:  
 • добавить визуальную подпись, используя текущий перевод T.GCF.KEYBOARD.GLOBAL_ADD_TASK | translate, если этот
ключ содержит пользовательский короткий текст;  
 • если ключ содержит описание горячей клавиши,  
 подобрать/добавить отдельный короткий перевод вида  
 «Добавить» / «Add task». Не использовать keyboard-help текст в подписи нижней навигации.  
 4 Кнопки боковых панелей:  
 • одиночный plugin button: label button.label;  
 • Schedule: T.BN.SHOW_SCHEDULE | translate;  
 • Issues: T.BN.SHOW_ISSUE_PANEL | translate;  
 • Notes: T.BN.SHOW_NOTES | translate;  
 • общая кнопка открытия меню панелей: короткий перевод  
 для «Панели» / «More», а не только icon  
 bottom_panel_open.  
 5 Кнопка открытия бокового меню:  
 • добавить label с T.MH.PROJECT_MENU | translate.  
 6 Для всех label-элементов применить общий CSS-класс. Не  
 дублировать подписи в aria-label: aria-label допустимо  
 оставить для краткого однозначного описания действия, но
видимый текст должен быть доступен всем пользователям.  
 7 Для пункта, который открывает mat-menu, подпись должна  
 описывать именно открытие меню, а не одну из скрытых  
 панелей.

Файл:  
src/app/core-ui/mobile-bottom-nav/mobile-bottom-nav.component.ts

1 Новая логика навигации не нужна: компонент уже имеет все
нужные T, slot, feature flags и plugin labels.  
 2 Если для центральной кнопки или общего меню панелей  
 отсутствует короткий перевод, добавить в T новый ключ и  
 соответствующие записи переводов. Для определения точных
файлов переводов их нужно отдельно предоставить.  
 3 Не менять обработчики onSlotClick, long-press и context  
 menu: добавление label не должно изменять работу  
 configurable slot.

Файлы тестов

src/app/core-ui/mobile-bottom-nav/mobile-bottom-nav.component.spec.ts

Добавить проверки, что на mobile bar рендерятся подписи:

1 Today, default Planner, Add task и Project menu имеют  
 видимый текст.  
 2 При сохранённом destination меняется label slot-а:  
 • Boards;  
 • saved view;  
 • plugin entry.  
 3 Для единственной панели label соответствует  
 непосредственно показанной панели.  
 4 Для нескольких панелей label относится к кнопке открытия
меню панелей.  
 5 Существующие проверки aria-label сохранить: label не  
 заменяет accessibility-атрибуты.

---

3. Обеспечить нижний отступ контента

Файл: src/app/app.component.html

1 Изменения шаблона минимальны: необходимый маркер уже есть на корневом контейнере:  
 • [class.has-mobile-bottom-nav]="isShowMobileButtonNav() ".  
 2 Использовать именно этот класс для применения мобильного
нижнего inset.  
 3 Не добавлять padding-bottom непосредственно к  
 <mobile-bottom-nav>: это не защищает scrollable content.
4 Не добавлять отступ только в <main> без проверки  
 структуры right-panel и конкретного scroll-container:  
 отступ должен оказаться на реальном контейнере, который  
 прокручивает страницы и списки задач.

Файл, который необходимо добавить для просмотра перед  
реализацией:

src/app/app.component.scss

Нужно найти существующие правила для:

• .app-container;  
 • .app-container.has-mobile-bottom-nav;  
 • .main-content;  
 • right-panel;  
 • .route-wrapper;  
 • мобильных media queries;  
 • текущих padding-bottom, height, overflow, safe-area и  
 --bottom-nav-\*.

После этого внести изменение в фактический scroll container:
1 Когда есть класс .has-mobile-bottom-nav, установить  
 нижний отступ, равный полной занятой зоне панели:  
 • var(--bottom-nav-height);  
 • + var(--bottom-nav-safe-area);  
 • + var(--bottom-nav-extra-offset), если extra offset  
 действительно физически сдвигает bar вверх и иначе под ним остаётся непокрытая область.  
 2 Не использовать только var(--bottom-nav-height): это не  
 учитывает iPhone safe-area и приподнятый bar.  
 3 Если --bottom-nav-extra-offset — исключительно визуальный offset, а пространство за ним уже зарезервировано другим
layout-правилом, не суммировать его повторно. Это нужно  
 установить по месту определения переменной.  
 4 Отступ применять только в mobile-режиме одновременно с  
 отображением nav:  
 • через .has-mobile-bottom-nav;  
 • и/или через используемый общий handset media query.  
 Desktop layout не должен получать лишнюю пустую область  
 снизу.  
 5 Если right-panel уже имеет bottom padding для mobile nav, увеличить его через общую формулу, а не добавить второй  
 padding-bottom на .app-container. Иначе будут двойной  
 отступ и неверная высота на iOS.

---

4. Файлы/переменные, которые нужно дополнительно проверить  
   до внесения изменений

Для точной реализации необходимо добавить в чат следующие  
текущие файлы:

1 src/app/core-ui/magic-side-nav/magic-side-nav.animations. ts  
 Нужно изменить фактическое направление выезда mobile  
 drawer.  
 2 src/app/app.component.scss  
 Нужно определить истинный scroll container и не создать  
 дублирующий нижний отступ.  
 3 Файл, где определяются:  
 • --bottom-nav-height;  
 • --bottom-nav-safe-area;  
 • --bottom-nav-extra-offset;  
 • breakpoint для isXs / handset.  
 Вероятно, это один из глобальных SCSS-файлов или стили  
 LayoutService. Его нужно найти через поиск по  
 --bottom-nav-height и isXs.  
 4 При необходимости — файлы переводов и декларация T, если
отсутствуют короткие ключи для:  
 • «Добавить задачу»;  
 • «Панели»;  
 • остальных новых видимых подписей.

Главное правило реализации: все три механизма — показ mobilenav, левое mobile drawer и нижний отступ прокручиваемого  
контента — должны опираться на один и тот же мобильный  
breakpoint/handset-сигнал.
