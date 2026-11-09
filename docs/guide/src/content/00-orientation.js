export const part0 = {
  id: 'orientation',
  num: '0',
  title: { en: 'Orientation', ru: 'Введение' },
  sub: {
    en: 'What you are building, on which machine, in which software — and the numbers everything else is calculated from.',
    ru: 'Что вы строите, на каком роботе, в какой программе — и исходные числа, из которых считается всё остальное.',
  },
  sections: [
    {
      id: 'how-to-use',
      title: { en: 'How to use this guide', ru: 'Как пользоваться руководством' },
      body: {
        en: `
This is a single continuous guide split into six parts. Parts 0–1 are the **simulation build** in Visual Components 4.8; Parts 2–5 are the **service engineering** around the same robot; Part 6 is the source list and the downloadable annexes.

| Part | What it covers | Assignment it answers | Typical effort |
|---|---|---|---|
| 0 · Orientation | task brief, robot data sheet, software map, product definition | — | 30 min reading |
| 1 · Build the factory | layout, products, conveyor, robot, gripper, pallet pattern, process modelling, robot program, statistics, OLP export | "Decorative brick factory in VC 4.8" | 6–10 h of work |
| 2 · Diagnostics | INTP-106 analysis, J5 belt check with a tension meter, backlash, action plan | Assignment 1 | 2 h |
| 3 · Maintenance programme | daily / quarterly / annual routines, batteries, greasing, 6-month schedule | Assignment 2 | 2 h |
| 4 · Emergency recovery | mastering lost during a battery swap, Quick Master with SYSMAST.SV, Single Axis Master | Assignment 3 | 2 h |
| 5 · Reporting | claim report (акт-рекламация), tool list, report structure, filled logs | Assignment 4 | 2 h |
| 6 · Sources & annexes | official documents, downloads, glossary, Larp Components variant | — | reference |

**How to work through it**

- If you have Visual Components 4.8 installed, keep Part 1 open on a second screen and follow the numbered steps. Every step names the ribbon tab, the panel and the property exactly as they appear in 4.8.
- If you do not have a licence, Parts 2–5 stand alone: they are pure FANUC service engineering and can be written up as a report without opening the simulator.
- If you only need the paperwork, jump to Part 5 and use the downloadable templates.

> TIP — The print button in the top bar produces a clean, paginated PDF of the whole guide with the current language. Sections break sensibly and links are expanded with their URLs, so the printout is a valid report annex.

> NOTE — Units. The layout is built in **millimetres** (Visual Components default) and masses are in **kilograms**. FANUC belt tension is given in **newtons**, backlash in **millimetres**, torques in **newton-metres**. Do not mix: the single most common student error in this task is quoting belt tension in kgf.

#### Conventions used in the text

| Notation | Meaning | Example |
|---|---|---|
| **TAB › Group › Command** | ribbon path in Visual Components | **HOME › Manipulation › PnP** |
| MENU › … | teach-pendant path on the FANUC controller | MENU › SYSTEM › Master/Cal |
| <kbd>F4</kbd>, <kbd>SHIFT</kbd> | teach-pendant hard or soft key | hold <kbd>SHIFT</kbd> + <kbd>RESET</kbd> |
| \`Property\` | a component property in the Properties panel | \`ProcessType\`, \`TcpIndex\` |
| B-8xxxxxEN | FANUC manual document number | B-83494EN — LR Mate 200iD operator's manual |
| § 6.1 | section of that manual | § 6.1 Adjusting tension of belt |
`,
        ru: `
Это единое непрерывное руководство из шести частей. Части 0–1 — **построение модели** в Visual Components 4.8; части 2–5 — **сервисная инженерия** вокруг того же робота; часть 6 — список источников и загружаемые приложения.

| Часть | Содержание | Какое задание закрывает | Трудозатраты |
|---|---|---|---|
| 0 · Введение | условие, паспорт робота, карта ПО, определение продукта | — | 30 мин чтения |
| 1 · Сборка завода | планировка, продукты, конвейер, робот, захват, схема паллеты, процессное моделирование, программа, статистика, OLP-экспорт | «Завод декоративного кирпича в VC 4.8» | 6–10 ч |
| 2 · Диагностика | анализ INTP-106, проверка ремня J5 тензиометром, люфт, план действий | Задание 1 | 2 ч |
| 3 · Программа ТО | ежедневные / ежеквартальные / годовые работы, батареи, смазка, график на 6 месяцев | Задание 2 | 2 ч |
| 4 · Аварийное восстановление | потеря мастерения при замене батареи, Quick Master по SYSMAST.SV, Single Axis Master | Задание 3 | 2 ч |
| 5 · Отчётность | акт-рекламация, перечень инструмента, структура отчёта, заполненные журналы | Задание 4 | 2 ч |
| 6 · Источники и приложения | официальные документы, загрузки, глоссарий, вариант для Larp Components | — | справочник |

**Как работать с руководством**

- Если Visual Components 4.8 установлен, держите часть 1 на втором экране и идите по пронумерованным шагам. В каждом шаге названы вкладка ленты, панель и свойство ровно так, как они подписаны в 4.8.
- Если лицензии нет, части 2–5 полностью самостоятельны: это чистая сервисная инженерия FANUC, её можно оформить как отчёт, не открывая симулятор.
- Если нужны только документы — переходите в часть 5 и берите шаблоны из загрузок.

> TIP — Кнопка печати в верхней панели даёт аккуратный PDF всего руководства на текущем языке. Разделы разрываются логично, у ссылок печатается URL, поэтому распечатка годится как приложение к отчёту.

> NOTE — Единицы. Планировка строится в **миллиметрах** (по умолчанию в Visual Components), масса — в **килограммах**. Натяжение ремня FANUC указывается в **ньютонах**, люфт — в **миллиметрах**, моменты затяжки — в **ньютон-метрах**. Не путайте: самая частая студенческая ошибка в этой задаче — указать натяжение ремня в кгс.

#### Принятые обозначения

| Обозначение | Смысл | Пример |
|---|---|---|
| **ВКЛАДКА › Группа › Команда** | путь по ленте Visual Components | **HOME › Manipulation › PnP** |
| MENU › … | путь по меню пульта FANUC | MENU › SYSTEM › Master/Cal |
| <kbd>F4</kbd>, <kbd>SHIFT</kbd> | аппаратная или программная клавиша пульта | держать <kbd>SHIFT</kbd> + <kbd>RESET</kbd> |
| \`Свойство\` | свойство компонента в панели Properties | \`ProcessType\`, \`TcpIndex\` |
| B-8xxxxxEN | номер документа FANUC | B-83494EN — руководство по эксплуатации LR Mate 200iD |
| § 6.1 | раздел этого руководства | § 6.1 Adjusting tension of belt |
`,
      },
    },
    {
      id: 'task-brief',
      title: { en: 'The assignment', ru: 'Условие задачи' },
      body: {
        en: `
> TASK — A production cell runs an industrial robot **FANUC LR Mate 200iD/7L** performing a **Pick and Place** operation: it takes parts off a conveyor and stacks them on a pallet.

**Given conditions**

1. The service log has **no entry for a belt check in the last 6 months** at the last scheduled maintenance.
2. The operator reports a recurring **INTP-106** error at program start; each occurrence stops the line for **30–40 minutes**.
3. The robot controller is an **R-30iB Plus**.
4. During a visual inspection the technician found **slight play when rotating the 5th axis (J5)**.

**Four assignments**

1. **Fault diagnosis** — analyse the possible causes of INTP-106; describe how to check the J5 belt condition with a tension meter including the setting parameters (belt type, width, span length); propose an action plan for the J5 play (fasteners, belt, reducer).
2. **Maintenance programme (ППР)** — build a 6-month service schedule for the LR Mate 200iD/7L covering daily inspections, quarterly checks and the backup-battery replacement procedure performed **with the controller powered on**.
3. **Emergency scenario** — power was cut during a battery change and the robot lost mastering. Restore the zero position: describe **Quick Master** when a backup of SYSMAST.SV exists, and **Single Axis Mastering** by the witness marks when it does not.
4. **Reporting** — write a claim report (акт-рекламация) if the belt problem occurred inside the warranty period, and list the tooling required for the service (tension meter, key set, LOCTITE for bolted joints).

![Task map](assets/diagram/task-map.svg "How the four assignments map onto this guide, and which official document backs each one.")

**The reading of the case that this guide defends**

The four conditions are not independent. A missing belt check for six months on a wrist axis means the belt tension has been drifting; a drifting J5 belt produces positional error and, past a limit, motion faults. INTP-106 is *not* a mechanical alarm — it is the interpreter refusing to resume a program — but it is what the **operator sees** when a motion or state fault has aborted or paused the program and the cell then tries to continue. So the chain is:

~~~text
no PM entry (6 months)  →  J5 belt tension out of band  →  wrist positioning error / play
                                                        →  motion aborted or program paused at start
                                                        →  CONTINUE request rejected  →  INTP-106
                                                        →  30–40 min of unplanned downtime
~~~

Part 2 proves each arrow with manual references and gives you the measurements that decide whether the fix is a re-torque, a new belt, or a wrist reducer.
`,
        ru: `
> TASK — На производственном участке установлен промышленный робот **FANUC LR Mate 200iD/7L**, выполняющий операцию **Pick and Place**: захват деталей с конвейера и укладка их на паллету.

**Вводные данные**

1. В сервисном журнале **отсутствует отметка о проверке ремней за последние 6 месяцев** при плановом ТО.
2. Оператор жалуется на периодическую ошибку **INTP-106** при запуске программы; каждая остановка линии — **30–40 минут**.
3. Контроллер робота — **R-30iB Plus**.
4. При визуальном осмотре мастеровой обнаружил **небольшой люфт при вращении 5-й оси (J5)**.

**Четыре задания**

1. **Диагностика неисправности** — проанализировать возможные причины INTP-106; описать проверку состояния ремней оси J5 тензиометром с параметрами настройки (тип ремня, ширина, длина пролёта); предложить план устранения люфта 5-й оси (крепления, ремень, редуктор).
2. **Программа сервисных работ (ППР)** — составить график ТО для LR Mate 200iD/7L на 6 месяцев: ежедневные осмотры, ежеквартальные проверки и процедуру замены резервной батареи **при включённом контроллере**.
3. **Моделирование аварийной ситуации** — при замене батареи отключили питание, робот потерял мастерение. Восстановить нулевое положение: описать порядок **Quick Master** при наличии резервной копии SYSMAST.SV и процедуру **Single Axis Mastering** по меткам на корпусе (witness marks), если копии нет.
4. **Оформление отчёта** — составить акт-рекламацию, если проблема с ремнём возникла в гарантийный срок, и включить в отчёт описание инструмента для ТО (тензиометр, набор ключей, средства LOCTITE для болтовых соединений).

![Карта задания](assets/diagram/task-map.svg "Как четыре задания связаны с разделами руководства и какие официальные документы их подтверждают.")

**Трактовка кейса, которую защищает это руководство**

Четыре вводные не независимы. Отсутствие проверки ремней в течение шести месяцев на оси кисти означает, что натяжение уходило; уходящее натяжение ремня J5 даёт ошибку позиционирования, а за пределом — сбои движения. INTP-106 — **не** механическая авария: это отказ интерпретатора продолжить программу. Но именно её **видит оператор**, когда движение или состояние прервали/поставили программу на паузу, а ячейка пытается продолжить работу. Цепочка:

~~~text
нет отметки о ТО (6 мес)  →  натяжение ремня J5 вне допуска  →  ошибка положения кисти / люфт
                                                          →  движение прервано или программа на паузе при старте
                                                          →  запрос CONTINUE отклонён  →  INTP-106
                                                          →  30–40 мин внепланового простоя
~~~

Часть 2 подтверждает каждую стрелку ссылками на руководства и даёт измерения, по которым решается, что делать: протяжка, замена ремня или замена редуктора кисти.
`,
      },
    },
    {
      id: 'equipment',
      title: { en: 'Equipment data sheet', ru: 'Паспорт оборудования' },
      body: {
        en: `
Everything below is the machine you are simulating and servicing. Copy these tables into your report — they are the "исходные данные" section of any respectable technical document.

#### Robot — FANUC LR Mate 200iD/7L

| Parameter | Value | Note |
|---|---|---|
| Type | articulated, 6 controlled axes (J1…J6) | long-reach variant of the LR Mate 200iD family |
| Max payload (wrist) | **7 kg** | includes the gripper mass |
| Reach (H-reach) | **911 mm** | the standard 200iD has 717 mm; 911 mm is the least that makes a palletizing layout feasible at all — and it still needs a rotary pallet indexer, see the reach check in Part 1.4 |
| Repeatability | **±0.01 mm** | FANUC America product data; some reseller sheets quote ±0.03 mm — the manual for your serial is authoritative |
| Mechanical unit mass | **27 kg** | |
| Mounting | floor, angle (wall), inverted | mount angle is set at controlled start |
| Average power consumption | **0.5 kW** | |
| Protection | IP67 standard, IP69K optional | relevant for a brick plant: abrasive dust |
| Controller | R-30iB Plus (also R-30iB Mate Plus, open-air cabinet, iPendant Touch) | the task specifies R-30iB Plus |

**Motion range and speed**

| Axis | Range | Max speed |
|---|---|---|
| J1 | 340° (360°) | 370 °/s |
| J2 | 245° | 310 °/s |
| J3 | 430° | 410 °/s |
| J4 | 380° | 550 °/s |
| **J5** | **250°** | **545 °/s** |
| J6 | 720° | 1000 °/s |

**Wrist load limits — needed for the gripper check in Part 1**

| Axis | Allowable moment | Allowable inertia |
|---|---|---|
| J4 | 16.6 N·m | 0.47 kg·m² |
| J5 | 16.6 N·m | 0.47 kg·m² |
| J6 | 9.4 N·m | 0.15 kg·m² |

**Installation and service envelope**

| Item | Requirement |
|---|---|
| Base fixing | 4 × Ø11 through holes, base plate 190 × 190 mm |
| Mounting surface flatness | ≤ 0.5 mm |
| Mounting surface inclination | ≤ 0.5° |
| Maintenance clearance | 500 mm around the arm; **705 mm** above for the 7L |
| Base load, static (7L) | vertical moment 147.3 N·m, vertical force 333.2 N |
| Base load, power-off stop (7L) | vertical moment **1657.2 N·m**, vertical force 1612.7 N; horizontal moment 1285.6 N·m, horizontal force 1656.8 N |
| Stopping distance after a stop signal (7L) | J1 69.0°, J2 57.3°, J3 54.4° (power-off stop) |

> NOTE — Why the power-off-stop figures matter for the layout: 69° of J1 travel after the stop signal means your fence and light curtain in Part 1 must be dimensioned from the **stopping** envelope, not the static one. That is the ISO 10218-1 minimum-distance calculation, and quoting it is an easy mark in a student report.

#### Controller — FANUC R-30iB Plus

| Item | Detail |
|---|---|
| Pendant | iPendant (colour), three-position deadman, <kbd>SHIFT</kbd>, <kbd>RESET</kbd>, <kbd>FCTN</kbd>, <kbd>MENU</kbd> |
| Mode switch | T1 (≤ 250 mm/s) / T2 / AUTO, plus REMOTE-LOCAL |
| Operator panel | E-stop, alarm release, start, mode indicator LEDs |
| Memory backup | lithium battery on the main board, 3 V DC; programs and system variables live in SRAM |
| Controller battery part | **A05B-2650-K030** (also listed A98L-0031-0028) — Mate Plus cabinets; the full-size R-30iB/Plus lists A02B-0200-K102 / A98L-0031-0012. Check which cabinet you actually have. |
| Battery life | about 4 years from factory fit; low-voltage alarm **SYST-035** |
| Robot (mechanical unit) battery | battery box at the J1 base; **4 × C cells (1.5 V)** with the built-in option, **4 × D cells (1.5 V)** with the external option |
| Mechanical-unit battery interval | **1 year** (built-in) / **1.5 years** (external) |
| Relevant alarms | SYST-035 low battery, SRVO-062 BZAL (battery alarm, group/axis), SRVO-038 pulse mismatch, MOTN-049 / SYST-035 robot not mastered, INTP-106 continue request failed |
| Software options worth naming | PalletTool, iRVision 2D/3DV, DCS (Dual Check Safety), ASCII program upload, Ethernet/IP or PROFINET |

> WARNING — The two batteries follow **opposite** rules and this is exactly where the emergency scenario in Part 4 comes from.
> The **robot base** battery (pulse coder backup) must be changed with the controller **powered ON**: the operator's manual cautions that removing the external battery with the power off loses all current position data and forces re-mastering.
> The **controller main-board** battery (SRAM backup) is changed by powering the controller on for about 30 s, then **off**, and completing the swap within **30 minutes**.
> Confusing the two is the classic way to lose mastering during "routine" maintenance.

![Service in the cell](assets/media/service-scene.jpg "Scheduled service on the palletizing cell: torque wrench on the arm cover, teach pendant showing the alarm banner, spare battery and grease kit on the cart.")
`,
        ru: `
Всё нижеперечисленное — это машина, которую вы моделируете и обслуживаете. Скопируйте эти таблицы в отчёт: это раздел «исходные данные» любого вменяемого технического документа.

#### Робот — FANUC LR Mate 200iD/7L

| Параметр | Значение | Примечание |
|---|---|---|
| Тип | шарнирный, 6 управляемых осей (J1…J6) | длиннобазовая версия семейства LR Mate 200iD |
| Макс. грузоподъёмность (кисть) | **7 кг** | включает массу захвата |
| Вылет (H-reach) | **911 мм** | у обычного 200iD — 717 мм; 911 мм — это минимум, при котором планировка паллетирования в принципе возможна, и всё равно нужен поворотный стол паллеты: см. проверку досягаемости в части 1.4 |
| Повторяемость | **±0,01 мм** | данные FANUC America; часть реселлеров указывает ±0,03 мм — авторитетно руководство под ваш серийный номер |
| Масса механической части | **27 кг** | |
| Установка | пол, под углом (стена), перевёрнуто | угол установки задаётся при controlled start |
| Средняя потребляемая мощность | **0,5 кВт** | |
| Защита | IP67 стандартно, IP69K опция | важно для кирпичного завода: абразивная пыль |
| Контроллер | R-30iB Plus (также R-30iB Mate Plus, open-air, iPendant Touch) | в задаче указан R-30iB Plus |

**Диапазоны движения и скорости**

| Ось | Диапазон | Макс. скорость |
|---|---|---|
| J1 | 340° (360°) | 370 °/с |
| J2 | 245° | 310 °/с |
| J3 | 430° | 410 °/с |
| J4 | 380° | 550 °/с |
| **J5** | **250°** | **545 °/с** |
| J6 | 720° | 1000 °/с |

**Ограничения нагрузки на кисть — нужны для проверки захвата в части 1**

| Ось | Допустимый момент | Допустимый момент инерции |
|---|---|---|
| J4 | 16,6 Н·м | 0,47 кг·м² |
| J5 | 16,6 Н·м | 0,47 кг·м² |
| J6 | 9,4 Н·м | 0,15 кг·м² |

**Монтаж и зона обслуживания**

| Пункт | Требование |
|---|---|
| Крепление основания | 4 отверстия Ø11, плита основания 190 × 190 мм |
| Плоскостность площадки | ≤ 0,5 мм |
| Наклон площадки | ≤ 0,5° |
| Зона обслуживания | 500 мм вокруг руки; **705 мм** сверху для 7L |
| Нагрузка на основание, покой (7L) | вертикальный момент 147,3 Н·м, вертикальная сила 333,2 Н |
| Нагрузка при остановке снятием питания (7L) | верт. момент **1657,2 Н·м**, верт. сила 1612,7 Н; гориз. момент 1285,6 Н·м, гориз. сила 1656,8 Н |
| Путь торможения после сигнала останова (7L) | J1 69,0°, J2 57,3°, J3 54,4° (power-off stop) |

> NOTE — Зачем в планировке цифры остановки: 69° хода J1 после сигнала останова означает, что ограждение и световой занавес в части 1 считаются от **тормозной** зоны, а не от статической. Это расчёт минимального расстояния по ISO 10218-1, и его упоминание — лёгкие баллы в студенческом отчёте.

#### Контроллер — FANUC R-30iB Plus

| Пункт | Детали |
|---|---|
| Пульт | iPendant (цветной), трёхпозиционный deadman, <kbd>SHIFT</kbd>, <kbd>RESET</kbd>, <kbd>FCTN</kbd>, <kbd>MENU</kbd> |
| Переключатель режимов | T1 (≤ 250 мм/с) / T2 / AUTO, плюс REMOTE-LOCAL |
| Панель оператора | аварийный стоп, сброс аварии, пуск, индикаторные светодиоды |
| Резервное питание памяти | литиевая батарея на главной плате, 3 В DC; программы и системные переменные — в SRAM |
| Номер батареи контроллера | **A05B-2650-K030** (также указывается A98L-0031-0028) — шкафы Mate Plus; для полноразмерных R-30iB/Plus указаны A02B-0200-K102 / A98L-0031-0012. Проверьте, какой шкаф у вас. |
| Ресурс батареи | около 4 лет с заводской установки; авария низкого напряжения **SYST-035** |
| Батарея робота (механики) | батарейный отсек у основания J1; **4 элемента C (1,5 В)** при встроенном исполнении, **4 элемента D (1,5 В)** при внешнем |
| Периодичность замены батареи механики | **1 год** (встроенная) / **1,5 года** (внешняя) |
| Relevant alarms | SYST-035 низкий заряд, SRVO-062 BZAL (авария батареи, группа/ось), SRVO-038 pulse mismatch, MOTN-049 / SYST-035 мастерение не выполнено, INTP-106 continue request failed |
| Опции ПО, которые стоит назвать | PalletTool, iRVision 2D/3DV, DCS (Dual Check Safety), ASCII upload программ, Ethernet/IP или PROFINET |

> WARNING — У двух батарей **противоположные** правила, и именно отсюда растёт аварийный сценарий части 4.
> Батарея **основания робота** (резервирование импульсных датчиков) меняется при **включённом** контроллере: руководство по эксплуатации предупреждает, что снятие внешней батареи при выключенном питании приводит к потере всех данных о текущем положении и требует повторного мастерения.
> Батарея **главной платы контроллера** (резервирование SRAM) меняется так: включить контроллер примерно на 30 с, затем **выключить** и завершить замену в течение **30 минут**.
> Путаница между ними — классический способ потерять мастерение при «плановом» ТО.

![Обслуживание в ячейке](assets/media/service-scene.jpg "Плановое ТО ячейки паллетирования: моментный ключ на крышке руки, пульт с красной строкой аварии, запасная батарея и комплект смазки на тележке.")
`,
      },
    },
    {
      id: 'software',
      title: { en: 'Visual Components 4.8 — what you need and where things are', ru: 'Visual Components 4.8 — что нужно и где что находится' },
      body: {
        en: `
#### Editions

Visual Components 4.8 ships as **Essentials**, **Professional**, **Premium** and the **OLP** variants (Professional OLP, Premium OLP, Robotics OLP). 4.8 is the release that merged the Delfoi offline-programming tools into the product line, so the OLP capability is now part of the family rather than a separate brand.

| Capability you need for this guide | Minimum edition |
|---|---|
| Build the layout, add eCatalog components, PnP connections, fences, drawings | Essentials |
| Process Modelling (products, processes, flow, robot transport controller) | Essentials and up |
| Robot program teaching in the PROGRAM tab, signals, Python scripting | Essentials and up |
| FANUC-branded robot components from the Web eCatalog | Essentials and up |
| OLP: post-process the taught program to a FANUC **.LS** file, path validation, Via/Robotics Solver | **OLP variant** (separate licence; the Robotics Solver add-on is a further paid subscription) |
| FANUC Connectivity Plugin (drive a real or ROBOGUIDE virtual controller) | Premium + plugin licence |

> NOTE — If your classroom licence is Essentials or Professional, you can still complete 100 % of Part 1. Only step 1.15 (post-processing to FANUC .LS) needs an OLP variant, and that step is optional — it is shown so you can describe it in the report.

#### What is new in 4.8 (worth one paragraph in your report)

- **Visual Components Robotics OLP** became the main feature of the release: all OLP processes (Arc, Cut, Spot, Surf, Paint) and all robot post-processors are exposed on the **PROGRAM** tab for OLP users.
- **Via Solver** is available in **all** product versions (limited compared with the paid Robotics Solver add-on, which solves collisions, singularities, joint limits and reachability on process, via and search paths).
- **Program Validation** now supports conveyor synchronisation, and a **linear 180-degree check** warns when a joint rotates more than 180° during a linear motion.
- **Online help**: the application help and the Python API reference moved online (help.visualcomponents.com/4.8/…), with a configurable help location.
- **CAD import/export** updated to HOOPS 2023 H2: ACIS up to 2023, Autodesk Inventor up to 2024, Navisworks 2012–2024.
- 4.8.0.1 (January 2024) fixed interactive VR, statement loading from Via Solver, and added KUKA.Sim to Premium OLP.
- Upgrade note: 4.6/4.7 users needed a **new product key and a valid maintenance contract** to move to 4.8.

#### The interface you will be clicking

![Visual Components 4.8 interface map](assets/diagram/vc-ui.svg "Ribbon tabs, the eCatalog and the panels you will use in Part 1.")

| Ribbon tab | What it is for in this project |
|---|---|
| **FILE** | new/save layout (\`.vcmx\`), export 3D PDF, video, statistics, print |
| **HOME** | clipboard, Select / Move / **PnP** / Interact, size and snap, measure, dimensions, **Interfaces**, **Signals**, Attach / Detach, Hierarchy, geometry import, camera and view |
| **PROCESS MODELING** | **Products** (Product Type Editor), **Processes** (Process Editor), **Flow**, **Filter**, transport links, create frame/signal |
| **PROGRAM** | robot **Jog**, Program Editor (routines and statements), tools, TCP/base frames, and — in OLP variants — the OLP process tools |
| **DRAWING** | 2D drawings, dimensions, annotations, bill of materials |
| **HELP** | online help, Python API reference, support and forum links |

| Panel | Use |
|---|---|
| **eCatalog** | the component library: Collections › Models by Type / Models by Manufacturer, plus a search box. FANUC robots live under Models by Type › Robots › FANUC (and under Models by Manufacturer › Fanuc). |
| **Properties** | every property of the selected component, tab by tab (Default, Geometry, WorkSpace, ProductCreator, …) |
| **Cell Graph** | the component tree; the fastest way to select something buried in an assembly |
| **Program Editor** | robot routines (Subprograms) and statements |
| **Jog** | manipulator, coordinates, tool/base selection, taught XYZABC readout |
| **Output / Statistics** | simulation results, product counters, resource utilisation |
| **Simulation controls** | play / pause / reset, speed, time — the initial state of every component is captured when you press play |

**Camera and selection drills you should know cold**

- Rotate: hold <kbd>RMB</kbd> and drag. Pan: <kbd>LMB</kbd> + <kbd>RMB</kbd> and drag. Zoom: wheel or <kbd>SHIFT</kbd> + <kbd>RMB</kbd>.
- Centre on a component: right-click › **SetCOI**, or <kbd>CTRL</kbd> + right-click.
- Multi-select: hold <kbd>CTRL</kbd> and click; click again to remove from the selection.
- **PnP** (Plug and Play): drag a component towards a compatible interface until a green arrow appears, keep dragging until it snaps. This is how a feeder meets a conveyor, a conveyor meets a process, and a gripper meets the robot flange.
- **Interact**: jog interactive parts (robot joints, machine doors, gripper fingers) with the pointer.

#### Official documentation for 4.8

| Document | Where |
|---|---|
| Visual Components 4.8 Release Notes (06.10.2023) and 4.8.0.1 notes | visualcomponents.com › Downloads / release notes PDF |
| Visual Components Premium 4.8 Help (online) | help.visualcomponents.com/4.8/Premium/en/ |
| Python API reference (online, 4.8) | help.visualcomponents.com/4.8/…/Python_API/ |
| Introduction to Layout Configuration (tutorial PDF) | academy.visualcomponents.com |
| Pick And Place Components — Manual (PM Flow Components) | academy.visualcomponents.com |
| Robot Transport Controller Manual | academy.visualcomponents.com |
| Palletize using PM TransportPatternIn statement (4.8.0+) | academy.visualcomponents.com › lessons |
| Depalletizing using PM Detach statement (4.8.0+) | academy.visualcomponents.com › lessons |
| Component library / eCatalog file index | download.visualcomponents.net/elib |

> TIP — The Academy pages state the software version each lesson was recorded against. Two of them are newer than 4.8: the *Palletizing robot programming* lesson is tagged 4.9.0+ and the *Robot Transport Controller Manual* page is tagged 5.0+. The components themselves exist in 4.8 — only some newer properties differ. Where this guide uses something version-sensitive it says so explicitly.
`,
        ru: `
#### Редакции

Visual Components 4.8 выпускается как **Essentials**, **Professional**, **Premium** и варианты **OLP** (Professional OLP, Premium OLP, Robotics OLP). Именно в 4.8 инструменты офлайн-программирования Delfoi были влиты в линейку продукта, поэтому OLP теперь часть семейства, а не отдельный бренд.

| Какая возможность нужна для этого руководства | Минимальная редакция |
|---|---|
| Собрать планировку, добавить компоненты из eCatalog, PnP-соединения, ограждения, чертежи | Essentials |
| Процессное моделирование (продукты, процессы, поток, транспортный контроллер робота) | Essentials и выше |
| Обучение программы робота во вкладке PROGRAM, сигналы, скрипты Python | Essentials и выше |
| Роботы FANUC из веб-каталога eCatalog | Essentials и выше |
| OLP: постпроцессирование обученной программы в файл FANUC **.LS**, валидация, Via/Robotics Solver | **вариант OLP** (отдельная лицензия; надстройка Robotics Solver — дополнительная подписка) |
| FANUC Connectivity Plugin (управление реальным или виртуальным контроллером ROBOGUIDE) | Premium + лицензия на плагин |

> NOTE — Если у вас учебная лицензия Essentials или Professional, часть 1 выполняется на 100 %. OLP-вариант нужен только для шага 1.15 (постпроцессирование в FANUC .LS), и этот шаг необязателен — он показан, чтобы вы могли описать его в отчёте.

#### Что нового в 4.8 (годится на абзац в отчёте)

- **Visual Components Robotics OLP** стал главной фичей релиза: все OLP-процессы (Arc, Cut, Spot, Surf, Paint) и все постпроцессоры доступны на вкладке **PROGRAM** пользователям OLP.
- **Via Solver** доступен во **всех** версиях продукта (ограниченно по сравнению с платной надстройкой Robotics Solver, которая решает коллизии, сингулярности, пределы осей и досягаемость на технологических, вспомогательных и поисковых траекториях).
- **Program Validation** теперь поддерживает синхронизацию с конвейером, а **проверка поворота на 180°** предупреждает, если сустав проворачивается более чем на 180° во время линейного движения.
- **Онлайн-справка**: справка приложения и справочник Python API переехали в онлайн (help.visualcomponents.com/4.8/…), расположение справки настраивается.
- **Импорт/экспорт CAD** обновлён до HOOPS 2023 H2: ACIS до 2023, Autodesk Inventor до 2024, Navisworks 2012–2024.
- В 4.8.0.1 (январь 2024) починили интерактивный VR, загрузку утверждений из Via Solver и добавили KUKA.Sim в Premium OLP.
- Примечание об обновлении: пользователям 4.6/4.7 для перехода на 4.8 требовались **новый ключ продукта и действующий контракт на поддержку**.

#### Интерфейс, по которому вы будете кликать

![Карта интерфейса Visual Components 4.8](assets/diagram/vc-ui.svg "Вкладки ленты, eCatalog и панели, которые понадобятся в части 1.")

| Вкладка ленты | Зачем в этом проекте |
|---|---|
| **FILE** | новый/сохранить макет (\`.vcmx\`), экспорт 3D PDF, видео, статистики, печать |
| **HOME** | буфер обмена, Select / Move / **PnP** / Interact, размеры и привязки, измерение, **Interfaces**, **Signals**, Attach / Detach, Hierarchy, импорт геометрии, камера и виды |
| **PROCESS MODELING** | **Products** (редактор типов продуктов), **Processes** (редактор процессов), **Flow**, **Filter**, транспортные связи, создание кадров/сигналов |
| **PROGRAM** | **Jog** робота, Program Editor (подпрограммы и утверждения), инструменты, кадры TCP/базы, а в OLP-версиях — инструменты OLP-процессов |
| **DRAWING** | 2D-чертежи, размеры, аннотации, спецификация |
| **HELP** | онлайн-справка, справочник Python API, ссылки на поддержку и форум |

| Панель | Назначение |
|---|---|
| **eCatalog** | библиотека компонентов: Collections › Models by Type / Models by Manufacturer плюс поиск. Роботы FANUC лежат в Models by Type › Robots › FANUC (и в Models by Manufacturer › Fanuc). |
| **Properties** | все свойства выбранного компонента по вкладкам (Default, Geometry, WorkSpace, ProductCreator, …) |
| **Cell Graph** | дерево компонентов; самый быстрый способ выбрать то, что спрятано внутри сборки |
| **Program Editor** | подпрограммы (routines) и утверждения робота |
| **Jog** | манипулятор, координаты, выбор инструмента/базы, обученные XYZABC |
| **Output / Statistics** | результаты симуляции, счётчики продуктов, загрузка ресурсов |
| **Simulation controls** | пуск / пауза / сброс, скорость, время — начальное состояние компонентов фиксируется при нажатии «пуск» |

**Приёмы камеры и выделения, которые надо знать наизусть**

- Вращение: держать <kbd>RMB</kbd> и тянуть. Панорама: <kbd>LMB</kbd> + <kbd>RMB</kbd>. Зум: колесо или <kbd>SHIFT</kbd> + <kbd>RMB</kbd>.
- Центрировать на компоненте: правый клик › **SetCOI** либо <kbd>CTRL</kbd> + правый клик.
- Мультивыделение: держать <kbd>CTRL</kbd> и кликать; повторный клик убирает из выделения.
- **PnP** (Plug and Play): тяните компонент к совместимому интерфейсу до появления зелёной стрелки и продолжайте тянуть до щелчка. Так фидер соединяется с конвейером, конвейер — с процессом, а захват — с фланцем робота.
- **Interact**: управление интерактивными частями (суставы робота, двери станка, губки захвата) указателем.

#### Официальная документация по 4.8

| Документ | Где |
|---|---|
| Visual Components 4.8 Release Notes (06.10.2023) и 4.8.0.1 | visualcomponents.com › Downloads / PDF |
| Visual Components Premium 4.8 Help (онлайн) | help.visualcomponents.com/4.8/Premium/en/ |
| Справочник Python API (онлайн, 4.8) | help.visualcomponents.com/4.8/…/Python_API/ |
| Introduction to Layout Configuration (учебный PDF) | academy.visualcomponents.com |
| Pick And Place Components — Manual (PM Flow Components) | academy.visualcomponents.com |
| Robot Transport Controller Manual | academy.visualcomponents.com |
| Palletize using PM TransportPatternIn statement (4.8.0+) | academy.visualcomponents.com › lessons |
| Depalletizing using PM Detach statement (4.8.0+) | academy.visualcomponents.com › lessons |
| Индекс файлов библиотеки компонентов / eCatalog | download.visualcomponents.net/elib |

> TIP — На страницах Academy указана версия ПО, под которую записан урок. Два урока новее 4.8: *Palletizing robot programming* помечен 4.9.0+, а страница *Robot Transport Controller Manual* — 5.0+. Сами компоненты в 4.8 есть — отличаются лишь некоторые новые свойства. Там, где это руководство затрагивает чувствительное к версии место, это оговорено явно.
`,
      },
    },
    {
      id: 'product',
      title: { en: 'Product and plant definition', ru: 'Определение продукта и завода' },
      body: {
        en: `
The assignment says "pick and place parts from a conveyor onto a pallet" but never says what the part is. Since you are building a **decorative brick factory**, the part is a brick — and that choice drives every number in the layout. Fix the product data first; do not invent it later mid-build.

#### Product: decorative facing brick

| Property | Value | Comment |
|---|---|---|
| Name | \`Brick_Deco\` | product type name in the Product Type Editor |
| Format | **250 × 120 × 65 mm** | standard facing-brick format |
| Mass | **3.2 kg** | hollow decorative brick; solid would be ~4.2 kg |
| Material / colour | fired clay, terracotta | for the visual only |
| Orientation on the belt | bed face up, 250 mm along the belt | so the vacuum gripper sees the largest face |
| Fragile? | no, but abrasive | dust is the real enemy — see the IP67 note |

#### Payload and wrist check (do this before you model anything else)

~~~text
gripper (2-cup vacuum, aluminium)        0.80 kg
brick                                      3.20 kg
--------------------------------------------------
total on the flange                        4.00 kg   ≤ 7 kg payload      ✔  57 % used

static moment about J5, CoG 0.10 m out:
  M = 4.00 kg × 9.81 m/s² × 0.10 m =       3.92 N·m  ≤ 16.6 N·m allowed   ✔  24 % used

inertia about J4/J5 (point mass at 0.15 m):
  I = 4.00 kg × (0.15 m)² =                0.090 kg·m² ≤ 0.47 kg·m²      ✔  19 % used
~~~

> TIP — Put this calculation in the report. It is the difference between "I attached a gripper" and "I verified the tool against the machine's wrist limits", and it is the same arithmetic FANUC's own payload evaluation does.

#### Pallet and stacking pattern

| Property | Value |
|---|---|
| Pallet | EUR flat pallet **1200 × 800 × 144 mm**, tare 25 kg, rated 1000–1500 kg |
| Layer pattern | 24 bricks per layer: 4 along the 1200 mm side (4 × 250 = 1000 mm) × 6 rows along the 800 mm side (6 × 120 = 720 mm) |
| Layers | 8 |
| Bricks per pallet | **192** |
| Net mass | 192 × 3.2 = **614 kg** |
| Gross mass | 614 + 25 = **639 kg** — 64 % of the 1000 kg conservative rating ✔ |
| Stack height | 144 + 8 × 65 = **664 mm** — inside the robot's reach and stable without wrapping |
| Footprint used | 1000 × 720 mm of 1200 × 800 mm (75 %) — leaves margin for gripper clearance |

![Pallet pattern](assets/diagram/pallet-pattern.svg "One layer of 24 bricks on a EUR pallet, and how the 8 layers build up to 664 mm.")

#### Takt, throughput and buffer — the arithmetic the simulation must reproduce

~~~text
Target cell output                     600 bricks/h  = 10 bricks/min  → takt 6.0 s

Robot cycle (to be confirmed by simulation):
  approach + pick                       1.2 s
  transfer conveyor → pallet            2.0 s
  place + release                       1.2 s
  return to pick position               1.6 s
  ------------------------------------------------
  total                                 6.0 s   → 600 bricks/h        ✔ exactly at takt

Infeed conveyor:
  pitch 300 mm, speed 0.10 m/s  →  20 bricks/min arriving
  that is 2× the robot takt, so the pick station needs a stopper and a buffer

Buffer: 6 brick positions = 6 × 300 mm = 1.8 m of belt  →  36 s of autonomy
  absorbs kiln surges and the pallet exchange

Pallet cycle:
  fill 192 × 6.0 s                     19.2 min
  empty pallet out / full pallet in      2.0 min
  ------------------------------------------------
  per pallet                           21.2 min  →  2.83 pallets/h  →  543 bricks/h

  ✘ 4 % below target — the pallet exchange eats the margin

Countermeasure: a two-position pallet shuttle (fill position + swap position),
so the exchange happens in parallel with filling:
  per pallet                           19.2 min  →  3.13 pallets/h  →  600 bricks/h ✔
~~~

> NOTE — This is the kind of finding a simulation exists to produce. Build the single-position version first, measure it, then add the shuttle and measure again: you now have a before/after result with numbers, which is a conclusion you can defend in a report and a recommendation you can cost.

#### Plant context

| Zone | Content | Modelled how |
|---|---|---|
| A · Raw material and forming | clay silo, mixer, extruder/press, cutter | static geometry + machines (or simple process boxes) |
| B · Drying and firing | dryer, tunnel kiln, kiln cars | long conveyor + machine with a long cycle time |
| C · Unloading and finishing | unloading conveyor, brushing, visual QC reject station | conveyor + sensor + a human resource |
| **D · Palletizing cell** | **the LR Mate 200iD/7L pick-and-place cell** | **the detailed part of this guide** |
| E · Packing and dispatch | stretch wrapper, label printer, forklift, rack warehouse | machine + mobile robot or human + forklift |

Zone D is where the assignment lives and where 80 % of your modelling time goes. Zones A–C and E are built to the level of detail that makes the flow continuous — they matter because the palletizing cell has to be fed at 20 bricks/min and emptied at 2.8–3.1 pallets/h, and because a report about a *factory* that contains one robot cell is not a factory.
`,
        ru: `
В условии сказано «захват и укладка деталей с конвейера на паллету», но что за деталь — не сказано. Раз вы строите **завод декоративного кирпича**, деталь — кирпич, и этот выбор определяет все числа в планировке. Зафиксируйте данные о продукте сразу, не выдумывайте их на середине сборки.

#### Продукт: декоративный облицовочный кирпич

| Свойство | Значение | Комментарий |
|---|---|---|
| Название | \`Brick_Deco\` | имя типа продукта в Product Type Editor |
| Формат | **250 × 120 × 65 мм** | стандартный формат облицовочного кирпича |
| Масса | **3,2 кг** | пустотелый декоративный; полнотелый был бы ~4,2 кг |
| Материал / цвет | обожжённая глина, терракота | только для визуала |
| Ориентация на ленте | постелью вверх, 250 мм вдоль ленты | чтобы вакуумный захват брал за наибольшую грань |
| Хрупкий? | нет, но абразивный | главный враг — пыль, см. примечание про IP67 |

#### Проверка грузоподъёмности и кисти (сделайте это до всякого моделирования)

~~~text
захват (2 вакуумные присоски, алюминий)   0,80 кг
кирпич                                     3,20 кг
--------------------------------------------------
итого на фланце                            4,00 кг  ≤ 7 кг              ✔  занято 57 %

статический момент относительно J5, ЦМ в 0,10 м:
  M = 4,00 кг × 9,81 м/с² × 0,10 м =       3,92 Н·м  ≤ 16,6 Н·м         ✔  занято 24 %

момент инерции относительно J4/J5 (точечная масса на 0,15 м):
  I = 4,00 кг × (0,15 м)² =                0,090 кг·м² ≤ 0,47 кг·м²     ✔  занято 19 %
~~~

> TIP — Вставьте этот расчёт в отчёт. Это разница между «я прикрепил захват» и «я проверил инструмент по ограничениям кисти машины» — та же арифметика, что делает оценка грузоподъёмности у FANUC.

#### Паллета и схема укладки

| Свойство | Значение |
|---|---|
| Паллета | плоский европаллет **1200 × 800 × 144 мм**, тара 25 кг, номинал 1000–1500 кг |
| Схема слоя | 24 кирпича в слое: 4 вдоль стороны 1200 мм (4 × 250 = 1000 мм) × 6 рядов вдоль 800 мм (6 × 120 = 720 мм) |
| Слоёв | 8 |
| Кирпичей на паллете | **192** |
| Масса нетто | 192 × 3,2 = **614 кг** |
| Масса брутто | 614 + 25 = **639 кг** — 64 % от консервативного номинала 1000 кг ✔ |
| Высота штабеля | 144 + 8 × 65 = **664 мм** — в зоне досягаемости робота и устойчиво без обмотки |
| Занятая площадь | 1000 × 720 мм из 1200 × 800 мм (75 %) — запас на габарит захвата |

![Схема паллеты](assets/diagram/pallet-pattern.svg "Один слой из 24 кирпичей на европаллете и как 8 слоёв набирают 664 мм.")

#### Такт, производительность и буфер — арифметика, которую должна воспроизвести симуляция

~~~text
Целевой выпуск ячейки                  600 кирп/ч = 10 кирп/мин → такт 6,0 с

Цикл робота (уточняется симуляцией):
  подвод + захват                       1,2 с
  перенос конвейер → паллета            2,0 с
  укладка + отпускание                  1,2 с
  возврат в точку съёма                 1,6 с
  ------------------------------------------------
  итого                                 6,0 с → 600 кирп/ч           ✔ точно в такт

Входной конвейер:
  шаг 300 мм, скорость 0,10 м/с → 20 кирп/мин поступает
  это вдвое больше такта робота, значит на позиции съёма нужны стопор и буфер

Буфер: 6 позиций = 6 × 300 мм = 1,8 м ленты → 36 с автономности
  гасит всплески из печи и время смены паллеты

Цикл паллеты:
  заполнение 192 × 6,0 с               19,2 мин
  вывод полной / подача пустой            2,0 мин
  ------------------------------------------------
  на паллету                            21,2 мин → 2,83 паллеты/ч → 543 кирп/ч

  ✘ на 4 % ниже цели — смена паллеты съедает запас

Мера: двухпозиционный челнок паллет (позиция заполнения + позиция обмена),
тогда обмен идёт параллельно с заполнением:
  на паллету                            19,2 мин → 3,13 паллеты/ч → 600 кирп/ч ✔
~~~

> NOTE — Ради таких выводов симуляцию и строят. Соберите сначала однопозиционную версию, измерьте её, затем добавьте челнок и измерьте снова: у вас появится результат «до/после» в числах — это вывод, который можно защитить в отчёте, и рекомендация, которую можно оценить в деньгах.

#### Контекст завода

| Зона | Состав | Как моделируется |
|---|---|---|
| A · Сырьё и формовка | глиняный склад, смеситель, экструдер/пресс, резка | статическая геометрия + станки (или простые блоки процессов) |
| B · Сушка и обжиг | сушило, туннельная печь, печные вагонетки | длинный конвейер + станок с большим временем цикла |
| C · Разгрузка и доводка | разгрузочный конвейер, щётка, пост визуального контроля с отбраковкой | конвейер + датчик + человеческий ресурс |
| **D · Ячейка паллетирования** | **ячейка Pick and Place на LR Mate 200iD/7L** | **детальная часть этого руководства** |
| E · Упаковка и отгрузка | стретч-обмотчик, принтер этикеток, погрузчик, стеллажный склад | станок + мобильный робот или человек + погрузчик |

Зона D — место действия задания и 80 % времени моделирования. Зоны A–C и E строятся с той детализацией, которая обеспечивает непрерывность потока; они важны, потому что ячейку надо питать 20 кирпичами в минуту и освобождать от 2,8–3,1 паллеты в час, и потому что отчёт о *заводе*, в котором одна роботизированная ячейка, — это не завод.
`,
      },
    },
  ],
};
