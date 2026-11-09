export const part1 = {
  id: 'build',
  num: '1',
  title: { en: 'Build the factory in Visual Components 4.8', ru: 'Сборка завода в Visual Components 4.8' },
  sub: {
    en: 'Seventeen steps from an empty 3D world to a running, measured, documented and post-processed decorative brick plant.',
    ru: 'Семнадцать шагов от пустого 3D-мира к работающему, измеренному, задокументированному и постпроцессированному заводу декоративного кирпича.',
  },
  sections: [
    {
      id: 'workflow',
      title: { en: '1.0 The workflow at a glance', ru: '1.0 Общий порядок работы' },
      body: {
        en: `
![Build workflow](assets/diagram/vc-workflow.svg "The seventeen steps grouped into four phases: prepare, build the flow, build the cell, verify and deliver.")

Work in this order. Every step consumes the output of the previous one, and the two most common ways this project fails are (a) modelling geometry before the product data exists and (b) teaching the robot program before the process flow is wired.

| # | Step | Tab | Output |
|---|---|---|---|
| 1.1 | New layout, units, floor, grid, save early | FILE / HOME | \`BrickPlant_v01.vcmx\` |
| 1.2 | Define products: brick, pallet, full pallet assembly | PROCESS MODELING | product types + flow groups |
| 1.3 | Infeed: feeder → conveyor → pick station with stopper | HOME / eCatalog | material arrives at 20/min |
| 1.4 | Add the FANUC LR Mate 200iD/7L, set base and envelope | HOME / eCatalog | robot in the world |
| 1.5 | Attach the vacuum gripper, set TCP, add collision and mass | HOME / Properties | TOOL[17] ready |
| 1.6 | Pallet station: pallet feeder, assembly, swap shuttle | PROCESS MODELING | place target exists |
| 1.7 | Configure the Pick and Place processes | PROCESS MODELING | \`Pick\`, \`Place\` |
| 1.8 | Wire the transport controller and the flow | PROCESS MODELING | robot has work |
| 1.9 | Safety: fence, light curtain, gate, cabinet, signage | HOME / eCatalog | guarded cell |
| 1.10 | Plant zones A–C and E: forming, kiln, QC, wrapping | HOME / PROCESS | a factory, not a cell |
| 1.11 | Route B: teach the robot program by hand | PROGRAM | routines + statements |
| 1.12 | Route C: drive the robot from Python | MODELING | scripted cycle |
| 1.13 | Run, measure, tune the bottleneck | Simulation / Statistics | 600 bricks/h proven |
| 1.14 | Drawings, BOM, 3D PDF, video | DRAWING / FILE | deliverables |
| 1.15 | Post-process to FANUC .LS and verify in ROBOGUIDE | PROGRAM (OLP) | robot code |
| 1.16 | Save, version, hand over | FILE | final package |
| 1.17 | Troubleshooting table | — | when it does not run |

> NOTE — Routes 1.8, 1.11 and 1.12 are **three different ways to make the same robot move**. Pick one as your main route and mention the other two in the report. For a palletizing cell driven by product flow, **1.8 (transport controller)** is the professional choice; **1.11 (taught program)** is what an integrator hands to FANUC; **1.12 (Python)** is what you use when the pattern must be computed.
`,
        ru: `
![Порядок сборки](assets/diagram/vc-workflow.svg "Семнадцать шагов, сгруппированных в четыре фазы: подготовка, построение потока, построение ячейки, проверка и выдача результата.")

Работайте в этом порядке. Каждый шаг потребляет результат предыдущего, а два самых частых способа провалить проект — (а) моделировать геометрию до появления данных о продукте и (б) обучать программу робота до того, как связан поток процессов.

| № | Шаг | Вкладка | Результат |
|---|---|---|---|
| 1.1 | Новый макет, единицы, пол, сетка, сразу сохранить | FILE / HOME | \`BrickPlant_v01.vcmx\` |
| 1.2 | Определить продукты: кирпич, паллета, сборка полной паллеты | PROCESS MODELING | типы продуктов + группы потока |
| 1.3 | Вход: фидер → конвейер → позиция съёма со стопором | HOME / eCatalog | материал приходит 20/мин |
| 1.4 | Добавить FANUC LR Mate 200iD/7L, задать базу и зону | HOME / eCatalog | робот в мире |
| 1.5 | Повесить вакуумный захват, задать TCP, коллизии и массу | HOME / Properties | TOOL[17] готов |
| 1.6 | Позиция паллеты: фидер паллет, сборка, челнок обмена | PROCESS MODELING | цель укладки существует |
| 1.7 | Настроить процессы Pick и Place | PROCESS MODELING | \`Pick\`, \`Place\` |
| 1.8 | Связать транспортный контроллер и поток | PROCESS MODELING | у робота появилась работа |
| 1.9 | Безопасность: ограждение, светозанавес, калитка, шкаф, знаки | HOME / eCatalog | защищённая ячейка |
| 1.10 | Зоны A–C и E: формовка, печь, контроль, обмотка | HOME / PROCESS | завод, а не ячейка |
| 1.11 | Маршрут B: обучить программу робота вручную | PROGRAM | подпрограммы + утверждения |
| 1.12 | Маршрут C: управлять роботом из Python | MODELING | скриптовый цикл |
| 1.13 | Запустить, измерить, устранить узкое место | Simulation / Statistics | 600 кирп/ч доказаны |
| 1.14 | Чертежи, спецификация, 3D PDF, видео | DRAWING / FILE | результаты |
| 1.15 | Постпроцессирование в FANUC .LS и проверка в ROBOGUIDE | PROGRAM (OLP) | код для робота |
| 1.16 | Сохранить, версионировать, передать | FILE | итоговый пакет |
| 1.17 | Таблица поиска неисправностей | — | когда не запускается |

> NOTE — Шаги 1.8, 1.11 и 1.12 — **три разных способа заставить одного и того же робота двигаться**. Выберите один основным, два других упомяните в отчёте. Для ячейки паллетирования, ведомой потоком продуктов, профессиональный выбор — **1.8 (транспортный контроллер)**; **1.11 (обученная программа)** — то, что интегратор передаёт на FANUC; **1.12 (Python)** — когда схему надо вычислять.
`,
      },
    },
    {
      id: 'layout-setup',
      title: { en: '1.1 New layout, floor and units', ru: '1.1 Новый макет, пол и единицы' },
      body: {
        en: `
1. **FILE › New › Empty Layout**. Visual Components works in millimetres; the world origin is the floor at Z = 0.
2. Set the grid: **HOME › Snap › Grid Snap** with 100 mm spacing, and turn on **Always Snap** while you place static equipment. A brick plant is a rectangular plant — the grid saves you from a crooked kiln line.
3. Lay the floor: **eCatalog › Collections › Models by Type › Facilities - Factory › Visual Components › Floor** (or draw a floor plan with **HOME › Drawing**). Size it 40 000 × 16 000 mm: that fits zones A–E with aisles.
4. Save immediately: **FILE › Save As › \`BrickPlant_v01.vcmx\`**. Save after every completed step from here on, incrementing the version. There is no undo across sessions.
5. Create the views you will reuse: top-down (<kbd>T</kbd> on the View Selector), and two saved camera views via **View Editor › +** — one on the palletizing cell, one on the whole plant. You will need them for the video in step 1.14.

> TIP — Reset the simulation (<kbd>Reset</kbd> in the simulation controls) before you save. The initial state of every component is captured when the simulation starts, so saving mid-run bakes whatever bricks happen to be on the belt into the layout.

**Dimensions of the plant you are about to lay out**

| Zone | Footprint (mm) | Position in the layout |
|---|---|---|
| A · Forming | 8000 × 6000 | X −18000 … −10000 |
| B · Dryer + tunnel kiln | 16000 × 4000 | X −8000 … +8000 |
| C · Unloading + QC | 4000 × 4000 | X +8000 … +12000 |
| **D · Palletizing cell** | **5000 × 4500** | **X +12000 … +17000** |
| E · Wrapping + dispatch | 6000 × 6000 | X +17000 … +23000 |
`,
        ru: `
1. **FILE › New › Empty Layout**. Visual Components работает в миллиметрах; начало координат — пол на Z = 0.
2. Настройте сетку: **HOME › Snap › Grid Snap** с шагом 100 мм и включите **Always Snap**, пока расставляете статичное оборудование. Кирпичный завод — прямоугольный; сетка спасёт от кривой линии печи.
3. Положите пол: **eCatalog › Collections › Models by Type › Facilities - Factory › Visual Components › Floor** (или начертите план этажа через **HOME › Drawing**). Размер 40 000 × 16 000 мм: этого хватает зонам A–E с проходами.
4. Сразу сохраните: **FILE › Save As › \`BrickPlant_v01.vcmx\`**. Дальше сохраняйте после каждого завершённого шага, увеличивая версию. Отмены между сеансами нет.
5. Создайте виды, которые будете использовать повторно: сверху (клавиша <kbd>T</kbd> на View Selector) и два сохранённых вида камеры через **View Editor › +** — один на ячейку паллетирования, один на весь завод. Они понадобятся для видео в шаге 1.14.

> TIP — Сбрасывайте симуляцию (<kbd>Reset</kbd> в органах управления) перед сохранением. Начальное состояние компонентов фиксируется при пуске симуляции, поэтому сохранение посреди прогона «запекает» в макет случайные кирпичи на ленте.

**Габариты завода, который вы сейчас разложите**

| Зона | Площадь (мм) | Положение в макете |
|---|---|---|
| A · Формовка | 8000 × 6000 | X −18000 … −10000 |
| B · Сушило + туннельная печь | 16000 × 4000 | X −8000 … +8000 |
| C · Разгрузка + контроль | 4000 × 4000 | X +8000 … +12000 |
| **D · Ячейка паллетирования** | **5000 × 4500** | **X +12000 … +17000** |
| E · Обмотка + отгрузка | 6000 × 6000 | X +17000 … +23000 |
`,
      },
    },
    {
      id: 'products',
      title: { en: '1.2 Products: brick, pallet, full pallet', ru: '1.2 Продукты: кирпич, паллета, полная паллета' },
      body: {
        en: `
Process Modelling requires products to be **defined before they are created**. Old "Feeder"-folder components create *components*; the Process Modelling components create *products*, and only products can flow through processes, be transported by a robot transport controller, and be counted in the statistics.

**Step A — put the geometry into the world once**

1. **eCatalog › Models by Type › Products and Containers › Visual Components**: drag a **Box** into the world (this will stand in for the brick until you import real geometry).
2. Drag a **Pallet** (or CollarPallet) into the world next to it.
3. Resize the box in the **Properties** panel to **X 250, Y 120, Z 65**. Give it a terracotta material so renders read as brick.

**Step B — define the product types**

1. **PROCESS MODELING › Products** opens the **Product Type Editor**.
2. Create flow group **\`Bricks\`** and inside it a product type **\`Brick_Deco\`**:
   - \`Name\` = Brick_Deco
   - \`ParentProduct\` = Any
   - \`ComponentUri\` — use the pick-component tool and click the resized box in the 3D world
   - \`OriginFrame\` — leave at zero unless the geometry is offset from its own origin
3. Create flow group **\`Pallets\`** and inside it:
   - product type **\`Pallet_Empty\`** → ComponentUri = the pallet component
   - **assembly** **\`Pallet_Full\`** → root step = Pallet_Empty, child step = the bricks

**Step C — the stacking pattern as assembly slots**

The assembly is how Visual Components knows *where* each brick goes. In the assembly editor:

- **Step 0** — \`Pallet_Empty\`, one slot, already present when the assembly is created (the pallet itself).
- **Step 1** — \`Brick_Deco\`, **192 slots**, arranged as 8 layers of 24.

| Slot parameter | Value | How |
|---|---|---|
| Slots per layer | 24 | 4 along X (250 mm pitch) × 6 along Y (120 mm pitch) |
| Layers | 8 | 65 mm Z pitch |
| Slot origin | first brick centre at X −500 + 125, Y −360 + 60, Z 144 + 32.5 | relative to the pallet origin |
| \`OrderIndex\` | 1 … 192, layer by layer | the place process fills the lowest free index first |
| \`AcceptedProductTypes\` | Brick_Deco | so a stray product cannot land in the stack |
| \`DefaultProductType\` | **Null** | critical — this is what makes the slots arrive *empty* |
| \`AcceptAllProductTypes\` | unchecked | |

> WARNING — If you leave \`DefaultProductType\` set to Brick_Deco, every created pallet arrives already full and the robot has nothing to do. Setting it to **Null** is the documented way to create an incomplete assembly from a feeder.

**Step D — verify**

1. Add a **Feeder** from **Models by Type › Flow Components** temporarily, set its product to \`Pallet_Full\` and press play. You should see a pallet with 192 bricks appear.
2. Reset, delete the test feeder.
`,
        ru: `
Процессное моделирование требует, чтобы продукты были **определены до того, как их создают**. Старые компоненты из папки «Feeder» создают *компоненты*; компоненты процессного моделирования создают *продукты*, и только продукты могут проходить через процессы, переноситься транспортным контроллером робота и учитываться в статистике.

**Шаг A — один раз положите геометрию в мир**

1. **eCatalog › Models by Type › Products and Containers › Visual Components**: перетащите **Box** в мир (он заменит кирпич, пока не импортирована настоящая геометрия).
2. Рядом перетащите **Pallet** (или CollarPallet).
3. Задайте размеры бокса в панели **Properties**: **X 250, Y 120, Z 65**. Покрасьте в терракоту, чтобы на рендерах читался кирпич.

**Шаг B — определите типы продуктов**

1. **PROCESS MODELING › Products** открывает **Product Type Editor**.
2. Создайте группу потока **\`Bricks\`** и в ней тип продукта **\`Brick_Deco\`**:
   - \`Name\` = Brick_Deco
   - \`ParentProduct\` = Any
   - \`ComponentUri\` — инструментом выбора компонента кликните по resized-боксу в 3D-мире
   - \`OriginFrame\` — оставьте нулём, если геометрия не смещена относительно собственного начала
3. Создайте группу потока **\`Pallets\`** и в ней:
   - тип продукта **\`Pallet_Empty\`** → ComponentUri = компонент паллеты
   - **сборку** **\`Pallet_Full\`** → корневой шаг = Pallet_Empty, дочерний шаг = кирпичи

**Шаг C — схема укладки как слоты сборки**

Сборка — это способ сообщить Visual Components, *куда* встаёт каждый кирпич. В редакторе сборок:

- **Шаг 0** — \`Pallet_Empty\`, один слот, присутствует сразу при создании сборки (сама паллета).
- **Шаг 1** — \`Brick_Deco\`, **192 слота**, 8 слоёв по 24.

| Параметр слота | Значение | Как |
|---|---|---|
| Слотов в слое | 24 | 4 по X (шаг 250 мм) × 6 по Y (шаг 120 мм) |
| Слоёв | 8 | шаг по Z 65 мм |
| Начало слотов | центр первого кирпича: X −500 + 125, Y −360 + 60, Z 144 + 32,5 | относительно начала паллеты |
| \`OrderIndex\` | 1 … 192, послойно | процесс укладки заполняет сначала меньший свободный индекс |
| \`AcceptedProductTypes\` | Brick_Deco | чтобы посторонний продукт не попал в штабель |
| \`DefaultProductType\` | **Null** | критично — именно это делает слоты *пустыми* при создании |
| \`AcceptAllProductTypes\` | снять | |

> WARNING — Если оставить \`DefaultProductType\` = Brick_Deco, каждая созданная паллета приезжает уже полной, и роботу нечего делать. Значение **Null** — документированный способ создать незавершённую сборку из фидера.

**Шаг D — проверка**

1. Временно добавьте **Feeder** из **Models by Type › Flow Components**, задайте ему продукт \`Pallet_Full\` и нажмите пуск. Должна появиться паллета со 192 кирпичами.
2. Сбросьте симуляцию, удалите тестовый фидер.
`,
      },
    },
    {
      id: 'infeed',
      title: { en: '1.3 Infeed: feeder, conveyor, pick station', ru: '1.3 Вход: фидер, конвейер, позиция съёма' },
      body: {
        en: `
![Plant flow](assets/diagram/plant-flow.svg "Material flow of the whole plant. Zone D, the palletizing cell, is drawn to scale; the other zones are drawn as flow blocks.")

![Bricks on the belt](assets/media/conveyor-bricks.jpg "Terracotta decorative bricks ride the infeed belt toward the pick station; the EUR pallet waits on its indexer at the right.")

1. **eCatalog › Models by Type › Flow Components › Visual Components › Feeder** into the world at the start of zone D.
2. **Models by Type › Conveyors › Visual Components › Conveyor**, and connect it to the feeder with **PnP**: drag the conveyor towards the feeder until the green arrow appears, keep dragging until it snaps.
   - *Tip:* with the feeder selected, double-clicking a conveyor in the eCatalog adds it already attached.
3. Set the feeder properties:

| Property | Value | Why |
|---|---|---|
| \`Product\` | Brick_Deco | the product type from step 1.2 |
| \`CreationInterval\` | 3.0 s | 20 bricks/min — twice the robot takt, so the buffer is real |
| \`Container\` | the infeed conveyor | products are created *onto* the belt |

4. Set the conveyor properties:

| Property | Value |
|---|---|
| \`ConveyorWidth\` | 400 |
| \`Speed\` | 100 mm/s |
| \`Length\` | 3000 mm (edit the path points in the 3D world) |
| \`ProductSpacing\` | 300 mm — enforced by the feeder interval and belt speed |

5. Add the pick station. Two options, both correct:
   - **PM Flow Components › Pick And Place Process** — a conveyor segment with an in-sensor (green) and an out-sensor (red); anything between them is inside the process. Configure it in step 1.7.
   - a plain **Conveyor** + **Conveyor Sensor** snapped to the path + a **Stopper** so the brick waits for the robot. Use this if you are on the taught-program route (1.11).
6. Add a **From Conveyor Process** or a second conveyor at the end of zone C so the bricks arrive continuously from the kiln line rather than being created from nothing — a factory report reads much better when the material has an origin.

> NOTE — Belt length matters. 3000 mm at 300 mm pitch is ten brick positions; the robot consumes one every 6 s, so the belt holds 60 s of material. That is your buffer, and you can now state it in the report instead of guessing.
`,
        ru: `
![Поток завода](assets/diagram/plant-flow.svg "Материальный поток всего завода. Зона D, ячейка паллетирования, показана в масштабе; остальные зоны — блоками потока.")

![Кирпичи на ленте](assets/media/conveyor-bricks.jpg "Терракотовые декоративные кирпичи едут по входной ленте к позиции съёма; EUR-паллета ждёт на своём индексаторе справа.")

1. **eCatalog › Models by Type › Flow Components › Visual Components › Feeder** в мир, в начало зоны D.
2. **Models by Type › Conveyors › Visual Components › Conveyor**, соедините с фидером через **PnP**: тяните конвейер к фидеру до появления зелёной стрелки и продолжайте до щелчка.
   - *Совет:* если фидер выделен, двойной клик по конвейеру в eCatalog добавит его уже присоединённым.
3. Задайте свойства фидера:

| Свойство | Значение | Почему |
|---|---|---|
| \`Product\` | Brick_Deco | тип продукта из шага 1.2 |
| \`CreationInterval\` | 3,0 с | 20 кирп/мин — вдвое больше такта робота, буфер настоящий |
| \`Container\` | входной конвейер | продукты создаются *на* ленте |

4. Задайте свойства конвейера:

| Свойство | Значение |
|---|---|
| \`ConveyorWidth\` | 400 |
| \`Speed\` | 100 мм/с |
| \`Length\` | 3000 мм (редактируйте точки пути в 3D-мире) |
| \`ProductSpacing\` | 300 мм — обеспечивается интервалом фидера и скоростью ленты |

5. Добавьте позицию съёма. Два варианта, оба правильные:
   - **PM Flow Components › Pick And Place Process** — сегмент конвейера с входным (зелёным) и выходным (красным) датчиком; всё между ними считается внутри процесса. Настраивается в шаге 1.7.
   - обычный **Conveyor** + **Conveyor Sensor**, привязанный к пути, + **Stopper**, чтобы кирпич ждал робота. Используйте этот вариант на маршруте обученной программы (1.11).
6. Добавьте **From Conveyor Process** или второй конвейер в конце зоны C, чтобы кирпичи приходили непрерывно с линии печи, а не возникали из ничего: отчёт о заводе читается лучше, когда у материала есть происхождение.

> NOTE — Длина ленты имеет значение. 3000 мм при шаге 300 мм — это десять позиций кирпича; робот забирает один каждые 6 с, значит лента держит 60 с материала. Это и есть ваш буфер — теперь его можно указать в отчёте, а не выдумывать.
`,
      },
    },
    {
      id: 'robot',
      title: { en: '1.4 The robot: FANUC LR Mate 200iD/7L', ru: '1.4 Робот: FANUC LR Mate 200iD/7L' },
      body: {
        en: `
**From the eCatalog**

1. **eCatalog › Collections › Models by Type › Robots › FANUC** (or **Models by Manufacturer › Fanuc**) and search **\`LR Mate 200iD/7L\`**. The component is authored by Visual Components and is tagged for Assembly, Dispensing, Machine Tending and Material Handling.
2. Double-click to place it at the world origin, or drag it into the world and position it with **Move** + numeric X/Y/Rz.
3. Position it for this cell: base on the centreline of a long side of the pallet station, **650 mm from the pallet turntable centre**, and about 1100 mm from the pick station, rotated so J1 sweeps between the two. Do not copy those numbers without doing the reach check below — this is the step where most student layouts are quietly wrong.
4. **Properties › WorkSpace tab › check \`Envelope\`**. The reachability area appears in the 3D world. Switch to the top-down view and confirm that *both* the pick point and *the whole working window of the pallet* fall inside it.

**The reach check you must do (and show in the report)**

Pallet footprint 1200 × 800 mm, centre C; robot base B on the long-side centreline at distance *d* from C. The farthest corner of the stack is at:

~~~text
r_far = sqrt(600^2 + (400 + d)^2)

d = 900 mm  ->  r_far = sqrt(360000 + 1690000) = 1432 mm   >> 911 mm  UNREACHABLE
d = 650 mm  ->  r_far = sqrt(360000 + 1102500) = 1206 mm   >> 911 mm  UNREACHABLE
solve r_far <= 911  ->  (400 + d)^2 <= 911^2 - 600^2 = 469921
                    ->  d <= 285 mm
~~~

A base 285 mm from the pallet centre would sit **inside the pallet footprint** (its near edge is 400 mm from the centre), so it is physically impossible. Conclusion, and it is worth writing in the report in exactly these words:

> WARNING — **A single fixed base cannot palletize a full EUR pallet with a 911 mm arm.** Any layout that claims otherwise has not checked the far corner. Three workable fixes, in order of preference for this cell:
>
> 1. **180° rotary pallet indexer (turntable)** — chosen here. The pallet turns so that only the near half is ever in the working window.
> 2. **Linear rail (7th axis)** along the 1200 mm side — the base travels with the placement; simple and robust, but adds travel time to every cycle.
> 3. **Double gripper plus a smaller work window**, or two robots — the Pick And Place manual's own scaling advice.

**With the indexer: does it now fit?**

Base B at 650 mm from the turntable centre C, on the long-side centreline. After a 180° index, every point of the pallet lies in the near half, i.e. within 600 mm laterally and 0–400 mm towards the robot:

~~~text
farthest point  (600, 0)      r = sqrt(600^2 + 650^2) = 884 mm   <= 911 mm  OK
nearest point   (0, -400)     r = 650 - 400 = 250 mm             OK (arm not folded into itself)
top layer at +585 mm above the pallet  -> vertical reach checked separately in the envelope view
~~~

884 mm against a 911 mm limit is a real margin — 27 mm — and it is the kind of number a reviewer wants to see. Keep it under 90 % of the rated reach so that the wrist can still orient the gripper.

**What the indexer costs you**

| Item | Value |
|---|---|
| Indexes per pallet | 8 (one 180° index per layer) |
| Index time, 640 kg loaded table | ~8 s |
| Added pallet time | 64 s = 1.07 min |
| Pallet cycle, two-position shuttle + indexer | 19.2 + 1.1 = **20.3 min** |
| Resulting output | **568 bricks/h** — 5 % under the 600/h target |
| Fix that restores the target | double gripper (Capacity 2, Part 1.8): fill time halves to ~9.6 min → ~10.7 min/pallet → **1075 bricks/h**, i.e. large margin |
| Alternative fix | accept 568 bricks/h and state it, or add a second robot |

This is exactly the kind of finding a report should contain: the target was checked, it failed for a stated physical reason, and two quantified remedies are offered.

![Cell layout](assets/diagram/cell-layout.svg "Top view of zone D with real dimensions: robot base, pick station, pallet station, fence, light curtain and the 911 mm reach envelope.")

**If the component is not in your catalogue**

The Web eCatalog needs a network connection and a licence. Three fallbacks, in order of preference:

1. Use **LR Mate-200iD** (the short-reach sibling) and note the substitution in the report — the maintenance content in Parts 2–5 is identical for both, only the reach differs (717 mm vs 911 mm).
2. Download the component file from the public eLibrary index at \`download.visualcomponents.net/elib\` and open it in Visual Components (FILE › Open › \`.vcmx\`), then copy the robot into your layout.
3. Model it from a template: **Models by Type › Component Templates › Generic Articulated Robot v3**, then replace the geometry with your own CAD (STEP import) and set the joints — this is the standard component-modelling workflow and is worth describing in the report because it proves you understand what a robot component actually is.

**Modelling a robot from a template (fallback 3, in brief)**

1. Import the CAD: **HOME › Geometry › Import**, pick the STEP of the LR Mate 200iD/7L. Set the import scale so the model is in millimetres.
2. Add the template robot, select all its geometry features, copy them onto the imported component's root, then delete the template's block features.
3. Create one **link** per moving group (base, J1 arm, J2 arm, J3 arm, J4 wrist, J5 wrist, J6 flange) and a **revolute joint** between them with the correct axis, range and speed:

| Joint | Axis | Range | Max speed |
|---|---|---|---|
| J1 | Z of the base | ±170° | 370 °/s |
| J2 | Y | ±122.5° | 310 °/s |
| J3 | Y | ±215° | 410 °/s |
| J4 | X of the arm | ±190° | 550 °/s |
| **J5** | **Y of the wrist** | **±125°** | **545 °/s** |
| J6 | X of the flange | ±360° | 1000 °/s |

4. Move the **FlangeFrame** feature to the real J6 mounting face, then set the robot executor's tool frames.
5. Switch Move Mode back to **Hierarchy** and press **Reset** so the executor re-reads the frames.

> WARNING — The mounting surface in your layout must respect the real machine's requirements: flatness ≤ 0.5 mm, inclination ≤ 0.5°, and a pedestal able to take **1657 N·m** of vertical moment during a power-off stop. Model the pedestal as a solid component and mention the load case in the report — that single sentence connects your layout to the machine's datasheet.
`,
        ru: `
**Из каталога eCatalog**

1. **eCatalog › Collections › Models by Type › Robots › FANUC** (или **Models by Manufacturer › Fanuc**), найдите **\`LR Mate 200iD/7L\`**. Компонент создан Visual Components и помечен для сборки, дозирования, обслуживания станков и перемещения материалов.
2. Двойной клик ставит его в начало координат; либо перетащите в мир и расположите через **Move** с численными X/Y/Rz.
3. Расположение для этой ячейки: основание на осевой линии длинной стороны позиции паллеты, **650 мм от центра поворотного стола паллеты** и примерно 1100 мм от позиции съёма, поворотом так, чтобы J1 качался между ними. Не копируйте эти числа без проверки досягаемости ниже: именно на этом шаге студенческие макеты незаметно ошибаются.
4. **Properties › вкладка WorkSpace › включить \`Envelope\`**. В мире появится зона досягаемости. Перейдите в вид сверху и убедитесь, что *и* точка съёма, *и* всё рабочее окно паллеты попадают внутрь.

**Проверка досягаемости, которую надо выполнить (и показать в отчёте)**

Площадь паллеты 1200 × 800 мм, центр C; основание робота B на осевой линии длинной стороны на расстоянии *d* от C. Дальний угол штабеля находится на расстоянии:

~~~text
r_far = sqrt(600^2 + (400 + d)^2)

d = 900 мм  ->  r_far = sqrt(360000 + 1690000) = 1432 мм   >> 911 мм  НЕДОСТУПНО
d = 650 мм  ->  r_far = sqrt(360000 + 1102500) = 1206 мм   >> 911 мм  НЕДОСТУПНО
решаем r_far <= 911  ->  (400 + d)^2 <= 911^2 - 600^2 = 469921
                     ->  d <= 285 мм
~~~

Основание в 285 мм от центра паллеты оказалось бы **внутри её площади** (ближний край в 400 мм от центра), то есть физически невозможно. Вывод, который стоит записать в отчёт именно этими словами:

> WARNING — **Одно неподвижное основание не способно укладывать полную EUR-паллету рукой с вылетом 911 мм.** Любой макет, утверждающий обратное, не проверил дальний угол. Три рабочих решения по убыванию предпочтительности для этой ячейки:
>
> 1. **Поворотный стол-индексатор на 180°** — выбран здесь. Паллета поворачивается так, что в рабочем окне всегда только ближняя половина.
> 2. **Линейная направляющая (7-я ось)** вдоль стороны 1200 мм — основание едет вместе с укладкой; просто и надёжно, но добавляет время хода в каждый цикл.
> 3. **Двойной захват плюс меньшее рабочее окно** либо два робота — совет по масштабированию из самого руководства Pick And Place.

**Со столом-индексатором: теперь сходится?**

Основание B в 650 мм от центра стола C, на осевой линии длинной стороны. После поворота на 180° любая точка паллеты оказывается в ближней половине, то есть не далее 600 мм поперёк и 0–400 мм к роботу:

~~~text
дальняя точка   (600, 0)      r = sqrt(600^2 + 650^2) = 884 мм   <= 911 мм  ОК
ближняя точка   (0, -400)     r = 650 - 400 = 250 мм             ОК (рука не сложена в себя)
верхний слой на +585 мм над паллетой -> вертикальная досягаемость проверяется отдельно в виде зоны
~~~

884 мм против предела 911 мм — это реальный запас, 27 мм, и именно такие числа хочет видеть рецензент. Держите utilisation ниже 90 % от номинального вылета, чтобы кисть ещё могла ориентировать захват.

**Во что обходится индексатор**

| Позиция | Значение |
|---|---|
| Поворотов на паллету | 8 (один поворот на 180° на слой) |
| Время поворота, стол с грузом 640 кг | ~8 с |
| Добавка к времени паллеты | 64 с = 1,07 мин |
| Цикл паллеты, двухпозиционный челнок + индексатор | 19,2 + 1,1 = **20,3 мин** |
| Получаемый выпуск | **568 кирп/ч** — на 5 % ниже цели 600/ч |
| Решение, возвращающее цель | двойной захват (Capacity 2, часть 1.8): время заполнения вдвое меньше, ~9,6 мин → ~10,7 мин/паллета → **1075 кирп/ч**, большой запас |
| Альтернатива | принять 568 кирп/ч и заявить это либо добавить второго робота |

Это ровно тот вывод, который должен быть в отчёте: цель проверена, она не выполнена по названной физической причине, и предложены два количественно оцененных remedy.

![Планировка ячейки](assets/diagram/cell-layout.svg "Вид сверху зоны D с реальными размерами: основание робота, позиция съёма, позиция паллеты, ограждение, светозанавес и зона досягаемости 911 мм.")

**Если компонента нет в вашем каталоге**

Веб-каталог требует сети и лицензии. Три запасных пути по убыванию предпочтительности:

1. Возьмите **LR Mate-200iD** (короткую версию) и оговорите замену в отчёте: содержание ТО в частях 2–5 для них одинаково, различается только вылет (717 мм против 911 мм).
2. Скачайте файл компонента из публичного индекса eLibrary по адресу \`download.visualcomponents.net/elib\` и откройте в Visual Components (FILE › Open › \`.vcmx\`), затем скопируйте робота в свой макет.
3. Соберите из шаблона: **Models by Type › Component Templates › Generic Articulated Robot v3**, затем замените геометрию своей CAD-моделью (импорт STEP) и настройте суставы. Это стандартный процесс моделирования компонентов; его стоит описать в отчёте, потому что он доказывает понимание того, что такое компонент робота.

**Моделирование робота из шаблона (запасной путь 3, кратко)**

1. Импортируйте CAD: **HOME › Geometry › Import**, выберите STEP-файл LR Mate 200iD/7L. Задайте масштаб импорта в миллиметрах.
2. Добавьте шаблонного робота, выделите все его геометрические признаки, скопируйте их в корень импортированного компонента, затем удалите блочные признаки шаблона.
3. Создайте по одной **связи (link)** на каждую движущуюся группу (основание, рука J1, рука J2, рука J3, кисть J4, кисть J5, фланец J6) и по **вращательному суставу** между ними с правильной осью, диапазоном и скоростью:

| Сустав | Ось | Диапазон | Макс. скорость |
|---|---|---|---|
| J1 | Z основания | ±170° | 370 °/с |
| J2 | Y | ±122,5° | 310 °/с |
| J3 | Y | ±215° | 410 °/с |
| J4 | X руки | ±190° | 550 °/с |
| **J5** | **Y кисти** | **±125°** | **545 °/с** |
| J6 | X фланца | ±360° | 1000 °/с |

4. Перенесите признак **FlangeFrame** на реальную посадочную поверхность J6, затем задайте кадровые системы инструмента в исполнительном устройстве робота.
5. Верните Move Mode в **Hierarchy** и нажмите **Reset**, чтобы исполнительное устройство перечитало кадры.

> WARNING — Монтажная поверхность в макете должна соответствовать требованиям реальной машины: плоскостность ≤ 0,5 мм, наклон ≤ 0,5°, и тумба, способная воспринять **1657 Н·м** вертикального момента при остановке снятием питания. Смоделируйте тумбу как твёрдое тело и упомяните этот случай нагружения в отчёте — одна фраза связывает вашу планировку с паспортом машины.
`,
      },
    },
    {
      id: 'gripper',
      title: { en: '1.5 End effector: vacuum gripper and TCP', ru: '1.5 Исполнительное устройство: вакуумный захват и TCP' },
      body: {
        en: `
A brick is porous, abrasive and 3.2 kg. Vacuum is the right family of gripper; a parallel jaw gripper would need 250 mm of stroke and would chip the arrises. Use **two cups**, not four: two Ø63 cups at −0.7 bar hold roughly 300 N each, and you need ~35 N of holding force — a safety factor of about 17.

1. **eCatalog › Models by Type › Tools › Visual Components › Parametric Suction Cup Gripper** into the world.
2. **PnP**: drag the gripper onto the robot's **mount plate** until it snaps. The gripper becomes a child of the flange in the **Cell Graph**.
3. Set the gripper properties:

| Property | Value | Comment |
|---|---|---|
| \`NumberOfCups\` | 2 | |
| \`CupDiameter\` | 63 mm | Ø63 bellows cup |
| \`CupSpacing\` | 150 mm | across the 250 mm bed face, inside the 240 mm edges |
| \`GrippingDia\` / stroke | 250 mm | only relevant for a jaw gripper |
| \`Mass\` | 0.80 kg | aluminium plate + venturi + cups |
| \`SignalIn\` / \`SignalOut\` | see step 1.8 | vacuum ON = close, vacuum OFF = open |

4. **Tool frame.** When an end effector with a predefined tool is connected to a robot, Visual Components appends it to the robot's 16 default tool frames as **index 17**. Set \`TcpIndex\` = 17 on the transport controller or link so motions are calculated at the cup face, not at the bare flange. If you teach by hand, select **TOOL[17]** in the Jog panel.
5. **Collision geometry.** Select the gripper and the brick, then add them to the robot's collision set (Properties › Collisions). Without this the simulation will happily drive the arm through the fence.
6. **Payload check in the component.** Set the robot's payload property (or the tool's attached mass) so the simulated dynamics match the 4.00 kg you calculated in Part 0.

> TIP — Name your frames. \`TOOL_Vacuum2Cup\` rather than TOOL[17], \`BASE_PalletCell\` rather than Base[1]. The Visual Components robot-programming course makes the same point: label statements and positions clearly, because somebody else will open this layout.

**Gripper signals**

The Pick And Place transport controller can drive a gripper two ways:

- **By port numbers** — \`GripperSignalClose\` = 102, \`GripperSignalOpen\` = 101 on the link.
- **By naming convention** — set the port to −1 and the controller looks for signals in the tool component named \`IN_J1_Action\`, or \`IN_J1_Close\` / \`IN_J1_Open\`. Enable \`UseGripperSignals\` on the controller's Advanced tab.

For a vacuum gripper the honest signal set is: \`DO[10] vacuum ON\`, \`DI[11] vacuum reached\`, \`DO[12] blow-off\`. Model at least the first two — the "vacuum reached" input is what a real program waits for before lifting, and it is the detail that separates a student layout from an integrator layout.
`,
        ru: `
Кирпич пористый, абразивный и весит 3,2 кг. Вакуум — правильное семейство захватов; параллельный зажим потребовал бы хода 250 мм и скалывал бы кромки. Берите **две** присоски, а не четыре: две Ø63 при −0,7 бар держат примерно по 300 Н, а нужно ~35 Н удерживающей силы — запас около 17.

1. **eCatalog › Models by Type › Tools › Visual Components › Parametric Suction Cup Gripper** в мир.
2. **PnP**: перетащите захват на **монтажную пластину** робота до щелчка. Захват станет дочерним относительно фланца в **Cell Graph**.
3. Задайте свойства захвата:

| Свойство | Значение | Комментарий |
|---|---|---|
| \`NumberOfCups\` | 2 | |
| \`CupDiameter\` | 63 мм | сильфонная присоска Ø63 |
| \`CupSpacing\` | 150 мм | поперёк постели 250 мм, внутри кромок 240 мм |
| \`GrippingDia\` / ход | 250 мм | важно только для губкового захвата |
| \`Mass\` | 0,80 кг | алюминиевая плита + эжектор + присоски |
| \`SignalIn\` / \`SignalOut\` | см. шаг 1.8 | вакуум ВКЛ = закрыть, вакуум ВЫКЛ = открыть |

4. **Кадр инструмента.** Когда к роботу подключён инструмент с предопределённым кадром, Visual Components добавляет его к 16 стандартным кадрам под **индексом 17**. Поставьте \`TcpIndex\` = 17 в транспортном контроллере или связи, чтобы движения считались от плоскости присосок, а не от голого фланца. При ручном обучении выберите **TOOL[17]** в панели Jog.
5. **Геометрия коллизий.** Выделите захват и кирпич и добавьте их в набор коллизий робота (Properties › Collisions). Иначе симуляция спокойно проведёт руку сквозь ограждение.
6. **Проверка грузоподъёмности в компоненте.** Задайте свойство грузоподъёмности робота (или присоединённую массу инструмента) так, чтобы динамика соответствовала рассчитанным в части 0 4,00 кг.

> TIP — Называйте кадры. \`TOOL_Vacuum2Cup\` вместо TOOL[17], \`BASE_PalletCell\` вместо Base[1]. Курс Visual Components по программированию роботов говорит то же: подписывайте утверждения и позиции ясно, потому что макет откроет кто-то ещё.

**Сигналы захвата**

Транспортный контроллер Pick And Place может управлять захватом двумя способами:

- **Номерами портов** — \`GripperSignalClose\` = 102, \`GripperSignalOpen\` = 101 на связи.
- **Соглашением об именовании** — поставьте порт −1, и контроллер сам найдёт в компоненте инструмента сигналы \`IN_J1_Action\` либо \`IN_J1_Close\` / \`IN_J1_Open\`. Включите \`UseGripperSignals\` на вкладке Advanced контроллера.

Для вакуумного захвата честный набор сигналов: \`DO[10] вакуум ВКЛ\`, \`DI[11] вакуум достигнут\`, \`DO[12] обдув\`. Смоделируйте хотя бы первые два: именно входа «вакуум достигнут» ждёт настоящая программа перед подъёмом, и это та деталь, которая отличает студенческий макет от макета интегратора.
`,
      },
    },
    {
      id: 'pallet',
      title: { en: '1.6 Pallet station and the swap shuttle', ru: '1.6 Позиция паллеты и челнок обмена' },
      body: {
        en: `
1. **Empty pallets in.** Add a second **Feeder** (Models by Type › Flow Components), set \`Product\` = \`Pallet_Full\` (the assembly whose slots are empty) and \`CreationInterval\` = 1200 s. Connect it to a short **roller conveyor** or a **Shape Feeder → Pallet Filler** pair if you prefer the pattern to be generated by the component instead of by the assembly.
2. **The place target.** Add a **Pick And Place Process** where the pallet stops, and configure \`ProcessType\` = **Place**, \`ProductsOn\` = **Assembly** (step 1.7).
3. **Full pallets out.** Add a **Transport Link** or a short outbound conveyor to zone E (stretch wrapper). Since a full pallet is an assembly, the robot does not move it — the conveyor does.
4. **The rotary indexer.** Part 1.4 showed that a fixed base cannot reach a whole EUR pallet with a 911 mm arm, so the pallet station is a **180° turntable** whose centre sits 650 mm from the robot base. In Visual Components, model it as a component with a revolute joint driven by a signal (\`DO_Index\` → rotate 180° in 8 s), and make the place routine wait for \`DI_IndexDone\`. Eight indexes per pallet, 64 s.
5. **The two-position shuttle.** Part 0 showed that a single-position station loses 4 % of the target output to the pallet exchange. Model the fix:
   - a **shuttle conveyor** with two positions (fill and swap) or two parallel place processes,
   - the flow: \`PalletFeeder → SwapPosition → FillPosition → OutConveyor\`,
   - a signal \`PalletReady\` from the fill position to the pallet feeder so a new empty pallet only enters when the full one has left.
6. **Height matters.** A pallet on the floor puts the first layer at 144 mm and the eighth at 599 mm. That is comfortable for this robot. If you model the pallet on a 500 mm station, the top layer is at 1099 mm and you must re-check the envelope.

> TIP — Add a **human resource** or a **forklift/mobile robot** to take full pallets away (Models by Type › Mobile Robots, or Resources › Characters). Then the statistics show whether the cell ever waits for transport — a real finding, and one you can only get if the pallets actually leave.
`,
        ru: `
1. **Подача пустых паллет.** Добавьте второй **Feeder** (Models by Type › Flow Components), задайте \`Product\` = \`Pallet_Full\` (сборка с пустыми слотами) и \`CreationInterval\` = 1200 с. Подключите его к короткому **рольгангу** либо к паре **Shape Feeder → Pallet Filler**, если хотите, чтобы схему генерировал компонент, а не сборка.
2. **Цель укладки.** Добавьте **Pick And Place Process** там, где паллета останавливается, и настройте \`ProcessType\` = **Place**, \`ProductsOn\` = **Assembly** (шаг 1.7).
3. **Вывод полных паллет.** Добавьте **Transport Link** или короткий выходной конвейер в зону E (стретч-обмотчик). Полная паллета — это сборка, поэтому перемещает её конвейер, а не робот.
4. **Поворотный стол-индексатор.** В части 1.4 показано, что неподвижное основание не дотягивается до всей EUR-паллеты рукой 911 мм, поэтому позиция паллеты — это **поворотный стол на 180°**, центр которого в 650 мм от основания робота. В Visual Components смоделируйте его компонентом с вращательным суставом, управляемым сигналом (\`DO_Index\` → поворот на 180° за 8 с), и пусть подпрограмма укладки ждёт \`DI_IndexDone\`. Восемь поворотов на паллету, 64 с.
5. **Двухпозиционный челнок.** В части 0 показано, что однопозиционная станция теряет 4 % целевого выпуска на обмене паллет. Смоделируйте решение:
   - **челночный конвейер** с двумя позициями (заполнение и обмен) или два параллельных процесса укладки,
   - поток: \`PalletFeeder → SwapPosition → FillPosition → OutConveyor\`,
   - сигнал \`PalletReady\` из позиции заполнения в фидер паллет, чтобы пустая паллета входила только после ухода полной.
6. **Высота важна.** Паллета на полу даёт первый слой на 144 мм и восьмой на 599 мм — этому роботу комфортно. Если смоделируете паллету на станции высотой 500 мм, верхний слой окажется на 1099 мм и зону досягаемости придётся перепроверить.

> TIP — Добавьте **человеческий ресурс** или **погрузчик/мобильного робота** для вывоза полных паллет (Models by Type › Mobile Robots либо Resources › Characters). Тогда статистика покажет, ждёт ли ячейка транспорт, — это настоящий вывод, и получить его можно, только если паллеты действительно уезжают.
`,
      },
    },
    {
      id: 'processes',
      title: { en: '1.7 Pick and Place processes', ru: '1.7 Процессы Pick и Place' },
      body: {
        en: `
The **Pick And Place Process** component lives under **eCatalog › PM Flow Components**. It is a conveyor with two sensors: everything between the green in-sensor and the red out-sensor is "inside the process" and eligible for transport.

> WARNING — These components ship with a fixed statement structure. The manual is explicit: **rename the process, do not add or delete statements; select the process statement and modify its properties.** Adding statements to a Pick And Place Process breaks the Python-driven logic underneath.

**Pick process (on the infeed conveyor)**

| Property | Value | Meaning |
|---|---|---|
| Process name | \`Pick_Brick\` | rename, do not re-create |
| \`ProcessType\` | **Pick** | products are taken *from* here |
| \`ProductsOn\` | **Conveyor** | the source is a belt |
| \`InSensorPosition\` | 20 % | green sensor at 20 % of the component length |
| \`OutSensorPosition\` | 80 % | red sensor at 80 % |
| \`AcceptAllProductTypes\` | unchecked | |
| Accepted types | Brick_Deco | |
| \`StopAt\` | **Never** for a moving pick / **Sensor** if you want the brick to wait | Never keeps the line flowing; Sensor makes the robot's job easier |

**Place process (on the pallet station)**

| Property | Value | Meaning |
|---|---|---|
| Process name | \`Place_Pallet\` | |
| \`ProcessType\` | **Place** | products are delivered *to* here |
| \`ProductsOn\` | **Assembly** | the target is the pallet assembly, so slots define the exact positions |
| \`ReverseSlotOrder\` | unchecked | fill from the lowest OrderIndex = bottom layer first |
| \`AcceptAllProductTypes\` | unchecked | |
| \`StopAt\` | Never | |

> NOTE — \`ProductsOn = Assembly\` is what makes palletising work without teaching 192 points. The place process creates transport tasks for the assembly steps in **depth-first** order, and within a step the slots are filled by ascending \`OrderIndex\` — so the bottom-left brick of layer 1 is placed first and the top-right brick of layer 8 last. If you set \`DefaultProductType\` on the slots by mistake (step 1.2), the process finds no free slot and the robot idles forever.
`,
        ru: `
Компонент **Pick And Place Process** находится в **eCatalog › PM Flow Components**. Это конвейер с двумя датчиками: всё, что между зелёным входным и красным выходным датчиком, считается «внутри процесса» и доступно для переноса.

> WARNING — Эти компоненты поставляются с фиксированной структурой утверждений. Руководство формулирует прямо: **переименуйте процесс, не добавляйте и не удаляйте утверждения; выберите утверждение процесса и измените его свойства.** Добавление утверждений в Pick And Place Process ломает лежащую под ним Python-логику.

**Процесс съёма (на входном конвейере)**

| Свойство | Значение | Смысл |
|---|---|---|
| Имя процесса | \`Pick_Brick\` | переименовать, не пересоздавать |
| \`ProcessType\` | **Pick** | продукты забираются *отсюда* |
| \`ProductsOn\` | **Conveyor** | источник — лента |
| \`InSensorPosition\` | 20 % | зелёный датчик на 20 % длины компонента |
| \`OutSensorPosition\` | 80 % | красный датчик на 80 % |
| \`AcceptAllProductTypes\` | снять | |
| Принимаемые типы | Brick_Deco | |
| \`StopAt\` | **Never** для съёма на ходу / **Sensor**, если кирпич должен ждать | Never сохраняет поток; Sensor облегчает работу робота |

**Процесс укладки (на позиции паллеты)**

| Свойство | Значение | Смысл |
|---|---|---|
| Имя процесса | \`Place_Pallet\` | |
| \`ProcessType\` | **Place** | продукты доставляются *сюда* |
| \`ProductsOn\` | **Assembly** | цель — сборка паллеты, поэтому слоты задают точные позиции |
| \`ReverseSlotOrder\` | снять | заполнение с меньшего OrderIndex = сначала нижний слой |
| \`AcceptAllProductTypes\` | снять | |
| \`StopAt\` | Never | |

> NOTE — Именно \`ProductsOn = Assembly\` позволяет паллетировать без обучения 192 точек. Процесс укладки создаёт транспортные задачи для шагов сборки в порядке **обхода в глубину**, а внутри шага слоты заполняются по возрастанию \`OrderIndex\` — то есть сначала нижний левый кирпич первого слоя и в конце верхний правый кирпич восьмого слоя. Если вы по ошибке задали слотам \`DefaultProductType\` (шаг 1.2), процесс не найдёт свободного слота и робот будет простаивать вечно.
`,
      },
    },
    {
      id: 'transport-controller',
      title: { en: '1.8 Transport controller and flow', ru: '1.8 Транспортный контроллер и поток' },
      body: {
        en: `
This is the step that makes the robot work without writing a program.

**Add the controller**

1. **eCatalog › PM Transport Controllers › Pick And Place Transport Controller** (or **Robot Transport Controller** for a classic articulated palletizing cell) into the world above the working area.
2. **PnP** the FANUC robot onto the controller so the robot is "attached" to it. In the Cell Graph the robot becomes a child of the controller.
3. If you used the plain Robot Transport Controller, connect the robot's interface to the controller: select the controller, **HOME › Connect › Interfaces**, and click each interface in the list to add a connection.

**LinkDefaults tab — the values that matter**

| Property | Value | Why |
|---|---|---|
| \`TcpIndex\` | **17** | the connected end effector's tool frame; if 17 does not exist VC falls back to the first tool frame, which will place bricks at the flange |
| \`PlaceMultiple\` | One-By-One | single-cup pick; use All-At-Once with Capacity 2 for a double gripper |
| \`PickTime\` | 0.4 s | vacuum build-up + valve |
| \`PlaceTime\` | 0.3 s | release + blow-off |
| \`ApproachMotion\` | **LIN** | linear approach; the exact pick and place motions are always LIN |
| \`PickApproach\` | X 0, Y 0, **Z 150** | retract height above the belt — clear the stopper and the neighbouring bricks |
| \`PlaceApproach\` | X 0, Y 0, **Z 200** | higher, because layer 8 is 585 mm above the pallet and you must clear the finished stack |
| \`GripperSignalOpen\` | 101 | |
| \`GripperSignalClose\` | 102 | set to −1 to use the tool's naming convention instead |

**Speeds and AutoHoming**

- **Speeds tab**: set the joint and linear speeds the robot may use in the cell. A realistic palletizing value is 800–1200 mm/s linear; do not leave the default maximum or your cycle time will be fantasy.
- **AutoHoming tab**: \`Enabled\` checked, \`Delay\` 5 s. The home position is the pose the robot has when the simulation is reset, **unless** the program contains a non-empty subroutine named \`home\` — then that subroutine is used. Teach a proper home (arm folded, wrist neutral, clear of the stack) rather than relying on the reset pose.

**Helpers tab**

- \`OptimizePosition\` moves and rotates the controller to the middle of the connected processes, assuming parallel conveyors. Use it *after* the flow and transport links exist.
- \`OptimizeFrameHeight\` only applies to a ceiling-mounted frame.

**Transport links and flow**

1. **PROCESS MODELING › Transport Link**: create the link from \`Pick_Brick\` to \`Place_Pallet\` and set its **Implementer** to your transport controller.
2. Leave \`UseCustomParameters\` **unchecked** on the link so it inherits LinkDefaults; check it only when this one link needs different values.
3. **PROCESS MODELING › Flow** and define the product flow steps:

~~~text
Flow group "Bricks" :  BrickFeeder  →  Pick_Brick  →  Place_Pallet  →  OutConveyor
Flow group "Pallets":  PalletFeeder →  SwapPosition →  Place_Pallet  →  OutConveyor
~~~

4. Conveyor transport between feeder and pick process needs **no** transport link — products ride inside the conveyor container. Only the pick→place jump needs one.
5. Press play. The robot should now pick from the belt and fill the pallet layer by layer.

> TIP — If the belt outruns the robot, the manual's own advice applies: slow the conveyor, make it stop, or clone the pick process, the place process and the controller to add a second robot. Cloning is the fastest capacity experiment you can run, and comparing one robot against two is an excellent results section for a report.

**Multi-pick (optional, and worth the marks)**

Two bricks per cycle would halve the cycle time. To model it: set \`Capacity\` = 2 on the controller's Transport tab, \`TcpIndex\` = "1,2" (two tool frames spaced exactly like the slot pair), \`PlaceMultiple\` = All-At-Once, and \`GripperSignalOpen/Close\` = "101,111" / "102,112". The slot spacing in the assembly must be uniform, and the distance between the two tool frames must equal the distance between the paired slots.
`,
        ru: `
Это шаг, который заставляет робота работать без написания программы.

**Добавьте контроллер**

1. **eCatalog › PM Transport Controllers › Pick And Place Transport Controller** (или **Robot Transport Controller** для классической ячейки паллетирования на шарнирном роботе) в мир над рабочей зоной.
2. **PnP**: присоедините робота FANUC к контроллеру, чтобы робот был «прикреплён» к нему. В Cell Graph робот станет дочерним для контроллера.
3. Если взяли обычный Robot Transport Controller, соедините интерфейс робота с контроллером: выделите контроллер, **HOME › Connect › Interfaces** и кликните по каждому интерфейсу в списке, чтобы добавить соединение.

**Вкладка LinkDefaults — значимые значения**

| Свойство | Значение | Почему |
|---|---|---|
| \`TcpIndex\` | **17** | кадр инструмента подключённого захвата; если 17 не существует, VC откатится к первому кадру и будет ставить кирпичи по фланцу |
| \`PlaceMultiple\` | One-By-One | одиночный захват; All-At-Once с Capacity 2 — для двойного захвата |
| \`PickTime\` | 0,4 с | нарастание вакуума + клапан |
| \`PlaceTime\` | 0,3 с | отпускание + обдув |
| \`ApproachMotion\` | **LIN** | линейный подвод; сами движения съёма и укладки всегда LIN |
| \`PickApproach\` | X 0, Y 0, **Z 150** | высота отхода над лентой — выше стопора и соседних кирпичей |
| \`PlaceApproach\` | X 0, Y 0, **Z 200** | выше, потому что 8-й слой на 585 мм выше паллеты и надо перекрывать готовый штабель |
| \`GripperSignalOpen\` | 101 | |
| \`GripperSignalClose\` | 102 | −1 — использовать соглашение об именах сигналов инструмента |

**Вкладки Speeds и AutoHoming**

- **Speeds**: задайте допустимые скорости суставов и линейную скорость в ячейке. Реалистично для паллетирования 800–1200 мм/с; не оставляйте максимум по умолчанию, иначе время цикла будет фантастикой.
- **AutoHoming**: \`Enabled\` включён, \`Delay\` 5 с. Домашняя позиция — это поза робота в момент сброса симуляции, **если только** в программе нет непустой подпрограммы \`home\`: тогда используется она. Обучите нормальный home (рука собрана, кисть нейтральна, вне штабеля), а не полагайтесь на позу сброса.

**Вкладка Helpers**

- \`OptimizePosition\` перемещает и поворачивает контроллер в середину между подключёнными процессами, предполагая параллельные конвейеры. Применяйте *после* создания потока и транспортных связей.
- \`OptimizeFrameHeight\` работает только для потолочной рамы.

**Транспортные связи и поток**

1. **PROCESS MODELING › Transport Link**: создайте связь из \`Pick_Brick\` в \`Place_Pallet\` и задайте её **Implementer** = ваш транспортный контроллер.
2. Оставьте \`UseCustomParameters\` на связи **выключенным**, чтобы она наследовала LinkDefaults; включайте, только если этой связи нужны свои значения.
3. **PROCESS MODELING › Flow** определите шаги потока продуктов:

~~~text
Группа "Bricks" :  BrickFeeder  →  Pick_Brick  →  Place_Pallet  →  OutConveyor
Группа "Pallets":  PalletFeeder →  SwapPosition →  Place_Pallet  →  OutConveyor
~~~

4. Конвейерный транспорт между фидером и процессом съёма в транспортной связи **не** нуждается — продукты едут внутри контейнера конвейера. Связь нужна только для прыжка съём→укладка.
5. Нажмите пуск. Робот должен брать кирпичи с ленты и заполнять паллету слой за слоем.

> TIP — Если лента обгоняет робота, применим совет из самого руководства: замедлите конвейер, остановите его либо клонируйте процесс съёма, процесс укладки и контроллер, добавив второго робота. Клонирование — самый быстрый эксперимент с производительностью, а сравнение «один робот против двух» — отличный раздел результатов в отчёте.

**Мультизахват (необязательно, но добавляет баллов)**

Два кирпича за цикл вдвое сократили бы время цикла. Чтобы смоделировать: \`Capacity\` = 2 на вкладке Transport контроллера, \`TcpIndex\` = «1,2» (два кадра инструмента с расстоянием ровно как у пары слотов), \`PlaceMultiple\` = All-At-Once, \`GripperSignalOpen/Close\` = «101,111» / «102,112». Расстояние между слотами в сборке должно быть равномерным, а дистанция между двумя кадрами инструмента — равной дистанции между парными слотами.
`,
      },
    },
    {
      id: 'safety',
      title: { en: '1.9 Safety: fence, light curtain, cabinet, signage', ru: '1.9 Безопасность: ограждение, светозанавес, шкаф, знаки' },
      body: {
        en: `
A palletizing cell without guarding is not a layout, it is a lawsuit. Model it properly.

1. **Fence.** **eCatalog › Models by Type › Facilities - Factory › Visual Components › Fence and Wall Builder** (or **Generic Fence** panels). Draw the perimeter around the robot, the pick station and the pallet station. Cell size 5000 × 4500 mm, panel height 2000 mm. Delete the builder component once the fence exists — it is a tool, not part of the layout.
2. **Keep-out distance.** The fence must be outside the **stopping** envelope, not the static one. For the 7L, a power-off stop travels up to 69° in J1. Add the 500 mm maintenance clearance from the manual on the sides where a technician must stand, and 705 mm of height clearance above the arm.
3. **Light curtain** at the pallet in/out opening, plus a **Grill Door** with an interlock signal on the personnel gate.
4. **Safety area** component around the cell, and **Safety Signs** on the fence.
5. **Controller cabinet.** Place an R-30iB Plus cabinet model (Facilities - Factory, or a generic cabinet) **outside** the guarded envelope, within reach of the pendant cable, with its ventilation side unobstructed — the daily check in Part 3 is literally "is the controller ventilation dusty", and you cannot check what you did not model.
6. **Signals.** Create the safety chain in **HOME › Connect › Signals**:

| Signal | Type | Meaning |
|---|---|---|
| \`SI_FenceGate\` | Boolean input | gate closed = TRUE |
| \`SI_LightCurtain\` | Boolean input | beam clear = TRUE |
| \`SO_CellRunning\` | Boolean output | beacon / beacon-and-horn |
| \`SO_RobotFault\` | Boolean output | alarm state to the plant PLC |

Wire \`SI_FenceGate\` and \`SI_LightCurtain\` into the robot controller's enable chain so that opening the gate stops the cell. In the simulation this is what makes the statistics honest: if you never model an interlock, your OEE has no downtime in it.

> NOTE — In your report, state the standard you designed to. ISO 10218-1 (robot), ISO 10218-2 (cell/installation), ISO/TS 15066 only if you claim collaboration — the LR Mate 200iD is an industrial robot and is **not** collaborative unless a DCS-configured safe zone says otherwise. FANUC's own safety handbook is B-80687EN and the Dual Check Safety manual for the R-30iB Plus is B-83184EN.
`,
        ru: `
Ячейка паллетирования без ограждения — это не планировка, а иск. Смоделируйте её правильно.

1. **Ограждение.** **eCatalog › Models by Type › Facilities - Factory › Visual Components › Fence and Wall Builder** (или панели **Generic Fence**). Обведите периметр вокруг робота, позиции съёма и позиции паллеты. Размер ячейки 5000 × 4500 мм, высота панели 2000 мм. После создания ограждения удалите компонент-билдер: это инструмент, а не часть макета.
2. **Безопасное расстояние.** Ограждение должно быть снаружи **тормозной** зоны, а не статической. У 7L остановка снятием питания даёт до 69° хода J1. Добавьте 500 мм зоны обслуживания из руководства там, где должен стоять техник, и 705 мм по высоте над рукой.
3. **Световой занавес** в проёме входа/выхода паллет плюс **Grill Door** с сигналом блокировки на калитке для персонала.
4. Компонент **Safety Area** вокруг ячейки и **Safety Signs** на ограждении.
5. **Шкаф контроллера.** Поставьте модель шкафа R-30iB Plus (Facilities - Factory или универсальный шкаф) **снаружи** защищённой зоны, в пределах длины кабеля пульта, с свободной стороной вентиляции: ежедневная проверка из части 3 буквально звучит как «не запылена ли вентиляция контроллера», а проверить несмоделированное нельзя.
6. **Сигналы.** Соберите цепь безопасности в **HOME › Connect › Signals**:

| Сигнал | Тип | Смысл |
|---|---|---|
| \`SI_FenceGate\` | Bool вход | калитка закрыта = TRUE |
| \`SI_LightCurtain\` | Bool вход | луч свободен = TRUE |
| \`SO_CellRunning\` | Bool выход | маяк / маяк со звуком |
| \`SO_RobotFault\` | Bool выход | авария в ПЛК завода |

Заведите \`SI_FenceGate\` и \`SI_LightCurtain\` в цепь разрешения контроллера робота, чтобы открытие калитки останавливало ячейку. В симуляции именно это делает статистику честной: если блокировку не смоделировать, в вашем OEE не будет простоев.

> NOTE — В отчёте укажите стандарт, по которому проектировали. ISO 10218-1 (робот), ISO 10218-2 (ячейка/установка), ISO/TS 15066 — только если заявляете коллаборативность: LR Mate 200iD промышленный робот и **не** коллаборативен, если настроенная зона DCS не говорит обратное. Собственный справочник безопасности FANUC — B-80687EN, а руководство Dual Check Safety для R-30iB Plus — B-83184EN.
`,
      },
    },
    {
      id: 'plant-zones',
      title: { en: '1.10 The rest of the plant (zones A–C, E)', ru: '1.10 Остальной завод (зоны A–C, E)' },
      body: {
        en: `
Model these at flow level, not geometry level. The point of zones A–C and E is to give the palletizing cell a **source** and a **sink** with realistic rates.

| Zone | Components | Key properties |
|---|---|---|
| A · Forming | Mixer (machine), extruder/press (machine), cutter (machine), belt conveyor | cycle times 8–12 s per brick group; output = wet bricks at 20/min |
| B · Drying + firing | long belt or chain conveyor through a dryer box and a tunnel kiln box; kiln cars as products | dryer cycle 45 min, kiln cycle 6 h — model as one machine with a long \`ProcessTime\` and a large internal buffer, otherwise the simulation crawls |
| C · Unloading + QC | unloading conveyor, brushing station, human resource for visual inspection, reject bin | QC rejects 2 % → a second flow to scrap; this is where your OEE loss comes from |
| E · Packing | stretch wrapper (machine), label printer, forklift/mobile robot, rack warehouse | wrapper cycle 90 s per pallet — compare it to the 19.2 min fill time; it is never the bottleneck |

**How to make a long process not destroy your simulation**

1. Do not simulate six hours of firing. Use a machine component with \`ProcessTime\` scaled down and a note in the report: "kiln modelled at 1:60 time scale; throughput preserved by matching the output rate".
2. Alternatively, let zone B be a **feeder with a fixed output rate** and no internal process at all. Honest, simple, and the statistics downstream are identical.
3. Keep the *bottleneck analysis* inside zone D where the robot lives — that is where the assignment is.

> TIP — Add a **Chart** (HOME › Export › Chart(s)) for product counts at three points: after zone C, into the pallet, out of the wrapper. Three curves on one chart is the single most convincing picture you can put in a report, and it immediately shows whether material is disappearing between stages.
`,
        ru: `
Моделируйте эти зоны на уровне потока, а не геометрии. Смысл зон A–C и E — дать ячейке паллетирования **источник** и **приёмник** с реалистичными темпами.

| Зона | Компоненты | Ключевые свойства |
|---|---|---|
| A · Формовка | смеситель (станок), экструдер/пресс (станок), резка (станок), ленточный конвейер | время цикла 8–12 с на группу кирпичей; выход = сырцовые кирпичи 20/мин |
| B · Сушка + обжиг | длинный ленточный или цепной конвейер через блок сушилки и блок туннельной печи; печные вагонетки как продукты | сушка 45 мин, обжиг 6 ч — моделируйте одним станком с большим \`ProcessTime\` и ёмким внутренним буфером, иначе симуляция будет ползти |
| C · Разгрузка + контроль | разгрузочный конвейер, щёточная станция, человеческий ресурс для визуального контроля, бункер брака | брак 2 % → второй поток в отходы; отсюда берётся потеря OEE |
| E · Упаковка | стретч-обмотчик (станок), принтер этикеток, погрузчик/мобильный робот, стеллажный склад | цикл обмотки 90 с на паллету — сравните с 19,2 мин заполнения; узким местом он не бывает никогда |

**Как не дать длинному процессу убить симуляцию**

1. Не моделируйте шесть часов обжига. Возьмите станок с масштабированным \`ProcessTime\` и оговоркой в отчёте: «печь смоделирована в масштабе времени 1:60; производительность сохранена за счёт соответствия выходного темпа».
2. Либо пусть зона B будет **фидером с фиксированным темпом** вообще без внутреннего процесса. Честно, просто, и статистика ниже по потоку не изменится.
3. **Анализ узкого места** оставьте внутри зоны D, где живёт робот: задание именно про неё.

> TIP — Добавьте **график** (HOME › Export › Chart(s)) по количеству продуктов в трёх точках: после зоны C, на паллету, из обмотчика. Три кривые на одном графике — самая убедительная картинка для отчёта, и она сразу показывает, не исчезает ли материал между переделами.
`,
      },
    },
    {
      id: 'program',
      title: { en: '1.11 Route B — teach the robot program by hand', ru: '1.11 Маршрут B — обучить программу вручную' },
      body: {
        en: `
Use this route when the report must show an actual robot program — and it is the route that maps one-to-one onto the FANUC TP program you would write on the real controller.

**Prepare**

1. **PROGRAM** tab. Click the robot in the 3D world (or use **Jog** and then click it). The **Program Editor** panel shows its program; the manipulator appears on the flange.
2. In the **Jog** panel: \`Base\` = the cell base frame, \`Tool\` = **TOOL[17]** (the vacuum gripper), \`Coordinates\` = World or Object as needed. The XYZABC readout now shows the cup face position.

**Teach the pick**

1. **Program Editor › Subprograms › +** to add a sequence; rename it **\`T1_PICK\`**.
2. **HOME/PROGRAM › Tools › Snap**, point at the centre of the brick's top face, click to move the robot there.
3. Add statements in this order, then drag them into place:

| # | Statement | Position | Purpose |
|---|---|---|---|
| 1 | Joint Motion Statement | **P1 · Approach** | fast PTP to 150 mm above the brick |
| 2 | Linear Motion Statement | **P2 · Pick** | linear descent onto the brick |
| 3 | Set Binary Output Statement | — | \`OutputPort\` = 10, \`OutputValue\` = TRUE → vacuum ON |
| 4 | Wait For Signal Statement | — | wait for \`DI[11] vacuum reached\`, timeout 1 s |
| 5 | Linear Motion Statement | **P3 · Retract** | linear lift back to P1 height |

4. Name every statement and position (\`Approach - P1\`, \`Pick - P2\`, \`Retract - P3\`). Motion statement labels appear in the 3D world, so unnamed points become unreadable after ten cycles.

**Teach the place with a computed pattern**

Teaching 192 positions by hand is not what a professional does. Three better options:

- **Frame offset**: teach one corner position and use a **Wait/If** with a frame or offset so each brick is placed at \`P_place + (col × 250, row × 120, layer × 65)\`.
- **Robot base on the pallet**: create a base frame attached to the pallet node (Frame types → robot bases → pick the pallet), then place positions are relative to the pallet and stay correct as the stack grows.
- **Call a pattern subroutine** with counters — the structure below.

~~~text
MAIN
  1:  J PR[1:HOME] 100% FINE
  2:  R[10:layer] = 0
  3:  WHILE R[10] < 8
  4:    R[11:row] = 0
  5:    WHILE R[11] < 6
  6:      R[12:col] = 0
  7:      WHILE R[12] < 4
  8:        CALL T1_PICK
  9:        CALL T2_PLACE(R[10], R[11], R[12])
 10:        R[12:col] = R[12] + 1
 11:      ENDWHILE
 12:      R[11:row] = R[11] + 1
 13:    ENDWHILE
 14:    R[10:layer] = R[10] + 1
 15:  ENDWHILE
 16:  DO[20:pallet full] = ON
 17:  CALL T3_HOME
~~~

That listing is what you put in the report as the FANUC-side program; the Visual Components routines \`T1_PICK\`, \`T2_PLACE\`, \`T3_HOME\` mirror it exactly, which is precisely what makes step 1.15 (post-processing) credible.

**Signals to the cell**

- \`DO[20] pallet full\` → the pallet shuttle swaps.
- \`DI[21] pallet in position\` → the robot may start the layer loop.
- \`DI[22] brick at pick station\` → from the conveyor sensor, so the robot does not grab air.
- \`DO[23] conveyor stop\` → hold the belt while picking, if you chose \`StopAt = Sensor\`.

> NOTE — On the real FANUC, the same cell would normally run **PalletTool** with a pattern register instead of hand-written loops. Mention that in the report: it shows you know the difference between a teaching exercise and a production cell.
`,
        ru: `
Этот маршрут нужен, когда в отчёте должна быть настоящая программа робота, и именно он один в один отображается на программу для пульта FANUC, которую вы писали бы на реальном контроллере.

**Подготовка**

1. Вкладка **PROGRAM**. Кликните робота в 3D-мире (или нажмите **Jog**, затем кликните). Панель **Program Editor** покажет его программу, на фланце появится манипулятор.
2. В панели **Jog**: \`Base\` = кадр базы ячейки, \`Tool\` = **TOOL[17]** (вакуумный захват), \`Coordinates\` = World или Object по необходимости. Показания XYZABC теперь относятся к плоскости присосок.

**Обучение съёма**

1. **Program Editor › Subprograms › +** — добавить последовательность; переименуйте в **\`T1_PICK\`**.
2. **Tools › Snap**, наведите на центр верхней грани кирпича, кликните — робот переместится туда.
3. Добавьте утверждения в этом порядке, затем перетащите их на места:

| № | Утверждение | Позиция | Назначение |
|---|---|---|---|
| 1 | Joint Motion Statement | **P1 · Approach** | быстрый PTP на 150 мм выше кирпича |
| 2 | Linear Motion Statement | **P2 · Pick** | линейный спуск на кирпич |
| 3 | Set Binary Output Statement | — | \`OutputPort\` = 10, \`OutputValue\` = TRUE → вакуум ВКЛ |
| 4 | Wait For Signal Statement | — | ждать \`DI[11] вакуум достигнут\`, таймаут 1 с |
| 5 | Linear Motion Statement | **P3 · Retract** | линейный подъём обратно на высоту P1 |

4. Называйте каждое утверждение и позицию (\`Approach - P1\`, \`Pick - P2\`, \`Retract - P3\`). Метки утверждений движения видны в 3D-мире, поэтому безымянные точки становятся нечитаемыми после десяти циклов.

**Обучение укладки с вычисляемой схемой**

Обучать 192 позиции руками профессионал не станет. Три лучших варианта:

- **Смещение кадра**: обучите одну угловую позицию и используйте кадр или смещение, чтобы каждый кирпич ставился в \`P_place + (col × 250, row × 120, layer × 65)\`.
- **База робота на паллете**: создайте кадровую базу, привязанную к узлу паллеты (Frame types → базы робота → выбрать паллету); тогда позиции укладки относительны к паллете и остаются верными по мере роста штабеля.
- **Вызов подпрограммы схемы** со счётчиками — структура ниже.

~~~text
MAIN
  1:  J PR[1:HOME] 100% FINE
  2:  R[10:layer] = 0
  3:  WHILE R[10] < 8
  4:    R[11:row] = 0
  5:    WHILE R[11] < 6
  6:      R[12:col] = 0
  7:      WHILE R[12] < 4
  8:        CALL T1_PICK
  9:        CALL T2_PLACE(R[10], R[11], R[12])
 10:        R[12:col] = R[12] + 1
 11:      ENDWHILE
 12:      R[11:row] = R[11] + 1
 13:    ENDWHILE
 14:    R[10:layer] = R[10] + 1
 15:  ENDWHILE
 16:  DO[20:pallet full] = ON
 17:  CALL T3_HOME
~~~

Этот листинг идёт в отчёт как программа со стороны FANUC; подпрограммы Visual Components \`T1_PICK\`, \`T2_PLACE\`, \`T3_HOME\` повторяют её один в один, и именно это делает шаг 1.15 (постпроцессирование) достоверным.

**Сигналы в ячейку**

- \`DO[20] паллета полная\` → челнок паллет производит обмен.
- \`DI[21] паллета на позиции\` → робот может начинать послойный цикл.
- \`DI[22] кирпич на позиции съёма\` → от датчика конвейера, чтобы робот не хватал воздух.
- \`DO[23] стоп конвейера\` → удерживать ленту на время съёма, если выбрано \`StopAt = Sensor\`.

> NOTE — На реальном FANUC такая ячейка обычно работает под **PalletTool** с регистром схемы, а не на самописных циклах. Упомяните это в отчёте: так видно, что вы различаете учебное упражнение и производственную ячейку.
`,
      },
    },
    {
      id: 'python',
      title: { en: '1.12 Route C — drive the robot from Python', ru: '1.12 Маршрут C — управление роботом из Python' },
      body: {
        en: `
Use Python when the pattern must be computed (mixed SKUs, layers that alternate orientation, a pattern that depends on the incoming order) or when you want the cycle to be reproducible without 192 taught points.

The helper library is **vcHelpers.Robot2**. Attach the script to the robot component (or to a controller component) and use its \`pick()\` and \`place()\` methods.

~~~python
from vcScript import *
from vcHelpers.Robot2 import *

comp   = getComponent()
robot  = getRobot(comp)          # vcHelpers.Robot2 wrapper
sim    = getSimulation()

BRICKS_PER_LAYER = 24
LAYERS           = 8
PITCH_X          = 250.0         # mm
PITCH_Y          = 120.0
PITCH_Z          = 65.0
ORIGIN           = (-375.0, -300.0, 176.5)   # first brick centre on the pallet

def place_position(col, row, layer):
    """Return the frame position of one slot in the stack."""
    x = ORIGIN[0] + col * PITCH_X
    y = ORIGIN[1] + row * PITCH_Y
    z = ORIGIN[2] + layer * PITCH_Z
    return x, y, z

def run():
    robot.home()
    for layer in range(LAYERS):
        for row in range(BRICKS_PER_LAYER // 4):
            for col in range(4):
                # 1. pick the next brick from the belt
                part = robot.findFreeProduct("Pick_Brick")
                if part is None:
                    sim.delay(0.5, lambda: robot.findFreeProduct("Pick_Brick") is None)
                    part = robot.findFreeProduct("Pick_Brick")
                if part is None:
                    return
                robot.pick(part, "TOOL[17]")

                # 2. place it into the computed slot
                x, y, z = place_position(col, row, layer)
                robot.place(part, target=(x, y, z))
    robot.setOutput("DO_PalletFull", True)

while True:
    run()
~~~

| Method | What it does |
|---|---|
| \`getRobot(comp)\` | wraps the component's robot executor with the helper API |
| \`robot.home()\` | runs the \`home\` subroutine if present, otherwise returns to the reset pose |
| \`robot.pick(part, tcp)\` | moves to the part, closes the tool, attaches the part |
| \`robot.place(part, target)\` | moves to the target, opens the tool, releases the part |
| \`sim.delay(t, condition)\` | suspends the script until the condition is false — the correct way to wait for material |
| \`robot.driveJoints(...)\` | direct joint control, useful for a maintenance-pose demo (see Part 2) |

> TIP — The same script can demonstrate the failure mode from the task. Add a joint-position offset to J5 of 0.3° inside the loop and watch the top layers drift off the pattern: that is exactly what a slack J5 belt does to a palletizing cell, and it is a far more convincing argument in a report than a sentence saying "backlash causes errors".

> WARNING — Python scripting requires the MODELING tab, i.e. Professional or Premium. On Essentials use route 1.8 or 1.11.
`,
        ru: `
Python нужен, когда схему надо вычислять (смешанные артикулы, чередующиеся по ориентации слои, схема, зависящая от входящего заказа) или когда цикл должен воспроизводиться без 192 обученных точек.

Вспомогательная библиотека — **vcHelpers.Robot2**. Привяжите скрипт к компоненту робота (или к компоненту контроллера) и используйте методы \`pick()\` и \`place()\`.

~~~python
from vcScript import *
from vcHelpers.Robot2 import *

comp   = getComponent()
robot  = getRobot(comp)          # обёртка vcHelpers.Robot2
sim    = getSimulation()

BRICKS_PER_LAYER = 24
LAYERS           = 8
PITCH_X          = 250.0         # мм
PITCH_Y          = 120.0
PITCH_Z          = 65.0
ORIGIN           = (-375.0, -300.0, 176.5)   # центр первого кирпича на паллете

def place_position(col, row, layer):
    """Возвращает позицию одного слота в штабеле."""
    x = ORIGIN[0] + col * PITCH_X
    y = ORIGIN[1] + row * PITCH_Y
    z = ORIGIN[2] + layer * PITCH_Z
    return x, y, z

def run():
    robot.home()
    for layer in range(LAYERS):
        for row in range(BRICKS_PER_LAYER // 4):
            for col in range(4):
                # 1. взять следующий кирпич с ленты
                part = robot.findFreeProduct("Pick_Brick")
                if part is None:
                    sim.delay(0.5, lambda: robot.findFreeProduct("Pick_Brick") is None)
                    part = robot.findFreeProduct("Pick_Brick")
                if part is None:
                    return
                robot.pick(part, "TOOL[17]")

                # 2. положить его в вычисленный слот
                x, y, z = place_position(col, row, layer)
                robot.place(part, target=(x, y, z))
    robot.setOutput("DO_PalletFull", True)

while True:
    run()
~~~

| Метод | Что делает |
|---|---|
| \`getRobot(comp)\` | оборачивает исполнительное устройство компонента вспомогательным API |
| \`robot.home()\` | выполняет подпрограмму \`home\`, если она есть, иначе возвращает в позу сброса |
| \`robot.pick(part, tcp)\` | подводит к детали, закрывает инструмент, присоединяет деталь |
| \`robot.place(part, target)\` | подводит к цели, открывает инструмент, отпускает деталь |
| \`sim.delay(t, condition)\` | приостанавливает скрипт, пока условие не станет ложным — правильный способ ждать материал |
| \`robot.driveJoints(...)\` | прямое управление суставами; удобно для демонстрации сервисной позы (см. часть 2) |

> TIP — Тем же скриптом можно показать отказ из задания. Добавьте в цикл смещение положения J5 на 0,3° и посмотрите, как верхние слои уезжают со схемы: ровно это и делает ослабленный ремень J5 с ячейкой паллетирования. В отчёте такой аргумент убедительнее фразы «люфт вызывает ошибки».

> WARNING — Скрипты Python требуют вкладки MODELING, то есть Professional или Premium. На Essentials используйте маршрут 1.8 или 1.11.
`,
      },
    },
    {
      id: 'run-tune',
      title: { en: '1.13 Run, measure, tune', ru: '1.13 Запуск, измерение, настройка' },
      body: {
        en: `
1. **Reset**, then **Play**. Set the speed to ×4 once the cell behaves, but always validate at ×1 first — collisions and dropped products look different at high speed.
2. Let it run to at least **one full pallet** (≈ 20 minutes of simulated time) so the pallet-exchange overhead is inside the measurement window.
3. Read the results in the **Output / Statistics** panel and via **FILE › Export › Statistics**:

| Metric | Target | Where to read it |
|---|---|---|
| Cell throughput | 600 bricks/h | product counter at the out-conveyor |
| Robot utilisation | ≥ 85 % | resource utilisation of the robot |
| Robot idle waiting for material | ≤ 5 % | idle time of the transport controller |
| Pallet cycle time | 19.2 min (shuttle) / 21.2 min (single) | timestamp between two \`PalletFull\` signals |
| Products dropped / missed picks | 0 | counter difference between pick and place |
| Collisions | 0 | collision highlight during run; check the collision log |

4. **Tune in this order**, changing one thing at a time and re-measuring:

| Symptom | First thing to change |
|---|---|
| Robot idle, belt empty | feeder \`CreationInterval\` down, or belt speed up |
| Bricks pile up at the pick station | belt speed down, or add a stopper so they queue neatly |
| Robot cannot reach the far pallet corners | move the robot base 100–200 mm towards the pallet, or raise \`PlaceApproach\` |
| Bricks placed inside each other | check the slot pitch against the brick size; \`PlaceTime\` too short can release mid-motion |
| Gripper hits the finished stack | increase \`PlaceApproach\` Z, or teach a via point above the stack |
| Cycle time above 6 s | check the Speeds tab — you are probably at a conservative joint speed |

5. Record the **before** and **after** numbers of at least one tuning action. That table is the results section of your report.

> NOTE — Always **Reset** before you save or export statistics. Resetting returns the simulation to runtime zero and to the initial component state, which is the only reproducible baseline.
`,
        ru: `
1. **Reset**, затем **Play**. Скорость ×4 ставьте, когда ячейка уже ведёт себя правильно, но валидируйте всегда на ×1: коллизии и потерянные продукты на высокой скорости выглядят иначе.
2. Дайте поработать минимум **одну полную паллету** (≈ 20 минут модельного времени), чтобы накладные расходы обмена паллет попали в окно измерения.
3. Считайте результаты в панели **Output / Statistics** и через **FILE › Export › Statistics**:

| Метрика | Цель | Где смотреть |
|---|---|---|
| Производительность ячейки | 600 кирп/ч | счётчик продуктов на выходном конвейере |
| Загрузка робота | ≥ 85 % | утилизация ресурса «робот» |
| Простой робота в ожидании материала | ≤ 5 % | время простоя транспортного контроллера |
| Время цикла паллеты | 19,2 мин (челнок) / 21,2 мин (одна позиция) | метки времени между двумя сигналами \`PalletFull\` |
| Потерянные продукты / пропущенные захваты | 0 | разница счётчиков съёма и укладки |
| Коллизии | 0 | подсветка коллизий во время прогона, журнал коллизий |

4. **Настраивайте в таком порядке**, меняя по одному параметру и перемеряя:

| Симптом | Что менять первым |
|---|---|
| Робот простаивает, лента пуста | уменьшить \`CreationInterval\` фидера либо увеличить скорость ленты |
| Кирпичи скапливаются на позиции съёма | снизить скорость ленты или добавить стопор, чтобы они вставали в очередь |
| Робот не дотягивается до дальних углов паллеты | сдвинуть базу робота на 100–200 мм к паллете или поднять \`PlaceApproach\` |
| Кирпичи ставятся друг в друга | сверьте шаг слотов с размером кирпича; слишком малое \`PlaceTime\` может отпускать продукт в движении |
| Захват задевает готовый штабель | увеличить Z у \`PlaceApproach\` или обучить промежуточную точку над штабелем |
| Время цикла больше 6 с | проверьте вкладку Speeds — скорее всего, скорость суставов консервативная |

5. Зафиксируйте числа **до** и **после** хотя бы одной настройки. Эта таблица и есть раздел результатов вашего отчёта.

> NOTE — Всегда делайте **Reset** перед сохранением и перед экспортом статистики. Сброс возвращает симуляцию к нулевому времени и начальному состоянию компонентов — это единственная воспроизводимая база.
`,
      },
    },
    {
      id: 'deliverables',
      title: { en: '1.14 Deliverables: drawings, BOM, 3D PDF, video', ru: '1.14 Результаты: чертежи, спецификация, 3D PDF, видео' },
      body: {
        en: `
| Deliverable | How | What to put in it |
|---|---|---|
| 2D layout drawing | **DRAWING** tab → create views (top, front), add **Linear** / **Angular** dimensions and annotations | cell footprint, fence dimensions, keep-out distances, aisle widths |
| Bill of materials | **DRAWING › Print › bill of materials** (BOM) | every component with quantity — this doubles as your equipment list for the report |
| 3D PDF | **FILE › Export › 3D PDF** | an orbitable model of the cell; the best single artefact to hand to a non-specialist |
| Video | **FILE › Export › Video**, with a camera path built from **Camera Animator** and saved views in the **View Editor** | 30–60 s: whole plant → cell → close-up of the pick → the finished pallet |
| Statistics export | **FILE › Export › Statistics** / **Chart(s)** | the throughput and utilisation numbers from step 1.13 |
| Saved layout | **FILE › Save** → \`.vcmx\` | version-numbered; also **Export copy** if you need to move it |

**Camera work that makes the video look professional**

1. Reset, select a component, **Fill Selected** on the 3D world toolbar.
2. Set the View Selector to the angle you want, open **View Editor › +** and save it as a named view.
3. Repeat for 4–6 views: plant overview, cell from the fence corner, top-down, gripper close-up, pallet close-up, operator's viewpoint.
4. In **Camera Animator**, add the views as keyframes with 2–4 s each and a 1 s hold; export.

> TIP — Long file names broke video export in some earlier builds and were fixed in 4.8; still, keep export names short and ASCII (\`brickcell_v1.mp4\`) and export into an empty folder.
`,
        ru: `
| Результат | Как получить | Что туда положить |
|---|---|---|
| 2D-чертеж планировки | вкладка **DRAWING** → создать виды (сверху, спереди), добавить **Linear** / **Angular** размеры и аннотации | габариты ячейки, размеры ограждения, безопасные расстояния, ширина проходов |
| Спецификация | **DRAWING › Print › bill of materials** (BOM) | все компоненты с количеством — заодно служит перечнем оборудования для отчёта |
| 3D PDF | **FILE › Export › 3D PDF** | вращаемая модель ячейки; лучший единственный артефакт для неспециалиста |
| Видео | **FILE › Export › Video** с траекторией камеры из **Camera Animator** и сохранёнными видами в **View Editor** | 30–60 с: весь завод → ячейка → крупно захват → готовая паллета |
| Экспорт статистики | **FILE › Export › Statistics** / **Chart(s)** | цифры производительности и загрузки из шага 1.13 |
| Сохранённый макет | **FILE › Save** → \`.vcmx\` | с номером версии; при переносе используйте **Export copy** |

**Работа с камерой, которая делает видео профессиональным**

1. Reset, выделите компонент, **Fill Selected** на панели инструментов 3D-мира.
2. Поставьте View Selector в нужный ракурс, откройте **View Editor › +** и сохраните как именованный вид.
3. Повторите для 4–6 видов: общий план завода, ячейка от угла ограждения, вид сверху, крупно захват, крупно паллета, точка зрения оператора.
4. В **Camera Animator** добавьте виды как ключевые кадры по 2–4 с с задержкой 1 с; экспортируйте.

> TIP — Длинные имена файлов ломали экспорт видео в некоторых ранних сборках и были исправлены в 4.8; всё же держите имена короткими и в ASCII (\`brickcell_v1.mp4\`) и экспортируйте в пустую папку.
`,
      },
    },
    {
      id: 'olp',
      title: { en: '1.15 Post-process to FANUC (OLP variants)', ru: '1.15 Постпроцессирование в FANUC (OLP-версии)' },
      body: {
        en: `
Requires an **OLP** variant of Visual Components 4.8 (Professional OLP, Premium OLP or Robotics OLP). This is the bridge from "a nice animation" to "code the real robot can run", and it is the part of the assignment that connects the simulation to INTP-106.

1. **PROGRAM** tab → OLP tools. In 4.8 all OLP functionality is presented on the PROGRAM tab.
2. Check the motion with **Path Check** and **Program Validation** (4.8 added conveyor synchronisation support to validation and a linear 180° joint-rotation check).
3. Use **Via Solver** (available in every 4.8 product version) to fix unreachable or awkward via points. The paid **Robotics Solver** add-on additionally solves collisions, singularities and joint-limit problems on process, via and search paths.
4. **Post-process** with the FANUC post-processor. Output is an ASCII **\`.LS\`** TP source file.
5. Get it onto a controller:
   - if the target controller has the **ASCII upload / convertor option**, copy the \`.LS\` to USB (\`UD1:\`) or memory card (\`MC:\`) and load it from the **FILE** menu;
   - if it does not, the controller accepts only compiled binary **\`.TP\`** files — import the \`.LS\` into **ROBOGUIDE** (or WinOLPC), compile it for the exact robot model and software version, and transfer the resulting \`.TP\`.
6. Verify in **ROBOGUIDE** with the matching robot model (LR Mate 200iD/7L) and controller software before anything touches a real machine. Run at reduced speed, single step the first cycle.

| Symptom after transfer | Likely cause | Check |
|---|---|---|
| Program loads but the first motion never executes | singularity or configuration conflict at P[1] | run it in ROBOGUIDE and read the CONFIG string and the J5 value at that point |
| File will not load / not in the SELECT list | no ASCII upload option; \`.LS\` not compiled | controller option list; compile to \`.TP\` offline |
| Points reachable but the TCP is consistently offset | UFRAME / UTOOL mismatch between layout and controller | compare the taught frames against UF/UT in the /POS block |
| Logic or statements missing compared with the simulation | the translator does not support that statement type | re-post with the maintained translator and diff the files |
| **INTP-106 at program start** | the program cannot be resumed — see Part 2 | Alarm Log, cause code, options installed on the source vs target controller |

> NOTE — Two translator families exist: the downloadable **Robot Program Post Processor** add-on sample (wide brand list, not all statements supported, no longer actively developed) and the translators bundled with **Premium / the OLP products**, which are shared with the connectivity plugins and are maintained. For anything that will run on real hardware, use the bundled one.
`,
        ru: `
Нужна **OLP**-версия Visual Components 4.8 (Professional OLP, Premium OLP или Robotics OLP). Это мост от «красивой анимации» к «коду, который выполнит реальный робот», и именно эта часть задания связывает симуляцию с INTP-106.

1. Вкладка **PROGRAM** → инструменты OLP. В 4.8 вся функциональность OLP представлена на вкладке PROGRAM.
2. Проверьте движения через **Path Check** и **Program Validation** (в 4.8 валидация получила поддержку синхронизации с конвейером и проверку поворота сустава более чем на 180° при линейном движении).
3. Используйте **Via Solver** (доступен во всех версиях 4.8), чтобы исправить недостижимые или неудобные промежуточные точки. Платная надстройка **Robotics Solver** дополнительно решает коллизии, сингулярности и пределы осей на технологических, вспомогательных и поисковых траекториях.
4. **Постпроцессирование** постпроцессором FANUC. На выходе — ASCII-файл **\`.LS\`** с исходником TP-программы.
5. Перенос на контроллер:
   - если на целевом контроллере есть **опция ASCII upload / конвертора**, скопируйте \`.LS\` на USB (\`UD1:\`) или карту памяти (\`MC:\`) и загрузите из меню **FILE**;
   - если опции нет, контроллер принимает только скомпилированные бинарные **\`.TP\`**: импортируйте \`.LS\` в **ROBOGUIDE** (или WinOLPC), скомпилируйте под точную модель робота и версию ПО и передайте полученный \`.TP\`.
6. Проверьте в **ROBOGUIDE** с соответствующей моделью робота (LR Mate 200iD/7L) и версией ПО контроллера, прежде чем что-либо коснётся реальной машины. Запускайте на пониженной скорости, первый цикл — пошагово.

| Симптом после переноса | Вероятная причина | Что проверить |
|---|---|---|
| Программа грузится, но первое движение не выполняется | сингулярность или конфликт конфигурации в P[1] | прогнать в ROBOGUIDE и посмотреть строку CONFIG и значение J5 в этой точке |
| Файл не грузится / отсутствует в списке SELECT | нет опции ASCII upload; \`.LS\` не скомпилирован | список опций контроллера; скомпилировать в \`.TP\` офлайн |
| Точки достижимы, но TCP постоянно смещён | несовпадение UFRAME / UTOOL между макетом и контроллером | сравнить обученные кадры с UF/UT в блоке /POS |
| Логика или утверждения отсутствуют по сравнению с симуляцией | транслятор не поддерживает этот тип утверждений | пересобрать поддерживаемым транслятором и сравнить файлы |
| **INTP-106 при старте программы** | программу нельзя продолжить — см. часть 2 | журнал аварий, код причины, опции исходного и целевого контроллера |

> NOTE — Существует два семейства трансляторов: загружаемый пример надстройки **Robot Program Post Processor** (широкий список брендов, поддерживаются не все утверждения, активно не развивается) и трансляторы в составе **Premium / OLP-продуктов**, общие с плагинами подключения и поддерживаемые. Для всего, что поедет на реальном железе, используйте встроенные.
`,
      },
    },
    {
      id: 'pitfalls',
      title: { en: '1.16 Save, version and hand over', ru: '1.16 Сохранение, версии и передача' },
      body: {
        en: `
| Item | Recommendation |
|---|---|
| File name | \`BrickPlant_LR200iD7L_v03_2026-11-09.vcmx\` — model, robot, version, date |
| Version rule | increment on every completed step, keep the last three versions |
| What to archive with it | the statistics CSV, the exported charts, the 3D PDF, the video, the \`.LS\` file, the product/assembly screenshots |
| Component sources | note which components came from the Web eCatalog versus which you modelled — a reviewer must be able to reproduce the layout |
| Read-me | one page: what the layout proves, the assumptions (takt 6 s, 24 bricks/layer, 8 layers), and the known simplifications (kiln at 1:60 time scale) |

> TIP — Screenshot the **Product Type Editor**, the **assembly slot list**, the **LinkDefaults** tab and the **Program Editor** tree. Those four pictures are the evidence that your flow is configured rather than faked, and they take two minutes.
`,
        ru: `
| Пункт | Рекомендация |
|---|---|
| Имя файла | \`BrickPlant_LR200iD7L_v03_2026-11-09.vcmx\` — модель, робот, версия, дата |
| Правило версий | увеличивать на каждом завершённом шаге, хранить три последние версии |
| Что архивировать вместе с ним | CSV статистики, экспортированные графики, 3D PDF, видео, файл \`.LS\`, скриншоты продуктов и сборки |
| Происхождение компонентов | отметьте, какие компоненты из веб-каталога, а какие смоделированы сами: рецензент должен суметь воспроизвести макет |
| Read-me | одна страница: что доказывает макет, допущения (такт 6 с, 24 кирпича в слое, 8 слоёв), известные упрощения (печь в масштабе времени 1:60) |

> TIP — Сделайте скриншоты **Product Type Editor**, списка слотов сборки, вкладки **LinkDefaults** и дерева **Program Editor**. Эти четыре картинки — доказательство, что поток настроен, а не сымитирован, и занимают две минуты.
`,
      },
    },
    {
      id: 'troubleshooting',
      title: { en: '1.17 When it does not run', ru: '1.17 Когда не запускается' },
      body: {
        en: `
| Symptom | Most likely cause | Fix |
|---|---|---|
| Feeder runs but nothing appears | the feeder creates *components*, not *products* — it is from the old Feeder folder | use a feeder from **PM Flow Components** and define the product type |
| Products appear but never move to the robot | no flow defined, or the flow skips the pick process | **PROCESS MODELING › Flow** — check the step chain per flow group |
| Robot never moves although products arrive | no transport link between pick and place, or the link has no implementer | create the transport link and set **Implementer** to the controller |
| Robot moves to the product but does not attach it | \`TcpIndex\` wrong, or the tool has no grasp/attachment behaviour | set \`TcpIndex\` = 17; check the gripper's signals and \`UseGripperSignals\` |
| Robot picks but places everything at one point | \`ProductsOn\` on the place process is Conveyor, not Assembly | set **Place → \`ProductsOn\` = Assembly** |
| Robot places bricks in mid-air above the pallet | slot Z origin wrong, or the pallet assembly root step is offset | recompute the slot origin: pallet top + 65/2 for layer 1 |
| Pallet arrives already full | \`DefaultProductType\` set on the slots | set it to **Null** |
| Robot idles after the first layer | \`ReverseSlotOrder\` on, or \`OrderIndex\` duplicated | check the slot list order |
| Arm drives through the fence | no collision geometry on the tool or the product | add collision sets |
| Envelope says unreachable but the arm reaches | base frame of the robot component is not at the mounting surface | check the robot's \`Base\` frame and the WorkSpace envelope setting |
| Statistics show zero throughput although bricks move | counter is on the wrong component | place the counting sensor downstream of the place process |
| Program editor is empty after selecting the robot | you selected the component, not the robot executor | use **Jog**, then click the robot in the 3D world |
| OLP post-processing greyed out | not an OLP variant, or no post-processor licence | check the licence and the product variant |

**The three questions that resolve 90 % of Process Modelling problems**

1. Is the thing moving a **product** of a defined product type, or just a component? (Only products flow.)
2. Does a **flow** exist that passes through both the source and the destination process?
3. Is there a **transport link** with an **implementer** for every jump that is not a conveyor ride?
`,
        ru: `
| Симптом | Наиболее вероятная причина | Решение |
|---|---|---|
| Фидер работает, но ничего не появляется | фидер создаёт *компоненты*, а не *продукты* — он из старой папки Feeder | возьмите фидер из **PM Flow Components** и определите тип продукта |
| Продукты появляются, но к роботу не едут | не задан поток либо поток минует процесс съёма | **PROCESS MODELING › Flow** — проверьте цепочку шагов для группы потока |
| Робот не двигается, хотя продукты приходят | нет транспортной связи между съёмом и укладкой либо у связи нет исполнителя | создайте транспортную связь и задайте **Implementer** = контроллер |
| Робот подводится к продукту, но не присоединяет его | неверный \`TcpIndex\` либо у инструмента нет поведения захвата | поставьте \`TcpIndex\` = 17; проверьте сигналы захвата и \`UseGripperSignals\` |
| Робот берёт, но всё складывает в одну точку | у процесса укладки \`ProductsOn\` = Conveyor, а не Assembly | поставьте **Place → \`ProductsOn\` = Assembly** |
| Робот кладёт кирпичи в воздухе над паллетой | неверное начало слотов по Z либо смещён корневой шаг сборки | пересчитайте начало слотов: верх паллеты + 65/2 для первого слоя |
| Паллета приезжает уже полной | у слотов задан \`DefaultProductType\` | поставьте **Null** |
| Робот простаивает после первого слоя | включён \`ReverseSlotOrder\` либо дублируются \`OrderIndex\` | проверьте порядок списка слотов |
| Рука проходит сквозь ограждение | нет геометрии коллизий у инструмента или продукта | добавьте наборы коллизий |
| Зона говорит «недостижимо», а рука дотягивается | кадровая база компонента робота не на монтажной поверхности | проверьте кадр \`Base\` робота и настройку зоны в WorkSpace |
| Статистика показывает ноль, хотя кирпичи едут | счётчик не на том компоненте | поставьте счётный датчик ниже по потоку от процесса укладки |
| Program Editor пуст после выделения робота | выделен компонент, а не исполнительное устройство робота | используйте **Jog**, затем кликните робота в 3D-мире |
| Постпроцессирование OLP недоступно | не OLP-версия либо нет лицензии на постпроцессор | проверьте лицензию и вариант продукта |

**Три вопроса, которые решают 90 % проблем процессного моделирования**

1. Движущийся объект — это **продукт** определённого типа или просто компонент? (Течёт только продукт.)
2. Существует ли **поток**, проходящий через оба процесса — источник и приёмник?
3. Есть ли **транспортная связь** с **исполнителем** для каждого перехода, который не является поездкой по конвейеру?
`,
      },
    },
  ],
};
