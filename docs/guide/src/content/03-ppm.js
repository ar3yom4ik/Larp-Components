export const part3 = {
  id: 'ppm',
  num: '3',
  title: { en: 'ППР: the 6-month maintenance programme', ru: 'ППР: программа обслуживания на 6 месяцев' },
  sub: {
    en: 'Task section 2. Daily visual inspections, quarterly torque and belt checks, battery replacement with the power ON, greasing, backups and the signed record.',
    ru: 'Раздел 2 задания. Ежедневные осмотры, квартальные проверки момента и ремней, замена батареи при включённом питании, смазка, резервные копии и подписываемый журнал.',
  },
  sections: [
    {
      id: 'overview',
      title: { en: '3.0 The programme at a glance', ru: '3.0 Программа одним взглядом' },
      body: {
        en: `
![PPM schedule](assets/diagram/ppm-gantt.svg "Six-month planned preventive maintenance calendar for the palletizing cell, with daily, monthly, quarterly and annual tasks placed on a week grid.")

Planned preventive maintenance (ППР) for this cell is built from FANUC's own periodic inspection table, converted from running hours into calendar dates and split between what the **operator** does every shift and what the **technician** does every quarter.

| Frequency | Owner | Duration | Downtime | Content |
|---|---|---|---|---|
| Every shift (daily) | operator | 10 min | none — before start-up | visual check, cables, cleanliness, alarm review |
| Weekly | operator + setter | 20 min | none | gripper cups, vacuum, fence and interlocks, beacon |
| Monthly (320 h) | technician | 1 h | 1 h planned | connector looseness, dust removal, ventilation, oil-seepage look |
| Quarterly (960 h) | technician | 3 h | 3 h planned | **bolt torque**, **belt condition and tension**, backlash, brake test |
| Half-yearly (1920 h) | technician + engineer | 4 h | 4 h planned | everything above + battery voltage check, backup verification, cycle-time trend |
| Annual (3840 h) | FANUC-trained technician | 8 h | 1 shift | battery replacement, full inspection, accuracy check |
| 1.5-year (5760 h) | specialist | 8 h | 1 shift | per manual's periodic table |
| 2-year (7680 h) | specialist | 8 h | 1 shift | per manual's periodic table |
| 4-year (15360 h) | FANUC service | 2 days | 2 shifts | **replenish reducer grease + replace the mechanical-unit cable** — whichever comes first |

**Assumption that makes the calendar legal**

FANUC's periodic table is written for a machine running **up to 3840 hours per year** (roughly two shifts, five days). Convert your real duty cycle before you copy the dates:

~~~text
this cell :  6.0 s per brick × 600 bricks/h  →  running ≈ 8 h/shift
shifts    :  2 per day, 5 days per week      →  80 h/week  →  ~4160 h/year
result    :  slightly above the 3840 h/yr assumption
            → shorten every hour-based interval by ~7 %, or keep the calendar
              and add one extra quarterly check in the summer shutdown
~~~

> NOTE — For a student report the important sentence is this: *"the intervals below are calendar dates derived from FANUC's hour-based table using a stated duty-cycle assumption, and the assumption is written down so that a different production schedule can be recalculated."* That single sentence is what separates an engineering schedule from a copied one.

**Downloads**

- [PPM-6-month-schedule.csv](assets/dl/PPM-6-month-schedule.csv) — the calendar below as a spreadsheet
- [daily-checklist.md](assets/dl/daily-checklist.md) — printable shift check
- [quarterly-checklist.md](assets/dl/quarterly-checklist.md) — printable quarterly check with torque and tension fields
`,
        ru: `
![График ППР](assets/diagram/ppm-gantt.svg "Шестимесячный календарь планово-предупредительного обслуживания ячейки паллетирования: ежедневные, ежемесячные, квартальные и годовые работы на недельной сетке.")

Планово-предупредительный ремонт (ППР) для этой ячейки построен по собственной таблице периодических осмотров FANUC, пересчитанной из часов наработки в календарные даты и разделённой между тем, что делает **оператор** каждую смену, и тем, что делает **техник** каждый квартал.

| Периодичность | Ответственный | Длительность | Простой | Содержание |
|---|---|---|---|---|
| Каждая смена (ежедневно) | оператор | 10 мин | нет — до пуска | визуальный осмотр, кабели, чистота, разбор аварий |
| Еженедельно | оператор + наладчик | 20 мин | нет | присоски захвата, вакуум, ограждение и блокировки, маяк |
| Ежемесячно (320 ч) | техник | 1 ч | 1 ч плановый | ослабление разъёмов, удаление пыли, вентиляция, осмотр на течь смазки |
| Ежеквартально (960 ч) | техник | 3 ч | 3 ч плановый | **момент затяжки болтов**, **состояние и натяжение ремней**, люфт, проверка тормозов |
| Полугодие (1920 ч) | техник + инженер | 4 ч | 4 ч плановый | всё вышеперечисленное + проверка напряжения батарей, контроль резервных копий, тренд времени цикла |
| Ежегодно (3840 ч) | техник с допуском FANUC | 8 ч | смена | замена батарей, полный осмотр, проверка точности |
| 1,5 года (5760 ч) | специалист | 8 ч | смена | по периодической таблице руководства |
| 2 года (7680 ч) | специалист | 8 ч | смена | по периодической таблице руководства |
| 4 года (15360 ч) | сервис FANUC | 2 дня | 2 смены | **восполнение смазки редукторов + замена кабеля механического блока** — что наступит раньше |

**Допущение, которое делает календарь законным**

Периодическая таблица FANUC написана для машины с наработкой **до 3840 часов в год** (примерно две смены, пять дней). Пересчитайте свой реальный режим, прежде чем копировать даты:

~~~text
эта ячейка :  6,0 с на кирпич × 600 кирп/ч   →  работа ≈ 8 ч/смена
смены      :  2 в сутки, 5 дней в неделю      →  80 ч/неделю  →  ~4160 ч/год
результат  :  немного выше допущения 3840 ч/год
             → сократить все часовые интервалы примерно на 7 % либо оставить
               календарь и добавить одну квартальную проверку в летний останов
~~~

> NOTE — Для студенческого отчёта важна вот эта фраза: *«интервалы ниже — календарные даты, выведенные из часовой таблицы FANUC с явно записанным допущением о режиме работы, и допущение записано, чтобы другой производственный график можно было пересчитать»*. Одна эта фраза отличает инженерный график от скопированного.

**Файлы для скачивания**

- [PPM-6-month-schedule.csv](assets/dl/PPM-6-month-schedule.csv) — календарь ниже в виде таблицы
- [daily-checklist.md](assets/dl/daily-checklist.md) — печатный сменный чек-лист
- [quarterly-checklist.md](assets/dl/quarterly-checklist.md) — печатный квартальный чек-лист с полями для момента и натяжения
`,
      },
    },
    {
      id: 'intervals',
      title: { en: '3.1 Reading the FANUC periodic inspection table', ru: '3.1 Как читать таблицу периодических осмотров FANUC' },
      body: {
        en: `
> SOURCE — LR Mate 200iD Operator's Manual B-83494EN, §7.1.2 periodic inspection; Maintenance Manual B-83495EN, §1 periodic inspection and Appendix C; §7.3.1 batteries; §7.3.2 grease.

The manual does not give you a calendar. It gives you **intervals in running hours** and a list of inspection items, and expects you to convert. Three things to get right:

1. **The hour base.** The table assumes ≤ 3840 h/year. A cell that runs 24/7 hits the "1-year" items in nine months.
2. **Whichever comes first.** Several items are specified as "X hours or Y months, whichever comes first" — the 4-year grease and cable item explicitly says so. A robot that sits idle still needs its cable and grease attention on calendar time.
3. **Where the hours come from.** Read them from the controller, do not estimate:
   - <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Variables** → look at the operating-time counters, or
   - <kbd>MENU</kbd> → **STATUS** → the runtime display, or
   - <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → **Drive time / operation time** screen (name varies with software version).

| Interval | Running hours (≤3840 h/yr) | Calendar equivalent at 80 h/week | Items |
|---|---|---|---|
| 1 month | 320 h | 4 weeks | connector looseness, dust and spatter removal, ventilation filter |
| 3 months | 960 h | 12 weeks | **bolt torque**, **belt condition/tension**, backlash, oil-seepage check, gripper and external battery cable |
| 1 year | 3840 h | 48 weeks | battery replacement, full inspection, brake and accuracy check |
| 1.5 years | 5760 h | 72 weeks | per the manual's table for your duty |
| 2 years | 7680 h | 96 weeks | per the manual's table |
| 4 years | 15360 h | 192 weeks | replenish reducer grease, replace mechanical-unit cable |

> WARNING — The 4-year item is the one plants miss, because the robot still runs perfectly. Grease degrades and cable insulation work-hardens at the flex points long before either shows a symptom. When the symptom arrives it arrives as a stopped line during the busiest week of the year. Put the date in the calendar now.

**How to record running hours so the schedule stays honest**

Read the controller's runtime at the start of every month and write it in the log. The delta is the true duty for that month, and the sum tells you when each interval falls due — with no guessing.

| Month | Controller runtime (h) | Delta (h) | Cumulative since last 3-month check | Due? |
|---|---|---|---|---|
| Nov 2026 | 12 480 | — | 0 | — |
| Dec 2026 | 12 830 | 350 | 350 | no |
| Jan 2027 | 13 150 | 320 | 670 | no |
| Feb 2027 | 13 500 | 350 | 1020 | **yes — quarterly check** |
`,
        ru: `
> SOURCE — Operator's Manual LR Mate 200iD B-83494EN, §7.1.2 периодические осмотры; Maintenance Manual B-83495EN, §1 периодические осмотры и приложение C; §7.3.1 батареи; §7.3.2 смазка.

Руководство не даёт календаря. Оно даёт **интервалы в часах наработки** и перечень пунктов осмотра, а пересчёт ожидает от вас. Три вещи надо сделать правильно:

1. **Часовая база.** Таблица исходит из ≤ 3840 ч/год. Ячейка, работающая 24/7, достигает «годовых» пунктов за девять месяцев.
2. **Что наступит раньше.** Ряд пунктов задан как «X часов или Y месяцев, что наступит раньше» — пункт 4 лет по смазке и кабелю сформулирован именно так. Простаивающий робот всё равно требует внимания к кабелю и смазке по календарному времени.
3. **Откуда брать часы.** Считывайте их с контроллера, не оценивайте на глаз:
   - <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Variables** — счётчики времени работы, либо
   - <kbd>MENU</kbd> → **STATUS** — индикация наработки, либо
   - <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → экран времени работы привода (название зависит от версии ПО).

| Интервал | Наработка (≤3840 ч/год) | Календарный эквивалент при 80 ч/нед | Пункты |
|---|---|---|---|
| 1 месяц | 320 ч | 4 недели | ослабление разъёмов, удаление пыли и брызг, фильтр вентиляции |
| 3 месяца | 960 ч | 12 недель | **момент затяжки болтов**, **состояние/натяжение ремней**, люфт, проверка на течь смазки, кабель захвата и внешней батареи |
| 1 год | 3840 ч | 48 недель | замена батарей, полный осмотр, проверка тормозов и точности |
| 1,5 года | 5760 ч | 72 недели | по таблице руководства для вашего режима |
| 2 года | 7680 ч | 96 недель | по таблице руководства |
| 4 года | 15360 ч | 192 недели | восполнение смазки редукторов, замена кабеля механического блока |

> WARNING — Пункт «4 года» пропускают чаще всего, потому что робот по-прежнему работает отлично. Смазка деградирует, а изоляция кабеля устанет в местах изгиба задолго до появления симптома. Когда симптом появится, он появится как остановленная линия в самую загруженную неделю года. Поставьте дату в календарь сейчас.

**Как фиксировать наработку, чтобы график оставался честным**

Считывайте наработку контроллера в начале каждого месяца и вносите в журнал. Разность — это фактическая нагрузка месяца, а сумма говорит, когда наступает каждый интервал, без угадываний.

| Месяц | Наработка контроллера, ч | Дельта, ч | Накоплено с последней квартальной проверки | Пора? |
|---|---|---|---|---|
| ноя 2026 | 12 480 | — | 0 | — |
| дек 2026 | 12 830 | 350 | 350 | нет |
| янв 2027 | 13 150 | 320 | 670 | нет |
| фев 2027 | 13 500 | 350 | 1020 | **да — квартальная проверка** |
`,
      },
    },
    {
      id: 'daily',
      title: { en: '3.2 Daily visual inspection (operator, 10 min, before start-up)', ru: '3.2 Ежедневный визуальный осмотр (оператор, 10 мин, до пуска)' },
      body: {
        en: `
The daily check is the cheapest insurance in the whole programme and the one the task specifically names: **cables** and **dust cleaning**. It must be doable by an operator, in 10 minutes, without tools, before the shift starts.

**A. Before power-on (walk-around, 4 min)**

| # | Check | What you look for | If bad |
|---|---|---|---|
| 1 | Floor around the cell | brick dust, granules, fragments, spilled grease | sweep/vacuum — dust in the reducer vent is how a wrist dies |
| 2 | Robot cable dress | cables not touching the fence, not resting on the conveyor, not kinked at the wrist bend | re-dress, add a clip |
| 3 | Cable jackets | cuts, abrasion, cracked strain reliefs, tape repairs | stop, tag, call the technician |
| 4 | Connectors | seated, latched, no corrosion, no dust caps missing | reseat, replace the cap |
| 5 | Gripper | cups intact, not torn or glazed, no brick dust packed into the venturi | clean or replace the cup |
| 6 | Fence, gate, light curtain | nothing stored against the fence, lens clean, gate closes and latches | clear, clean the lens |
| 7 | E-stops | not pressed, not obstructed, red mushroom visible | reset only after finding out why |
| 8 | Controller cabinet | ventilation slots not blocked, fan running quietly, no dust blanket | clean with low-pressure air from a safe distance |
| 9 | Pallet station | no pallet debris, no strapping in the robot's path | clear |
| 10 | Beacon and horn | lens clean | clean |

**B. After power-on (2 min)**

| # | Check | Pass criterion |
|---|---|---|
| 11 | No alarms on the pendant | the alarm list is empty; write down any that appeared overnight |
| 12 | 7-segment display on the controller | shows the normal running indication, not "1" |
| 13 | Battery warning | no SYST-035 (controller battery low) and no SRVO-062 BZAL (coder battery) |
| 14 | Jog test in T1 at 10 % | all six axes move smoothly both ways, no noise, no vibration at the wrist |
| 15 | Home position | the arm returns to the taught home, not to a visibly different pose |

**C. During the shift (glance checks)**

- Listen: a wrist that starts whining or clicking is telling you something weeks before it fails.
- Watch the placement: if layer 6 starts landing 2 mm off, that is backlash growing — measure it (Part 2.5) instead of "adjusting the program".
- Count the stops: every INTP-106 gets a tick on the shift sheet with the time. Ten ticks in a week is a work order, not a nuisance.

> TIP — Laminate the checklist and hang it on the fence gate with a dry-wipe marker. A checklist that lives in a folder in the maintenance office does not get done; a checklist on the gate does. Download: [daily-checklist.md](assets/dl/daily-checklist.md).

**Dust is a real hazard in a brick plant, not a cosmetic one**

| Where dust goes | What it does |
|---|---|
| Controller ventilation slots | insulation blanket → overheating → derating and random faults |
| Belt and pulley area at the wrist | abrasive paste with grease → accelerates belt and bearing wear |
| Light curtain lenses | false stops, or worse, a beam that fails to detect |
| Vacuum cups and venturi | loss of holding force → dropped bricks |
| Fence gate interlock | intermittent contact → random cell stops that look like INTP-106 |

Cleaning method: dry, low-pressure air or a vacuum — **never** a wet cloth on electrical parts, and never compressed air blown *into* a connector or a reducer vent.
`,
        ru: `
Ежедневная проверка — самая дешёвая страховка во всей программе и именно то, что названо в задании: **кабели** и **очистка от пыли**. Её должен уметь сделать оператор, за 10 минут, без инструмента, до начала смены.

**A. До включения питания (обход, 4 мин)**

| № | Проверка | На что смотреть | Если плохо |
|---|---|---|---|
| 1 | Пол вокруг ячейки | кирпичная пыль, гранулы, обломки, пролитая смазка | подмести/пропылесосить — пыль в вентиляции редуктора убивает кисть |
| 2 | Укладка кабелей робота | кабели не касаются ограждения, не лежат на конвейере, нет перегибов на изгибе кисти | переукложить, добавить клипсу |
| 3 | Оболочки кабелей | порезы, потёртости, треснувшие вводы, ремонт скотчем | остановить, повесить бирку, вызвать техника |
| 4 | Разъёмы | вставлены, зафиксированы, без коррозии, все пылезащитные колпачки на месте | перестыковать, заменить колпачок |
| 5 | Захват | присоски целые, без разрывов и засаливания, в эжекторе нет кирпичной пыли | очистить или заменить присоску |
| 6 | Ограждение, калитка, светозанавес | у ограждения ничего не складировано, линзы чистые, калитка закрывается и фиксируется | освободить, протереть линзы |
| 7 | Аварийные кнопки | не нажаты, не заблокированы, красный гриб виден | сбрасывать только выяснив причину |
| 8 | Шкаф контроллера | вентиляционные щели не закрыты, вентилятор работает тихо, нет пылевого одеяла | очистить сжатым воздухом низкого давления с безопасного расстояния |
| 9 | Позиция паллеты | нет обломков паллет и стрепп-ленты на пути робота | убрать |
| 10 | Маяк и звуковой сигнал | линза чистая | протереть |

**B. После включения питания (2 мин)**

| № | Проверка | Критерий |
|---|---|---|
| 11 | Нет аварий на пульте | список аварий пуст; запишите всё, что появилось за ночь |
| 12 | Семисегментный индикатор контроллера | нормальная рабочая индикация, а не «1» |
| 13 | Предупреждения о батареях | нет SYST-035 (низкий заряд батареи контроллера) и нет SRVO-062 BZAL (батарея кодера) |
| 14 | Тест перемещений в T1 при 10 % | все шесть осей идут плавно в обе стороны, без шума и вибрации в кисти |
| 15 | Домашняя позиция | рука возвращается в обученный home, а не в заметно другую позу |

**C. В течение смены (взгляд-контроль)**

- Слушайте: кисть, которая начала пищать или пощёлкивать, сообщает вам об этом за недели до отказа.
- Смотрите на укладку: если 6-й слой начал вставать со смещением на 2 мм — это растущий люфт; измерьте его (часть 2.5) вместо «подстройки программы».
- Считайте остановки: каждый INTP-106 получает отметку в сменном листе с временем. Десять отметок за неделю — это заявка на работу, а не мелкая неприятность.

> TIP — Заламинируйте чек-лист и повесьте на калитку ограждения с маркером для сухой доски. Чек-лист, живущий в папке в кабинете механика, не выполняется; чек-лист на калитке — выполняется. Скачать: [daily-checklist.md](assets/dl/daily-checklist.md).

**Пыль на кирпичном заводе — реальная опасность, а не косметика**

| Куда попадает пыль | Что она делает |
|---|---|
| Вентиляционные щели контроллера | теплоизолирующее одеяло → перегрев → снижение нагрузки и случайные сбои |
| Зона ремня и шкивов кисти | абразивная паста вместе со смазкой → ускоренный износ ремня и подшипников |
| Линзы светозанавеса | ложные остановки либо, что хуже, луч, который перестал обнаруживать |
| Присоски и эжектор | потеря удерживающей силы → падение кирпичей |
| Блокировка калитки | прерывистый контакт → случайные остановки ячейки, похожие на INTP-106 |

Способ очистки: сухой воздух низкого давления или пылесос — **никогда** мокрая тряпка на электрических частях и никогда воздух, задутый *внутрь* разъёма или вентиляции редуктора.
`,
      },
    },
    {
      id: 'quarterly',
      title: { en: '3.3 Quarterly checks: bolt torque and belt condition', ru: '3.3 Квартальные проверки: момент затяжки и состояние ремней' },
      body: {
        en: `
Three hours of planned downtime, four times a year, prevents almost everything in this task. The two items the assignment names are **bolt torque** and **belt condition**.

**A. Bolt torque check (≈ 60 min)**

1. Lock out, support the arm where you will release nothing, gather a calibrated torque wrench and the manual's torque values for your variant.
2. Work through the list and **mark each bolt after checking** with a paint pen so the next quarter starts from a clean slate:

| Location | What to check | Notes |
|---|---|---|
| Robot base to pedestal | the 4 base fixing bolts | the highest-load joint; a power-off stop applies up to 1657 N·m of vertical moment |
| Pedestal to floor | anchor bolts | look for cracks in the grout or the concrete |
| Arm cover bolts (all axes) | tightness and gasket condition | wrist cover 5.6 N·m |
| Motor mounting bolts (J5) | witness marks intact | the direct cause of "backlash that is not the belt" |
| Reducer mounting bolts | witness marks intact | |
| End-effector / gripper bolts | tightness every quarter — the manual lists end-effector bolt tightening as a periodic item | a vacuum plate that shifts by 1 mm shifts every brick by 1 mm |
| Tool changer, if fitted | locking and alignment | |
| Fence and gate fixings | tightness, no missing panels | |
| Controller cabinet mounting and cable glands | tight, sealed | |

3. Any bolt that turns **without reaching torque** has loosened: clean the thread, apply the specified LOCTITE (**243** general, **263** high strength), re-torque, and mark. Any bolt that is already at torque but whose witness mark has rotated has moved — investigate why (vibration source, overload, wrong washer).
4. Record: number of bolts checked, number re-torqued, number with broken witness marks.

**B. Belt condition and tension (≈ 60 min)**

Follow Part 2.4 in full, but as a *check* rather than a repair:

1. Pose J3 = 80°, J5 = ±90°; power OFF; open the wrist.
2. Measure J5 and J6 tension three times each; record the mean.
3. Compare with the previous quarter's reading — **the trend matters more than the absolute value**.
4. Inspect teeth, sides, pulleys and the free span for cracks and glazing.
5. Check the other axes you can reach (J1/J2 at 49–65 N for the 7L).
6. Re-measure backlash at 180 mm (J5) and 100 mm (J6) with the dial gauge.
7. Close up: gasket, cover, 5.6 N·m, fresh witness marks.

| Axis | Target (N) | Alarm trigger (N) | Backlash limit |
|---|---|---|---|
| J1 (7L) | 49–65 | ≤ 51 | 0.52 mm at 910 mm |
| J2 (7L) | 49–65 | ≤ 51 | 0.25 mm at 440 mm |
| J5 | 15.6–20.6 | ≤ 16.5 | 0.18 mm at 180 mm |
| J6 | 15.6–20.6 | ≤ 16.5 | 0.15 mm at 100 mm |

**C. The rest of the quarterly visit (≈ 60 min)**

| Item | Method |
|---|---|
| Oil-seepage check | wipe the reducer housings clean, run the cell, re-check the next day; if seepage returns, find the source. If internal pressure has built up after greasing, vent it through the grease inlet |
| Grease condition | colour and particles at the vent; grey/black or metallic = reducer wear |
| Mechanical stoppers | present, not deformed, bolts tight |
| Brake test | in T1 with the power on, release one axis at a time (arm supported!) and check it holds; the wrist should not drift |
| Battery voltage | controller battery 3.1–3.3 VDC is healthy; plan replacement below that |
| Backup verification | restore the latest backup into a test controller or verify file integrity and date |
| Cycle-time trend | compare the current pallet cycle time with the commissioning value — a creeping cycle time is early backlash |
| Pendant and cables | screen, keys, deadman, emergency stop, cable jacket at the strain relief |

Download the printable form: [quarterly-checklist.md](assets/dl/quarterly-checklist.md).
`,
        ru: `
Три часа планового простоя четыре раза в год предотвращают почти всё из этой задачи. Два названных в задании пункта — **момент затяжки болтов** и **состояние ремней**.

**A. Проверка момента затяжки (≈ 60 мин)**

1. Заблокируйте питание, подоприте руку там, где ничего не снимаете, приготовьте калиброванный динамометрический ключ и значения моментов из руководства для вашей модификации.
2. Пройдите по списку и **помечайте каждый проверенный болт** красным маркером, чтобы следующий квартал начинался с чистого листа:

| Место | Что проверять | Примечания |
|---|---|---|
| Основание робота к тумбе | 4 болта крепления основания | самый нагруженный сустав; остановка снятием питания даёт до 1657 Н·м вертикального момента |
| Тумба к полу | анкерные болты | ищите трещины в подливке и бетоне |
| Болты крышек рук (все оси) | затяжка и состояние прокладок | крышка кисти 5,6 Н·м |
| Болты крепления мотора (J5) | контрольные метки целы | прямая причина «люфта, который не ремень» |
| Болты крепления редуктора | контрольные метки целы | |
| Болты исполнительного устройства / захвата | затяжка каждый квартал — руководство включает подтяжку болтов конечного устройства в периодические пункты | вакуумная плита, сместившаяся на 1 мм, смещает каждый кирпич на 1 мм |
| Сменщик инструмента, если есть | фиксация и соосность | |
| Крепление ограждения и калитки | затяжка, нет отсутствующих панелей | |
| Крепление шкафа контроллера и кабельные вводы | плотно, герметично | |

3. Болт, который **проворачивается, не доходя до момента**, ослаб: очистите резьбу, нанесите указанный LOCTITE (**243** обычный, **263** высокопрочный), затяните заново и поставьте метку. Болт, уже дошедший до момента, но с повёрнутой меткой, сдвинулся — выясняйте причину (источник вибрации, перегрузка, неверная шайба).
4. Запишите: сколько болтов проверено, сколько подтянуто, у скольких сорваны контрольные метки.

**B. Состояние и натяжение ремней (≈ 60 мин)**

Выполните часть 2.4 целиком, но как *проверку*, а не ремонт:

1. Поза J3 = 80°, J5 = ±90°; питание ВЫКЛ; вскройте кисть.
2. Измерьте натяжение J5 и J6 по три раза; запишите среднее.
3. Сравните с показанием прошлого квартала — **тренд важнее абсолютного значения**.
4. Осмотрите зубья, боковины, шкивы и свободную ветвь на трещины и засаливание.
5. Проверьте остальные доступные оси (J1/J2: 49–65 Н для 7L).
6. Перемерьте люфт индикатором на 180 мм (J5) и 100 мм (J6).
7. Соберите: прокладка, крышка, 5,6 Н·м, новые контрольные метки.

| Ось | Цель, Н | Порог тревоги, Н | Предел люфта |
|---|---|---|---|
| J1 (7L) | 49–65 | ≤ 51 | 0,52 мм на 910 мм |
| J2 (7L) | 49–65 | ≤ 51 | 0,25 мм на 440 мм |
| J5 | 15,6–20,6 | ≤ 16,5 | 0,18 мм на 180 мм |
| J6 | 15,6–20,6 | ≤ 16,5 | 0,15 мм на 100 мм |

**C. Остальное за квартальный визит (≈ 60 мин)**

| Пункт | Метод |
|---|---|
| Проверка на течь смазки | протрите корпуса редукторов, запустите ячейку, перепроверьте на следующий день; если течь вернулась, ищите источник. Если после смазки внутри выросло давление — стравите его через отверстие подачи |
| Состояние смазки | цвет и частицы у вентиляции; серая/чёрная или с металлом = износ редуктора |
| Механические упоры | на месте, не деформированы, болты затянуты |
| Проверка тормозов | в T1 при включённом питании снимайте тормоз по одной оси (рука подперта!) и проверяйте удержание; кисть не должна уплывать |
| Напряжение батарей | батарея контроллера 3,1–3,3 В — здорова; ниже планируйте замену |
| Контроль резервных копий | восстановите последнюю копию на тестовом контроллере либо проверьте целостность и дату файлов |
| Тренд времени цикла | сравните текущее время цикла паллеты с пусконаладочным — ползущее время цикла есть ранний люфт |
| Пульт и кабели | экран, клавиши, deadman, аварийный останов, оболочка кабеля у ввода |

Скачать печатную форму: [quarterly-checklist.md](assets/dl/quarterly-checklist.md).
`,
      },
    },
    {
      id: 'battery',
      title: { en: '3.4 Battery replacement — and the safety rule everyone gets wrong', ru: '3.4 Замена батареи — и правило безопасности, которое путают все' },
      body: {
        en: `
There are **two** battery systems and they have **opposite** rules. Mixing them up is how a 15-minute job becomes a lost-mastering incident.

| | Robot base — APC battery | Controller main board — SRAM battery |
|---|---|---|
| What it keeps alive | the **absolute pulse coder** — the robot's knowledge of where its joints are | the **SRAM** — programs, system variables, mastering data, alarm history |
| Cells | 4 × **C (LR14) 1.5 V**, built-in unit | 3 V **lithium** unit |
| FANUC part | built-in battery unit (see manual Appendix A for your variant) | **A05B-2650-K030** (also listed as A98L-0031-0028) |
| Life | ~**1 year** (built-in) / ~**1.5 years** (external D-cell pack) | ~**4 years** |
| Healthy voltage | fresh alkaline cells | **3.1–3.3 VDC** |
| Warning alarm | **SRVO-062 BZAL** | **SYST-035** (battery voltage low) |
| Power state during replacement | **POWER ON** | power ON ~30 s, then **OFF**, swap within **30 minutes** |
| If you get it wrong | power OFF swap → BZAL → **mastering data lost** | battery dead and power cycled → controller will not start, 7-segment shows "1", **SRAM contents lost** |

> DANGER — **Replace the robot's APC battery with the controller power ON.** The manual is explicit, and so is this task. With the power off, the absolute pulse coder loses its reference the instant the battery is disconnected and the mastering data is destroyed. The E-stop must be pressed and the cell guarded while you do it, because the drives are live.

**Procedure A — robot base APC battery (power ON)**

1. Back up first: Part 3.5. Yes, even for a battery swap.
2. Finish the cycle, park the arm in the **zero-position/mastering pose** so that if anything does go wrong you can re-master quickly.
3. Press the **E-stop** on the pendant and/or the cell. The drives are inhibited but the controller stays powered.
4. Put the pendant down somewhere safe, tell the operator what you are doing, and hang a tag on the cell: "battery replacement in progress — do not release E-stop".
5. Open the battery compartment in the robot base (or the external battery box, if your cell uses the D-cell pack).
6. Note the polarity and the connector orientation. **Photograph it.**
7. Disconnect the old unit and connect the new one **within a few seconds** — do not leave the coder unpowered. Have the new battery unpacked and in your hand *before* you disconnect the old.
8. Close the compartment, verify the connector is latched.
9. Release the E-stop, check that **SRVO-062 BZAL** does not appear, and confirm the joint positions on the screen still match the arm's physical pose (compare against the witness marks).
10. Write the date in the log and on a label stuck to the battery compartment. Next due: **+12 months** (built-in) or **+18 months** (external pack).

**Procedure B — controller SRAM battery**

1. **Back up** programs, system variables and the mastering file (Part 3.5). This is not optional: if the battery is already weak, the SRAM contents are the only copy of your cell.
2. Turn the controller **ON** and leave it for about **30 seconds** — this brings the SRAM up and lets the backup circuitry charge.
3. Turn the controller **OFF**.
4. **The whole replacement must be completed within 30 minutes** of power-off. Set a timer. Beyond that the SRAM contents are not guaranteed.
5. Open the controller, find the battery unit — it is latched in the **lower-right area of the backplane**.
6. Unlatch and withdraw the old unit; insert the new one until the latch **snaps** home.
7. Close the controller, power **ON**.
8. Check for **SYST-035**: if it appears, the battery did not seat or is faulty.
9. Verify programs and system variables are intact; log the date and the next due date (**+4 years**, but check the voltage quarterly).

> WARNING — Never carry spare batteries loose in a toolbox where the terminals can short. Alkaline C cells shorted in a pocket get hot enough to burn. Keep them in the original packaging until the moment of use, and dispose of the old ones properly.

**Sizing the spares kit**

| Item | Quantity to hold on site | Reason |
|---|---|---|
| Robot APC battery unit | 2 | one in use, one spare; 1-year life means an annual purchase anyway |
| Controller battery A05B-2650-K030 | 2 | lithium cells lose charge on the shelf — check the date code |
| J5/J6 belt A98L-0040-0286#004-157 | 1 | 2–3 h to fit, but a day to obtain |
| Grease A98L-0040-0230 (tube A05B-1139-K022) | 1 tube | enough for several axes |
| Cover gaskets | 2 | they get damaged on removal |
| LOCTITE 243 / 263 / 518 | 1 each | |
`,
        ru: `
Систем батарей **две**, и правила у них **противоположные**. Их путаница превращает пятнадцатиминутную работу в инцидент с потерей мастерения.

| | Батарея APC в основании робота | Батарея SRAM основной платы контроллера |
|---|---|---|
| Что поддерживает | **абсолютный импульсный кодер** — знание робота о том, где его суставы | **SRAM** — программы, системные переменные, данные мастерения, история аварий |
| Элементы | 4 × **C (LR14) 1,5 В**, встроенный блок | 3 В **литиевый** блок |
| Номер FANUC | встроенный батарейный блок (см. приложение A руководства для вашей модификации) | **A05B-2650-K030** (указывается также A98L-0031-0028) |
| Ресурс | ~**1 год** (встроенный) / ~**1,5 года** (внешний блок D) | ~**4 года** |
| Исправное напряжение | свежие щелочные элементы | **3,1–3,3 В** |
| Авария-предупреждение | **SRVO-062 BZAL** | **SYST-035** (низкое напряжение батареи) |
| Состояние питания при замене | **ВКЛЮЧЕНО** | питание ВКЛ ~30 с, затем **ВЫКЛ**, замена в течение **30 минут** |
| Если сделать неправильно | замена при ВЫКЛ → BZAL → **данные мастерения потеряны** | батарея села и питание перещёлкнули → контроллер не стартует, на индикаторе «1», **содержимое SRAM потеряно** |

> DANGER — **Батарею APC робота меняют при ВКЛЮЧЁННОМ питании контроллера.** Руководство формулирует это прямо, и задание тоже. При выключенном питании абсолютный импульсный кодер теряет отсчёт в момент отключения батареи, и данные мастерения уничтожаются. Аварийный останов должен быть нажат, а ячейка ограждена, потому что приводы под напряжением.

**Процедура A — батарея APC основания робота (питание ВКЛ)**

1. Сначала резервная копия: часть 3.5. Да, даже для замены батареи.
2. Завершите цикл, поставьте руку в **нулевую позу / позу мастерения**, чтобы при любом исходе быстро отмастерить заново.
3. Нажмите **аварийный останов** на пульте и/или на ячейке. Приводы заблокированы, но контроллер запитан.
4. Отложите пульт в безопасное место, скажите оператору, что делаете, и повесьте на ячейку бирку: «идёт замена батареи — аварийный останов не снимать».
5. Откройте батарейный отсек в основании робота (или внешний батарейный ящик, если ячейка на блоке D).
6. Запомните полярность и ориентацию разъёма. **Сфотографируйте.**
7. Отключите старый блок и подключите новый **за несколько секунд** — не оставляйте кодер без питания. Новый элемент должен быть распакован и лежать в руке *до* отключения старого.
8. Закройте отсек, убедитесь, что разъём зафиксирован.
9. Снимите аварийный останов, проверьте отсутствие **SRVO-062 BZAL** и убедитесь, что положения осей на экране по-прежнему соответствуют физической позе руки (сверьте с контрольными метками).
10. Внесите дату в журнал и на наклейку у батарейного отсека. Следующая замена: **+12 месяцев** (встроенный) или **+18 месяцев** (внешний блок).

**Процедура B — батарея SRAM контроллера**

1. **Резервная копия** программ, системных переменных и файла мастерения (часть 3.5). Это не по желанию: если батарея уже слабая, содержимое SRAM — единственная копия вашей ячейки.
2. Включите контроллер и оставьте примерно на **30 секунд** — SRAM поднимется, а цепь резервного питания подзарядится.
3. Выключите контроллер.
4. **Вся замена должна быть завершена в течение 30 минут** после выключения. Поставьте таймер. Дальше содержимое SRAM не гарантировано.
5. Откройте контроллер, найдите батарейный блок — он зафиксирован защёлкой в **нижней правой области монтажной платы**.
6. Отщёлкните и извлеките старый блок; вставьте новый до **щелчка** защёлки.
7. Закройте контроллер, включите питание.
8. Проверьте **SYST-035**: если появилась, блок не сел на место или неисправен.
9. Убедитесь, что программы и системные переменные целы; запишите дату и следующую (**+4 года**, но напряжение проверяйте ежеквартально).

> WARNING — Не носите запасные батареи россыпью в ящике инструмента, где клеммы могут замкнуться. Щелочные элементы C, замкнутые в кармане, нагреваются до ожога. Держите их в заводской упаковке до момента использования и утилизируйте правильно.

**Комплект ЗИП на площадке**

| Позиция | Сколько держать на месте | Причина |
|---|---|---|
| Батарейный блок APC робота | 2 | один в работе, один запасной; годовой ресурс всё равно означает ежегодную закупку |
| Батарея контроллера A05B-2650-K030 | 2 | литиевые элементы теряют заряд на полке — смотрите дату выпуска |
| Ремень J5/J6 A98L-0040-0286#004-157 | 1 | установка 2–3 ч, а поставка — день |
| Смазка A98L-0040-0230 (туба A05B-1139-K022) | 1 туба | хватает на несколько осей |
| Прокладки крышек | 2 | повреждаются при снятии |
| LOCTITE 243 / 263 / 518 | по 1 | |
`,
      },
    },
    {
      id: 'backup',
      title: { en: '3.5 Backups: what to save, when, and how to restore it', ru: '3.5 Резервные копии: что сохранять, когда и как восстанавливать' },
      body: {
        en: `
A maintenance programme without backups is a programme that will lose the cell. Back up **before** any of the following: battery replacement, a cold start, a software upgrade, mastering work, and any change to the safety configuration.

**What to back up**

| Data | Contains | File / device |
|---|---|---|
| **All of above** (image backup) | everything below in one file — the fastest full recovery | \`ALL_OF_ABOVE.SYS\` (+ \`.VA\`) on USB |
| Programs | TP programs, including the palletizing routine | \`.TP\` / binary or ASCII \`.LS\` |
| System variables | \$MASTER_ENB, \$DMR_GRP, device configuration, motion settings | \`SYSVARS.SV\`, \`SYSVARS.VA\` |
| **Mastering data** | the reference positions of every axis | **\`SYSMAST.SV\`** — this is the file Part 4 lives on |
| Registers | position, numeric, string registers | \`POSREG.VA\`, \`NUMREG.VA\`, \`STRREG.VA\` |
| I/O configuration | assigned signals, DeviceNet/PROFINET setup | \`DEVLIST.SV\` |
| Alarm history | the INTP-106 record you need for the report | print or capture the LOG screen |
| Setup data | tool frames, user frames, payload identification data | \`.VR\` files |

**How (R-30iB Plus)**

1. Insert a FAT32-formatted USB stick in the controller's USB port.
2. On the pendant: <kbd>MENU</kbd> → **1 UTILITIES** (or **FILE**) → choose the device with <kbd>F2</kbd> or <kbd>UTIL</kbd> → **Set Device** → **USB** (shown as \`UD1:\`).
3. <kbd>F1 [TYPE]</kbd> or **DIR** to list files; <kbd>UTIL</kbd> → **Save** (or **Backup**) and pick the data type. Choose **All of above** for the full set.
4. Wait for the confirmation. Never pull the stick during a write.
5. Verify: the files must exist, be non-zero, and carry today's date. Restore one into a test controller once a year to prove the backup is real.

**Naming and storage**

~~~text
UD1:/BACKUP/
   2026-11-09_palletcell_ALL/       ← full image
   2026-11-09_SYSMAST.SV            ← mastering data, also kept separately
   2026-11-09_programs/             ← .TP + .LS
   2026-11-09_sysvars.SV
   readme.txt                       ← controller software version, robot serial, who took it
~~~

Two copies minimum: one on the USB stick kept in the controller cabinet, one in the plant's file store. A backup that lives only next to the machine dies with the machine.

**Restore**

1. <kbd>MENU</kbd> → **FILE** → <kbd>UTIL</kbd> → **Set Device** → USB.
2. **DIR**, select the file, <kbd>F3 LOAD</kbd> (programs/variables) or <kbd>RESTORE</kbd> for an image backup.
3. Confirm with **YES**, then **cold start** (hold <kbd>PREV</kbd> + <kbd>NEXT</kbd> while powering on → **3 Controlled start**).

> WARNING — Restoring \`SYSVARS.SV\` or an image can overwrite mastering-related variables and cause **SRVO-038 pulse mismatch** if the encoder counts no longer match. That is exactly the situation Part 4.6 handles. Always restore into a controller whose robot has not moved, or be ready to re-master.
`,
        ru: `
Программа обслуживания без резервных копий — это программа, которая потеряет ячейку. Делайте копию **перед** любым из перечисленного: замена батареи, cold start, обновление ПО, работы по мастерению, любое изменение конфигурации безопасности.

**Что копировать**

| Данные | Содержат | Файл / устройство |
|---|---|---|
| **All of above** (образ) | всё нижеперечисленное одним файлом — самое быстрое полное восстановление | \`ALL_OF_ABOVE.SYS\` (+ \`.VA\`) на USB |
| Программы | TP-программы, включая программу паллетирования | \`.TP\` / бинарные либо ASCII \`.LS\` |
| Системные переменные | \$MASTER_ENB, \$DMR_GRP, конфигурация устройств, настройки движения | \`SYSVARS.SV\`, \`SYSVARS.VA\` |
| **Данные мастерения** | опорные положения всех осей | **\`SYSMAST.SV\`** — на этом файле держится часть 4 |
| Регистры | позиционные, числовые, строковые | \`POSREG.VA\`, \`NUMREG.VA\`, \`STRREG.VA\` |
| Конфигурация входов/выходов | назначенные сигналы, настройки DeviceNet/PROFINET | \`DEVLIST.SV\` |
| История аварий | запись INTP-106, нужная для отчёта | распечатать или снять экран LOG |
| Данные настройки | кадровые системы инструмента и пользователя, данные идентификации нагрузки | файлы \`.VR\` |

**Как (R-30iB Plus)**

1. Вставьте в USB-порт контроллера флешку, отформатированную в FAT32.
2. На пульте: <kbd>MENU</kbd> → **1 UTILITIES** (или **FILE**) → выберите устройство через <kbd>UTIL</kbd> → **Set Device** → **USB** (отображается как \`UD1:\`).
3. <kbd>F1 [TYPE]</kbd> или **DIR** — список файлов; <kbd>UTIL</kbd> → **Save** (или **Backup**) и выберите тип данных. Для полного набора возьмите **All of above**.
4. Дождитесь подтверждения. Никогда не выдёргивайте флешку во время записи.
5. Проверьте: файлы должны существовать, быть ненулевыми и иметь сегодняшнюю дату. Раз в год восстанавливайте копию на тестовом контроллере, чтобы доказать её реальность.

**Именование и хранение**

~~~text
UD1:/BACKUP/
   2026-11-09_palletcell_ALL/       ← полный образ
   2026-11-09_SYSMAST.SV            ← данные мастерения, хранятся и отдельно
   2026-11-09_programs/             ← .TP + .LS
   2026-11-09_sysvars.SV
   readme.txt                       ← версия ПО контроллера, серийный номер робота, кто снимал
~~~

Минимум две копии: одна на флешке в шкафу контроллера, одна в файловом хранилище завода. Копия, живущая только рядом с машиной, погибает вместе с машиной.

**Восстановление**

1. <kbd>MENU</kbd> → **FILE** → <kbd>UTIL</kbd> → **Set Device** → USB.
2. **DIR**, выберите файл, <kbd>F3 LOAD</kbd> (программы/переменные) или <kbd>RESTORE</kbd> для образа.
3. Подтвердите **YES**, затем **cold start** (держите <kbd>PREV</kbd> + <kbd>NEXT</kbd> при включении → **3 Controlled start**).

> WARNING — Восстановление \`SYSVARS.SV\` или образа может перезаписать связанные с мастерением переменные и вызвать **SRVO-038 рассогласование импульсов**, если счётчики кодеров больше не совпадают. Именно эту ситуацию разбирает часть 4.6. Всегда восстанавливайте в контроллер, робот которого не двигали, либо будьте готовы к повторному мастерению.
`,
      },
    },
    {
      id: 'greasing',
      title: { en: '3.6 Reducer greasing — quantities and procedure', ru: '3.6 Смазка редукторов — объёмы и процедура' },
      body: {
        en: `
> SOURCE — Maintenance Manual B-83495EN, §2.2 greasing the reducers.

Greasing is on the long interval (replenish at 4 years / 15360 h, or after any reducer work), but you must know it because the quarterly inspection checks the grease condition, and because over-greasing is a fault in itself.

**Materials**

| Item | Part number |
|---|---|
| Grease | **A98L-0040-0230** — Harmonic Drive **4B No.2** |
| Grease kit (syringe + 80 g) | **A05B-1142-K021** |
| Refill tube | **A05B-1139-K022** |
| Syringe scale | plunger travel **2.5 mm = 1 ml** |

**Regulated quantities per axis**

| Axis | Quantity | Syringe volume |
|---|---|---|
| J1 | 2.7 g | 3 ml |
| J2 | 2.7 g | 3 ml |
| J3 | 1.8 g | 2 ml |
| J4 | 1.8 g | 2 ml |
| J5 | 1.8 g | 2 ml |
| J6 | 1.8 g | 2 ml |

**Procedure**

1. Power **OFF**, lock out. Greasing is done with the machine dead.
2. Place a catch tray under the axis; old grease will come out.
3. Remove the **grease-inlet seal bolts** of the reducer.
4. Fill the syringe with the regulated amount and inject it through the inlet. Count the plunger travel: 2.5 mm per ml.
5. Rotate the axis slowly by hand (brakes released only with the arm mechanically supported) to distribute the grease.
6. Fit **new** seal bolts. If you must reuse the old ones, apply seal tape.
7. Wipe away every spill — grease on the floor of a brick plant becomes an abrasive paste and a slip hazard.
8. Wait: after a **reducer replacement**, do not operate for **at least 1 hour** so the LOCTITE 518 flange sealant sets.
9. Run the axis slowly for a few minutes, then check for seepage. If internal pressure has built up, vent it through the grease inlet.

> WARNING — **Never exceed the regulated quantity** and **never use Harmonic Drive SK-3**. Over-greasing raises internal pressure, extrudes grease past the seals, and the leaked grease collects brick dust into a grinding paste. The manual lists oil seepage as an inspection item precisely because over-greasing is a common mistake.

**What the quarterly grease inspection actually looks at**

| Observation | Meaning |
|---|---|
| Grease is the original pale colour, no particles | healthy |
| Grease darkened, no particles | normal ageing — note it, keep the interval |
| Grease grey/black with fine metallic particles | reducer wear — plan replacement (Part 2.6 level 3) |
| Grease leaking from the seal | over-greased or a damaged seal |
| Grease dried and crusty at the vent | vent blocked — clean it |
`,
        ru: `
> SOURCE — Maintenance Manual B-83495EN, §2.2 смазка редукторов.

Смазка стоит на длинном интервале (восполнение в 4 года / 15360 ч либо после любых работ с редуктором), но знать её надо: квартальный осмотр проверяет состояние смазки, а пересмазка сама по себе является дефектом.

**Материалы**

| Позиция | Номер |
|---|---|
| Смазка | **A98L-0040-0230** — Harmonic Drive **4B No.2** |
| Комплект (шприц + 80 г) | **A05B-1142-K021** |
| Сменная туба | **A05B-1139-K022** |
| Шкала шприца | ход поршня **2,5 мм = 1 мл** |

**Регламентные объёмы по осям**

| Ось | Количество | Объём по шприцу |
|---|---|---|
| J1 | 2,7 г | 3 мл |
| J2 | 2,7 г | 3 мл |
| J3 | 1,8 г | 2 мл |
| J4 | 1,8 г | 2 мл |
| J5 | 1,8 г | 2 мл |
| J6 | 1,8 г | 2 мл |

**Процедура**

1. Питание **ВЫКЛ**, блокировка. Смазка выполняется на обесточенной машине.
2. Поставьте поддон под ось; старая смазка выйдет наружу.
3. Снимите **уплотнительные болты отверстия подачи смазки** редуктора.
4. Заполните шприц регламентным объёмом и выдавите смазку через отверстие. Считайте ход поршня: 2,5 мм на мл.
5. Медленно прокрутите ось вручную (тормоза снимать только при механически подпертой руке), чтобы распределить смазку.
6. Установите **новые** уплотнительные болты. Если приходится ставить старые — примените уплотнительную ленту.
7. Уберите все потёки: смазка на полу кирпичного завода превращается в абразивную пасту и в опасность поскользнуться.
8. Выждите: после **замены редуктора** не включайте машину **не менее 1 часа**, чтобы схватился фланцевый герметик LOCTITE 518.
9. Покрутите ось медленно несколько минут, затем проверьте на течь. Если внутри выросло давление — стравите его через отверстие подачи смазки.

> WARNING — **Никогда не превышайте регламентное количество** и **никогда не применяйте Harmonic Drive SK-3**. Пересмазка повышает внутреннее давление, выдавливает смазку через уплотнения, а вытекшая смазка собирает кирпичную пыль в шлифовальную пасту. Руководство включает течь масла в пункты осмотра именно потому, что пересмазка — частая ошибка.

**Что реально смотрит квартальный осмотр смазки**

| Наблюдение | Смысл |
|---|---|
| Смазка исходного светлого цвета, без частиц | исправно |
| Смазка потемнела, частиц нет | нормальное старение — отметить, интервал сохранить |
| Смазка серая/чёрная с мелкими металлическими частицами | износ редуктора — планируйте замену (часть 2.6, уровень 3) |
| Смазка течёт из уплотнения | пересмазка либо повреждённое уплотнение |
| Смазка высохла коркой у вентиляции | вентиляция забита — очистить |
`,
      },
    },
    {
      id: 'calendar',
      title: { en: '3.7 The 6-month schedule for this cell', ru: '3.7 График на 6 месяцев для этой ячейки' },
      body: {
        en: `
Dates counted from **Monday 16 November 2026** (week 1), at the cell's real duty of ~350 running hours per month. Everything marked ▣ needs planned downtime; everything else is done during a shift change or before start-up.

| Date | Week | Task | Owner | Downtime |
|---|---|---|---|---|
| every shift | 1–26 | Daily visual inspection A + B + C ([checklist](assets/dl/daily-checklist.md)) | operator | 0 |
| every Friday | 1–26 | Weekly gripper/vacuum/interlock check | setter | 0 |
| **Mon 16 Nov 2026** | 1 | **Repair visit**: J5 tension measurement, backlash measurement, re-tension/replace belt, master J5+J6, open the new log | technician | 4 h |
| Mon 16 Nov 2026 | 1 | Full backup: ALL_OF_ABOVE + SYSMAST.SV, stored twice | technician | 0.5 h |
| Mon 14 Dec 2026 | 5 | ▣ Monthly: connectors, dust removal, controller ventilation, oil-seepage look | technician | 1 h |
| Mon 11 Jan 2027 | 9 | ▣ Monthly + verify backups restore | technician | 1 h |
| Mon 8 Feb 2027 | 13 | ▣ Monthly | technician | 1 h |
| **Mon 15 Feb 2027** | 14 | ▣ **Quarterly Q1**: bolt torque all listed fasteners, J5/J6 belt condition + tension + backlash, brake test, grease condition, cycle-time trend | technician | 3 h |
| Mon 8 Mar 2027 | 17 | ▣ Monthly | technician | 1 h |
| Mon 5 Apr 2027 | 21 | ▣ Monthly + controller battery voltage check (target 3.1–3.3 VDC) | technician | 1 h |
| **Mon 3 May 2027** | 25 | ▣ **Quarterly Q2** (same scope as Q1) | technician | 3 h |
| **Mon 17 May 2027** | 27 | ▣ **Half-yearly review**: 6-month trend report, spares audit, next 6-month schedule issued, PPM programme signed off | engineer | 1 h |
| (annual, if due) | — | ▣ **Battery replacement**: robot APC with power ON (Part 3.4 A); controller battery within 30 min of power-off (Part 3.4 B) | technician | 1 h |
| (4-year, if due) | — | ▣ Replenish reducer grease (J5/J6 1.8 g each) + replace the mechanical-unit cable | FANUC service | 2 days |

**Total planned downtime over six months: 12 hours** — against the 30–40 minutes lost per INTP-106 event. At one event per week that is 78–104 hours of unplanned stoppage, i.e. the entire PPM programme pays for itself roughly **8 times over** in the first six months. Put that arithmetic in the report; it is the sentence that convinces a production manager.

| | Hours over 6 months |
|---|---|
| Planned PPM downtime | 12 |
| Unplanned stops at 1 × INTP-106 per week, 35 min average | 91 |
| Unplanned stops at 1 × per month | 2 |
| **Net saving at the observed failure rate** | **≈ 79 h** |

**Who signs what**

| Role | Responsibility |
|---|---|
| Operator | daily checklist, initials and time; reports anything abnormal immediately |
| Setter / line lead | weekly checks; confirms the cell is safe to hand back after maintenance |
| Maintenance technician | monthly and quarterly work orders, measurements, records |
| Maintenance engineer | owns the PPM programme, approves interval changes, reviews trends |
| Plant manager | approves the downtime windows and the spares budget |
`,
        ru: `
Даты считаются от **понедельника 16 ноября 2026** (неделя 1) при фактической нагрузке ячейки ~350 часов наработки в месяц. Всё с пометкой ▣ требует планового простоя; остальное делается в пересменку или до пуска.

| Дата | Неделя | Работа | Ответственный | Простой |
|---|---|---|---|---|
| каждая смена | 1–26 | Ежедневный осмотр A + B + C ([чек-лист](assets/dl/daily-checklist.md)) | оператор | 0 |
| каждая пятница | 1–26 | Еженедельная проверка захвата/вакуума/блокировок | наладчик | 0 |
| **пн 16 ноя 2026** | 1 | **Ремонтный визит**: измерение натяжения J5, измерение люфта, натяжка/замена ремня, мастерение J5+J6, открытие нового журнала | техник | 4 ч |
| пн 16 ноя 2026 | 1 | Полная резервная копия: ALL_OF_ABOVE + SYSMAST.SV, в двух местах | техник | 0,5 ч |
| пн 14 дек 2026 | 5 | ▣ Ежемесячно: разъёмы, удаление пыли, вентиляция контроллера, осмотр на течь | техник | 1 ч |
| пн 11 янв 2027 | 9 | ▣ Ежемесячно + проверка восстанавливаемости копий | техник | 1 ч |
| пн 8 фев 2027 | 13 | ▣ Ежемесячно | техник | 1 ч |
| **пн 15 фев 2027** | 14 | ▣ **Квартал Q1**: момент всех перечисленных болтов, состояние + натяжение ремней J5/J6 + люфт, тест тормозов, состояние смазки, тренд времени цикла | техник | 3 ч |
| пн 8 мар 2027 | 17 | ▣ Ежемесячно | техник | 1 ч |
| пн 5 апр 2027 | 21 | ▣ Ежемесячно + проверка напряжения батареи контроллера (цель 3,1–3,3 В) | техник | 1 ч |
| **пн 3 мая 2027** | 25 | ▣ **Квартал Q2** (тот же объём, что Q1) | техник | 3 ч |
| **пн 17 мая 2027** | 27 | ▣ **Полугодовой разбор**: отчёт о трендах за 6 месяцев, аудит ЗИП, выдача графика на следующие 6 месяцев, подписание программы ППР | инженер | 1 ч |
| (ежегодно, если подошло) | — | ▣ **Замена батарей**: APC робота при ВКЛ питании (часть 3.4 A); батарея контроллера в течение 30 мин после выключения (часть 3.4 B) | техник | 1 ч |
| (4 года, если подошло) | — | ▣ Восполнение смазки редукторов (J5/J6 по 1,8 г) + замена кабеля механического блока | сервис FANUC | 2 дня |

**Суммарный плановый простой за шесть месяцев: 12 часов** — против 30–40 минут, теряемых на каждом событии INTP-106. При одном событии в неделю это 78–104 часа внеплановых остановов, то есть вся программа ППР окупается примерно **в 8 раз** за первые полгода. Внесите эту арифметику в отчёт: именно она убеждает начальника производства.

| | Часов за 6 месяцев |
|---|---|
| Плановый простой ППР | 12 |
| Внеплановые остановы при 1 × INTP-106 в неделю, в среднем 35 мин | 91 |
| Внеплановые остановы при 1 × в месяц | 2 |
| **Чистая экономия при наблюдаемой частоте отказов** | **≈ 79 ч** |

**Кто что подписывает**

| Роль | Ответственность |
|---|---|
| Оператор | ежедневный чек-лист, подпись и время; немедленно сообщает о любом отклонении |
| Наладчик / старший линии | еженедельные проверки; подтверждает, что ячейку можно вернуть в работу после ТО |
| Техник обслуживания | ежемесячные и квартальные наряды, измерения, записи |
| Инженер по обслуживанию | владелец программы ППР, утверждает изменения интервалов, разбирает тренды |
| Директор завода | утверждает окна простоя и бюджет на ЗИП |
`,
      },
    },
    {
      id: 'tools',
      title: { en: '3.8 The maintenance tool list', ru: '3.8 Перечень инструмента для обслуживания' },
      body: {
        en: `
The task asks for a list of maintenance tools. This is the complete kit for everything in Parts 2–5, grouped by what it is used for.

**Measuring and diagnostic**

| Tool | Spec / part number | Used for |
|---|---|---|
| Belt tensionmeter | **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III) | J5/J6 and J1/J2 belt tension — the only accepted method |
| Dial gauge | 1/100 mm (0.01 mm) resolution, 0–10 mm travel, with magnetic base | backlash measurement at 180 mm from J5 |
| Digital multimeter | DC volts to 20 V, 0.01 V resolution | controller battery (3.1–3.3 VDC), APC battery, supply checks |
| Calibrated torque wrench | 1/4" and 3/8" drive, 1–25 N·m and 5–60 N·m | every bolt torque check; the wrist cover is 5.6 N·m |
| Feeler gauges | 0.05–1.0 mm | gap checks at covers and mounts |
| Steel rule / tape | 1 mm graduation | span length verification (187 mm J5, 116 mm J6) |
| Infrared thermometer | −20…+350 °C | motor and reducer housing temperature trend |
| Teach pendant | the cell's own, with the manual's B-83494EN and B-83495EN loaded or on the shelf | alarm log, variables, mastering, backups |

**Hand tools**

| Tool | Spec | Used for |
|---|---|---|
| Hex key set | 1.5–10 mm, ball-end and standard | cover bolts, motor mounts |
| Open-end / ring wrench set | 8–19 mm | base bolts, adjusting bolts |
| Monkey (adjustable) wrench | 200 mm | general |
| Screwdriver set | flat and Phillips, insulated | covers, terminal blocks |
| C-ring pliers | internal and external | reducer and bearing work |
| Gear puller | 2- and 3-arm, 50–150 mm | removing pulleys and the reducer |
| Puller separator | — | separating tightly fitted parts |
| Soft-face mallet | nylon | never a steel hammer on a robot casting |
| Torx set, if your variant uses them | T15–T40 | covers |

**Consumables and chemicals**

| Item | Part number / spec | Used for |
|---|---|---|
| Thread locker, medium strength | **LOCTITE 243** | general bolts after re-torque |
| Thread locker, high strength | **LOCTITE 263** | high-strength fasteners, base bolts |
| Flange sealant | **LOCTITE 518** | reducer mounting flange |
| Retaining compound | **LOCTITE 638** | cylindrical retention, bushings |
| Reducer grease | **A98L-0040-0230** (Harmonic 4B No.2) | greasing; **never SK-3** |
| Grease kit with syringe | **A05B-1142-K021** (syringe + 80 g) | measured injection, 2.5 mm = 1 ml |
| Grease refill tube | **A05B-1139-K022** | restocking |
| J5/J6 timing belt | **A98L-0040-0286#004-157** | replacement |
| Controller battery | **A05B-2650-K030** (3 V lithium) | SRAM backup |
| Robot APC cells | 4 × C (LR14) 1.5 V built-in, or 4 × D external | absolute pulse coder |
| Cover gaskets | per the parts list | refit after every opening |
| Seal bolts for grease inlets | per the parts list | new ones after greasing |
| Paint marker | contrasting colour | witness marks on fasteners and mastering |
| Cleaning | lint-free cloths, isopropyl alcohol, low-pressure air, vacuum | dust removal — never wet on electrical parts |

**Safety and support equipment**

| Item | Used for |
|---|---|
| Lock-out / tag-out kit with personal padlocks | every task with the power off |
| Arm support stand or a lifting sling plus a hoist | mandatory before releasing any brake |
| Barricade tape and "maintenance in progress" signs | guarding the cell while open |
| Insulated gloves and safety glasses | battery and electrical work |
| Nitrile gloves | grease and LOCTITE |
| Catch trays | old grease |
| Camera or phone | witness marks, meter readings, damaged parts — the evidence trail for the claim |

> TIP — Print this list, tick what the site actually owns, and attach the gaps as a purchase request to the report. A maintenance plan that assumes tools nobody has is a plan that will not be executed — and that is the organisational root cause you identified in Part 2.7.
`,
        ru: `
Задание просит перечень инструмента для обслуживания. Это полный комплект для всего в частях 2–5, сгруппированный по назначению.

**Измерительное и диагностическое**

| Инструмент | Характеристика / номер | Для чего |
|---|---|---|
| Тензометр ремней | **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III) | натяжение ремней J5/J6 и J1/J2 — единственный признанный метод |
| Индикатор часового типа | разрешение 1/100 мм (0,01 мм), ход 0–10 мм, с магнитной стойкой | измерение люфта на 180 мм от J5 |
| Цифровой мультиметр | постоянное напряжение до 20 В, разрешение 0,01 В | батарея контроллера (3,1–3,3 В), батарея APC, проверки питания |
| Калиброванный динамометрический ключ | посадка 1/4" и 3/8", 1–25 Н·м и 5–60 Н·м | любая проверка момента; крышка кисти 5,6 Н·м |
| Набор щупов | 0,05–1,0 мм | контроль зазоров у крышек и посадок |
| Металлическая линейка / рулетка | деление 1 мм | проверка длины ветви (187 мм J5, 116 мм J6) |
| Инфракрасный термометр | −20…+350 °C | тренд температуры корпусов мотора и редуктора |
| Пульт обучения | штатный для ячейки, с руководствами B-83494EN и B-83495EN под рукой | журнал аварий, переменные, мастерение, копии |

**Ручной инструмент**

| Инструмент | Характеристика | Для чего |
|---|---|---|
| Набор шестигранников | 1,5–10 мм, шариковые и обычные | болты крышек, посадки моторов |
| Набор рожковых / накидных ключей | 8–19 мм | болты основания, регулировочные болты |
| Разводной ключ | 200 мм | общее назначение |
| Набор отвёрток | шлиц и крест, изолированные | крышки, клеммники |
| Съёмник стопорных колец | внутренний и внешний | работы с редуктором и подшипниками |
| Съёмник (лапчатый) | 2- и 3-лапый, 50–150 мм | снятие шкивов и редуктора |
| Сепаратор съёмника | — | разъединение плотно посаженных деталей |
| Киянка с мягким бойком | нейлон | никогда не бить стальным молотком по корпусу робота |
| Набор Torx, если у вашей модификации они есть | T15–T40 | крышки |

**Расходники и химия**

| Позиция | Номер / характеристика | Для чего |
|---|---|---|
| Фиксатор резьбы средней прочности | **LOCTITE 243** | обычные болты после перетяжки |
| Фиксатор резьбы высокой прочности | **LOCTITE 263** | высокопрочный крепёж, болты основания |
| Фланцевый герметик | **LOCTITE 518** | фланец посадки редуктора |
| Вал-втулочный фиксатор | **LOCTITE 638** | цилиндрические соединения, втулки |
| Смазка редукторов | **A98L-0040-0230** (Harmonic 4B No.2) | смазка; **никогда SK-3** |
| Комплект смазки со шприцем | **A05B-1142-K021** (шприц + 80 г) | дозированное введение, 2,5 мм = 1 мл |
| Сменная туба смазки | **A05B-1139-K022** | пополнение |
| Зубчатый ремень J5/J6 | **A98L-0040-0286#004-157** | замена |
| Батарея контроллера | **A05B-2650-K030** (3 В литиевая) | резерв SRAM |
| Элементы APC робота | 4 × C (LR14) 1,5 В встроенные либо 4 × D внешние | абсолютный импульсный кодер |
| Прокладки крышек | по перечню деталей | установка после каждого вскрытия |
| Уплотнительные болты отверстий смазки | по перечню деталей | новые после смазки |
| Красный маркер | контрастного цвета | контрольные метки на крепеже и для мастерения |
| Очистка | безворсовые салфетки, изопропиловый спирт, воздух низкого давления, пылесос | удаление пыли — никогда мокрое по электрике |

**Средства безопасности и поддержки**

| Позиция | Для чего |
|---|---|
| Комплект блокировки/бирок с личными замками | любая работа с выключенным питанием |
| Опорная стойка для руки либо строп и таль | обязательно до снятия любого тормоза |
| Сигнальная лента и знаки «идут работы» | ограждение вскрытой ячейки |
| Диэлектрические перчатки и защитные очки | батарейные и электрические работы |
| Нитриловые перчатки | смазка и LOCTITE |
| Поддоны | старая смазка |
| Фотоаппарат или телефон | контрольные метки, показания прибора, повреждённые детали — цепочка доказательств для рекламации |

> TIP — Распечатайте этот список, отметьте галочками, что у предприятия реально есть, и приложите недостающее к отчёту как заявку на закупку. План обслуживания, рассчитанный на инструмент, которого нет, — это план, который не выполнят: ровно та организационная первопричина, которую вы нашли в части 2.7.
`,
      },
    },
    {
      id: 'records',
      title: { en: '3.9 Records, KPIs and closing the loop', ru: '3.9 Записи, показатели и замыкание цикла' },
      body: {
        en: `
The task's first clue is a missing log entry. The programme therefore has to end with records that cannot go missing.

**Every maintenance record must contain**

| Field | Example |
|---|---|
| Date and shift | 2027-02-15, day shift |
| Robot serial number and controller software version | LR Mate 200iD/7L, s/n …, R-30iB Plus V9.40P |
| Running hours at the time of work | 13 500 h |
| Work order number | ППР-2027-Q1-014 |
| Task performed | quarterly torque + belt tension + backlash |
| **Measurements** | J5 17.4 / 17.6 / 17.5 N → mean 17.5; J6 18.0 N; backlash J5 0.06 mm |
| Parts used | none / belt A98L-0040-0286#004-157 |
| Deviations found and actions taken | 2 base bolts below torque → re-torqued with LOCTITE 243 |
| Downtime taken | 3 h planned |
| Technician name and signature | |
| Verified by / cell handed back | setter signature |
| Next due dates | monthly 2027-03-08; quarterly 2027-05-03 |

**KPIs worth reporting**

| KPI | Definition | Target |
|---|---|---|
| PPM compliance | work orders closed on time ÷ work orders due | 100 % |
| Unplanned stoppage | minutes lost to faults per month | trending to zero |
| MTBF between INTP-106 events | hours between occurrences | from 40 h (before) to > 1000 h (after) |
| Mean time to repair | from alarm to production | ≤ 30 min with the checklist |
| Belt tension trend | J5 mean tension per quarter | inside 16.5–20.6 N |
| Backlash trend | J5 backlash per quarter | ≤ 0.18 mm, no upward drift |
| Spares availability | critical items in stock | 100 % |

**Closing the loop**

1. At the half-yearly review (week 27) put the trend tables on one page: tension, backlash, cycle time, INTP-106 count.
2. Compare with the baseline taken in week 1.
3. State one improvement and one risk for the next six months.
4. Re-issue the schedule with new dates, signed.
5. File the whole pack — that is your Part 5 report material, already written.
`,
        ru: `
Первая улика задания — отсутствующая запись в журнале. Поэтому программа должна заканчиваться записями, которые не могут потеряться.

**Каждая запись об обслуживании содержит**

| Поле | Пример |
|---|---|
| Дата и смена | 15.02.2027, дневная смена |
| Серийный номер робота и версия ПО контроллера | LR Mate 200iD/7L, s/n …, R-30iB Plus V9.40P |
| Наработка на момент работ | 13 500 ч |
| Номер наряда | ППР-2027-Q1-014 |
| Выполненная работа | квартальные момент + натяжение ремней + люфт |
| **Измерения** | J5 17,4 / 17,6 / 17,5 Н → среднее 17,5; J6 18,0 Н; люфт J5 0,06 мм |
| Использованные запчасти | нет / ремень A98L-0040-0286#004-157 |
| Выявленные отклонения и принятые меры | 2 болта основания ниже момента → затянуты с LOCTITE 243 |
| Затраченный простой | 3 ч плановый |
| ФИО и подпись техника | |
| Проверил / ячейка возвращена в работу | подпись наладчика |
| Следующие даты | ежемесячно 08.03.2027; ежеквартально 03.05.2027 |

**Показатели, о которых стоит отчитываться**

| Показатель | Определение | Цель |
|---|---|---|
| Выполнение ППР | закрытые вовремя наряды ÷ подлежащие наряды | 100 % |
| Внеплановые простои | минуты, потерянные из-за отказов, в месяц | тренд к нулю |
| Наработка между событиями INTP-106 | часы между случаями | с 40 ч (до) до > 1000 ч (после) |
| Среднее время ремонта | от аварии до производства | ≤ 30 мин при наличии чек-листа |
| Тренд натяжения ремня | среднее натяжение J5 за квартал | в пределах 16,5–20,6 Н |
| Тренд люфта | люфт J5 за квартал | ≤ 0,18 мм, без роста |
| Наличие ЗИП | критичные позиции на складе | 100 % |

**Замыкание цикла**

1. На полугодовом разборе (неделя 27) выведите тренды на одну страницу: натяжение, люфт, время цикла, число INTP-106.
2. Сравните с базой, снятой на неделе 1.
3. Сформулируйте одно улучшение и один риск на следующие шесть месяцев.
4. Перевыпустите график с новыми датами, подписанный.
5. Подшейте весь пакет — это готовый материал для отчёта в части 5.
`,
      },
    },
  ],
};
