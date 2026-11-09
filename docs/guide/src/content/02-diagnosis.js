export const part2 = {
  id: 'diagnosis',
  num: '2',
  title: { en: 'Diagnostics: INTP-106, the J5 belt and the J5 play', ru: 'Диагностика: INTP-106, ремень J5 и люфт J5' },
  sub: {
    en: 'Task section 1. What INTP-106 actually means, how to measure J5 belt tension with a tensionmeter, and what to do about the visible backlash.',
    ru: 'Раздел 1 задания. Что на самом деле значит INTP-106, как измерить натяжение ремня J5 тензометром и что делать с видимым люфтом.',
  },
  sections: [
    {
      id: 'evidence',
      title: { en: '2.0 The three clues, read together', ru: '2.0 Три улики, прочитанные вместе' },
      body: {
        en: `
![Service scene](assets/media/service-scene.jpg "The state this task describes: an unlogged cell, a stopped line and an arm whose wrist does not hold its position.")

The task gives you three facts. Separately each one is a nuisance; together they form a single, coherent failure story, and saying so is the whole point of the diagnosis section.

| # | Fact from the task | What it tells you |
|---|---|---|
| 1 | No entry about belt condition in the service log for **6 months** | The periodic inspection was skipped. The LR Mate 200iD maintenance schedule requires belt condition to be checked **every 3 months / 960 h**, so at least two checks are missing |
| 2 | **INTP-106** periodically stops the line for **30–40 min** | A program was paused and could not be continued. INTP-106 is a *consequence* alarm — it is the pause that failed to resume, not the root fault |
| 3 | **Visible play on the J5 axis** | The wrist belt has lost tension, or a fastener has loosened, or the reducer has wear. Visible play at the wrist is far beyond the 0.18 mm limit |

**The causal chain you should state in the report**

~~~text
skipped quarterly belt check  (no log entry for 6 months)
        ↓
J5 timing belt loses tension  (slow loss is normal; nobody noticed)
        ↓
wrist backlash grows          (visible play, > 0.18 mm at 180 mm)
        ↓
actual J5 position ≠ commanded position
        ↓
pulse-coder / position mismatch during a deceleration or a paused move
        ↓
motion or program abort → the program is PAUSED at an arbitrary point
        ↓
CONT (continue) request fails → INTP-106
        ↓
operator cannot resume; technician must reset, jog out, restart the cycle
        ↓
30–40 minutes of lost production, every occurrence
~~~

> NOTE — This chain is a hypothesis, not a verdict. Part 2.1 to 2.5 is the sequence of checks that either confirms it or eliminates it. Never write "INTP-106 was caused by the belt" without the tension reading and the backlash measurement to back it up — that is exactly the sentence a warranty department will challenge.

**Tools and documents you need on site**

| Item | Part number / reference |
|---|---|
| Belt tensionmeter | **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III) |
| Dial gauge, 1/100 mm, with magnetic base | for the backlash measurement |
| Hex and open-end wrench set, torque wrench | cover bolt torque 5.6 N·m |
| Thread locker | LOCTITE **243** (medium), **263** (high), **518** (flange sealant), **638** (retaining) |
| Grease | **A98L-0040-0230** (Harmonic Drive 4B No.2), kit **A05B-1142-K021** |
| Manuals | Operator's Manual **B-83494EN**, Maintenance Manual **B-83495EN**, R-30iB Plus Error Code Manual |
`,
        ru: `
![Сервисная сцена](assets/media/service-scene.jpg "Состояние, описанное в задании: ячейка без журнала, остановленная линия и рука, кисть которой не держит позицию.")

Задание даёт три факта. По отдельности каждый — мелкая неприятность; вместе они складываются в одну связную историю отказа, и сказать это вслух — весь смысл раздела диагностики.

| № | Факт из задания | Что он говорит |
|---|---|---|
| 1 | В журнале обслуживания **6 месяцев** нет записи о состоянии ремней | Периодический осмотр пропущен. Регламент LR Mate 200iD требует проверять состояние ремней **каждые 3 месяца / 960 ч**, значит пропущено минимум две проверки |
| 2 | **INTP-106** периодически останавливает линию на **30–40 мин** | Программа была приостановлена и не смогла продолжиться. INTP-106 — авария-*следствие*: это не возобновившаяся пауза, а не корневой отказ |
| 3 | **Видимый люфт по оси J5** | Ремень кисти потерял натяжение, либо ослаб крепёж, либо износ редуктора. Видимый люфт в кисти — далеко за пределом 0,18 мм |

**Причинно-следственная цепочка, которую надо записать в отчёте**

~~~text
пропущена квартальная проверка ремней  (нет записи 6 месяцев)
        ↓
ремень J5 теряет натяжение  (медленная потеря нормальна; никто не заметил)
        ↓
растёт люфт кисти          (видимая игра, > 0,18 мм на 180 мм)
        ↓
фактическое положение J5 ≠ заданному
        ↓
рассогласование импульсного кодера / позиции при замедлении или приостановленном движении
        ↓
срыв движения или программы → программа ПАУЗИРОВАНА в произвольной точке
        ↓
запрос CONT (продолжить) не проходит → INTP-106
        ↓
оператор не может возобновить; техник сбрасывает, отводит вручную, перезапускает цикл
        ↓
30–40 минут потерянного производства при каждом случае
~~~

> NOTE — Эта цепочка — гипотеза, а не приговор. Разделы 2.1–2.5 — это последовательность проверок, которая её либо подтверждает, либо исключает. Никогда не пишите «INTP-106 вызван ремнём» без показания натяжения и измерения люфта в подтверждение: именно эту фразу оспорит гарантийный отдел.

**Инструмент и документы, нужные на месте**

| Позиция | Номер / источник |
|---|---|
| Тензометр (измеритель натяжения ремней) | **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III) |
| Индикатор часового типа 1/100 мм с магнитной стойкой | для измерения люфта |
| Набор шестигранников и рожковых ключей, динамометрический ключ | момент болта крышки 5,6 Н·м |
| Фиксатор резьбы | LOCTITE **243** (средний), **263** (высокий), **518** (фланцевый герметик), **638** (вал-втулка) |
| Смазка | **A98L-0040-0230** (Harmonic Drive 4B No.2), комплект **A05B-1142-K021** |
| Руководства | Operator's Manual **B-83494EN**, Maintenance Manual **B-83495EN**, справочник кодов ошибок R-30iB Plus |
`,
      },
    },
    {
      id: 'intp106',
      title: { en: '2.1 INTP-106: what the alarm really says', ru: '2.1 INTP-106: что на самом деле говорит авария' },
      body: {
        en: `
> SOURCE — R-30iB Plus Error Code Manual, interpreter (INTP) group. Text: **\`INTP-106 PAUSE.L (%s^4, %d^5) Continue request failed\`**

Decode the message instead of guessing at it:

- **INTP** = interpreter alarm group: the fault is in the *program execution layer*, not in the servo or the safety chain.
- **106** = the specific number in that group.
- **PAUSE.L** = the program is currently in the **paused** state (L = latch: the pause is held).
- **\`%s^4\`** = argument 4, a *string* — the name of the program or the routine that was running.
- **\`%d^5\`** = argument 5, a *number* — typically the line number within that program.
- **Continue request failed** = somebody pressed <kbd>FWD</kbd>/<kbd>CONT</kbd> (or an external start signal was given) and the controller refused to resume.

So INTP-106 is **not a root cause**. It is the controller telling you: *"something already stopped this program in a way that makes it non-resumable, and now you are asking me to continue."* The real fault happened **before** the alarm, and its code is sitting in the alarm history.

**Step 1 — read the arguments**

1. On the teach pendant press <kbd>MENU</kbd> → **4 ALARM** → **\[LOG\]** (F4 or soft key) to open the alarm log.
2. Find the INTP-106 entry and press <kbd>DETAIL</kbd>. It shows the substituted arguments: the program name and the line number.
3. Write both down. In a palletizing cell the line number tells you whether the fault happened during the **approach**, the **pick**, the **transfer** or the **place** — and that narrows the cause list dramatically.
4. Look at the entries **immediately above and below** it in time order. The cause is usually there:

| Preceding alarm | Meaning | Where to look next |
|---|---|---|
| **MOTN-049** / **MOTN-xxx** | motion aborted mid-path | joint configuration, singularity near J5 = 0°, wrist limit |
| **SRVO-038** pulse mismatch | commanded vs actual position differ by more than the allowed pulses | **lost mastering data or a slipping belt** — this is your J5 candidate |
| **SRVO-062** BZAL | battery for the absolute pulse coder failed | the APC battery in the robot base |
| **SRVO-075** pulse coder data abnormal | encoder signal fault | cable, connector, coder itself |
| **SRVO-199** control axis off | drive stopped | breaker, external axis enable |
| **INTP-202 / INTP-203** | motion-related interpreter abort | the statement that could not be executed |
| **INTP-106 alone, no preceding alarm** | the pause came from an external signal, a group mask, or a program logic state | check DI/UI signals, program state flags |

**Step 2 — clear and restart, per the manual's remedy**

The manual's remedy for INTP-106 is: *find the cause code from the alarm log, correct the cause, then release the alarm and restart the program; if it still will not continue, perform a controlled start (cold start).*

1. Correct the cause found in step 1.
2. Press <kbd>RESET</kbd> to release the alarm.
3. Reposition the robot: with the pendant in **T1**, override ≤ 30 %, deadman held, jog the arm to a safe posture, then **MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Variables** is not needed — just restart the cycle from the program's beginning with <kbd>FWD</kbd>.
4. If the program still refuses to continue: **cold start**. Press and hold <kbd>PREV</kbd> + <kbd>NEXT</kbd> while powering on → choose **3 Controlled start**. This re-reads the system variables from the image file and usually clears a stuck interpreter state.

> WARNING — A controlled start does **not** erase programs or mastering data, but it does reload system variables. Always take a backup (Part 3.6) before you cold-start a production controller, and never press **INITIAL START**, which will wipe it.

**Step 3 — the 30–40 minutes, accounted for**

Your report should break the downtime down, because "30–40 min" is an alarmingly large number for what should be a 5-minute reset:

| Phase | Realistic time | Why it is long here |
|---|---|---|
| Alarm appears, operator reacts | 1–2 min | |
| Operator tries RESET + CONT | 2–3 min | fails, because the cause is still present |
| Technician called, arrives | 5–15 min | the reason for the whole exercise |
| Read alarm log, identify cause | 5 min | |
| Correct the cause (re-tension / jog out / clear product) | 5–10 min | |
| Re-master or re-zero if needed | 0–15 min | only if SRVO-038/062 was involved |
| Restart, verify first cycle at low speed | 5 min | |
| **Total** | **23–55 min** | matches the reported 30–40 min |

**DeviceNet variant**

If your controller uses DeviceNet I/O for the cell, INTP-106 can also follow a network abort. Then check: the device's OFF/ERROR status in the **DEV LST** screen, the baud rate against the network's, duplicate MAC IDs, and loose connectors at the tap points. A belt problem and a network problem produce the *same* alarm, which is why you must read the log and not the symptom.
`,
        ru: `
> SOURCE — Справочник кодов ошибок R-30iB Plus, группа интерпретатора (INTP). Текст: **\`INTP-106 PAUSE.L (%s^4, %d^5) Continue request failed\`**

Расшифруйте сообщение, а не догадывайтесь о нём:

- **INTP** = группа аварий интерпретатора: сбой в *слое выполнения программы*, а не в приводе и не в цепи безопасности.
- **106** = конкретный номер в этой группе.
- **PAUSE.L** = программа сейчас в состоянии **паузы** (L = latch, пауза удерживается).
- **\`%s^4\`** = аргумент 4, *строка* — имя выполнявшейся программы или подпрограммы.
- **\`%d^5\`** = аргумент 5, *число* — обычно номер строки внутри этой программы.
- **Continue request failed** = кто-то нажал <kbd>FWD</kbd>/<kbd>CONT</kbd> (или пришёл внешний сигнал пуска), а контроллер отказался возобновлять.

Значит INTP-106 — **не первопричина**. Контроллер сообщает: *«программу уже остановило нечто такое, из-за чего её нельзя продолжить, а теперь вы просите меня продолжать»*. Настоящий отказ произошёл **до** аварии, и его код лежит в истории аварий.

**Шаг 1 — прочитайте аргументы**

1. На пульте нажмите <kbd>MENU</kbd> → **4 ALARM** → **\[LOG\]** (F4 или программная клавиша), чтобы открыть журнал аварий.
2. Найдите запись INTP-106 и нажмите <kbd>DETAIL</kbd>. Покажутся подставленные аргументы: имя программы и номер строки.
3. Запишите оба. В ячейке паллетирования номер строки говорит, случился ли сбой на **подводе**, **съёме**, **переносе** или **укладке**, — а это резко сужает список причин.
4. Посмотрите записи **непосредственно выше и ниже** по времени. Причина обычно там:

| Предшествующая авария | Смысл | Куда смотреть дальше |
|---|---|---|
| **MOTN-049** / **MOTN-xxx** | движение прервано на траектории | конфигурация осей, сингулярность около J5 = 0°, предел кисти |
| **SRVO-038** рассогласование импульсов | заданное и фактическое положение разошлись больше допустимого числа импульсов | **потеря данных мастерения или проскальзывающий ремень** — ваш кандидат по J5 |
| **SRVO-062** BZAL | отказала батарея абсолютного импульсного кодера | батарея APC в основании робота |
| **SRVO-075** ошибка данных импульсного кодера | сбой сигнала энкодера | кабель, разъём, сам кодер |
| **SRVO-199** ось управления отключена | привод остановлен | автомат, внешнее разрешение осей |
| **INTP-202 / INTP-203** | прерывание интерпретатора, связанное с движением | утверждение, которое не выполнилось |
| **INTP-106 один, без предшествующих** | пауза пришла от внешнего сигнала, маски группы или состояния логики программы | проверить сигналы DI/UI, флаги состояния программы |

**Шаг 2 — сброс и перезапуск по remedy из руководства**

Remedy руководства для INTP-106: *найти код причины в журнале аварий, устранить причину, затем снять аварию и перезапустить программу; если продолжить всё равно не удаётся — выполнить управляемый пуск (cold start).*

1. Устраните причину, найденную на шаге 1.
2. Нажмите <kbd>RESET</kbd>, чтобы снять аварию.
3. Перепозиционируйте робота: на пульте режим **T1**, переопределение скорости ≤ 30 %, держите deadman, отведите руку в безопасную позу, затем перезапустите цикл с начала программы клавишей <kbd>FWD</kbd>.
4. Если программа по-прежнему отказывается продолжаться: **cold start**. Удерживайте <kbd>PREV</kbd> + <kbd>NEXT</kbd> при включении питания → выберите **3 Controlled start**. Это перечитывает системные переменные из файла образа и обычно снимает застрявшее состояние интерпретатора.

> WARNING — Управляемый пуск **не** стирает программы и данные мастерения, но перезагружает системные переменные. Всегда делайте резервную копию (часть 3.6) перед cold start на производственном контроллере и никогда не нажимайте **INITIAL START** — он сотрёт всё.

**Шаг 3 — куда уходят 30–40 минут**

В отчёте стоит разложить простой, потому что «30–40 мин» — пугающе большое число для того, что должно быть пятиминутным сбросом:

| Фаза | Реальное время | Почему здесь долго |
|---|---|---|
| Авария появилась, оператор реагирует | 1–2 мин | |
| Оператор пробует RESET + CONT | 2–3 мин | не помогает: причина ещё на месте |
| Вызвали техника, он дошёл | 5–15 мин | причина всего этого упражнения |
| Прочитать журнал, определить причину | 5 мин | |
| Устранить причину (натянуть / отвести / убрать продукт) | 5–10 мин | |
| Ре-мастерение или обнуление, если нужно | 0–15 мин | только если участвовали SRVO-038/062 |
| Пуск, проверка первого цикла на низкой скорости | 5 мин | |
| **Итого** | **23–55 мин** | совпадает с заявленными 30–40 мин |

**Вариант с DeviceNet**

Если контроллер использует DeviceNet для обмена с ячейкой, INTP-106 может следовать и за обрывом сети. Тогда проверьте: статус OFF/ERROR устройства на экране **DEV LST**, скорость передачи против сетевой, дублирующиеся MAC ID, ослабленные разъёмы в точках ответвления. Проблема ремня и проблема сети дают *одну и ту же* аварию — поэтому читать надо журнал, а не симптом.
`,
      },
    },
    {
      id: 'fault-tree',
      title: { en: '2.2 Fault tree: ranked causes of INTP-106 on this cell', ru: '2.2 Дерево отказов: ранжированные причины INTP-106 в этой ячейке' },
      body: {
        en: `
![Fault tree](assets/diagram/intp106-flow.svg "Fault tree from the INTP-106 symptom down to measurable root causes, with the check that discriminates each branch.")

Work top-down and stop at the first branch whose evidence is present. Every branch lists the check that *discriminates* it — the measurement that proves or disproves it — so you never fix two things at once.

| Rank | Candidate cause | Evidence for it | Discriminating check | Fix |
|---|---|---|---|---|
| 1 | **J5 belt slack** → backlash → position mismatch during a paused move | Visible play at the wrist; no belt check logged for 6 months; alarm appears on motions that pause mid-path | Measure J5 belt tension (2.3) and J5 backlash (2.5) | Re-tension to 15.6–20.6 N, or replace the belt, then **master J5 and J6** |
| 2 | Loosened fasteners at the wrist or the motor mount | Play that disappears when you hold the arm; shiny witness marks around a bolt | Torque check of the cover, motor and reducer bolts | Re-torque to spec with LOCTITE 243/263 |
| 3 | **Worn J5 reducer** (harmonic drive) | Play that remains after the belt is correctly tensioned; grease with metal particles; noise | Backlash still > 0.18 mm with correct tension; inspect grease | Replace the reducer, re-grease, wait ≥ 1 h, master J5 |
| 4 | Damaged or loose motor/coder cable | Intermittent alarms that correlate with arm position; chafed jacket at the wrist bend | Wiggle test in T1 with the alarm log open; inspect the cable every 4 years per schedule | Replace the mechanical unit cable |
| 5 | APC battery weak → SRVO-062 BZAL → lost mastering | Battery older than 1 year (built-in C cells) or 1.5 years (external D cells); alarm after a power-off period | Check battery voltage/age, check for BZAL in the log | Replace **with power ON** (Part 3.5) |
| 6 | Singularity or wrist limit reached in the taught path | Alarm always at the same line number; J5 near 0° or near ±125° | Read the line number, look at the joint values at that point | Add a via point or change the configuration |
| 7 | External pause: gate, light curtain, upstream stop signal | INTP-106 with no preceding servo alarm; correlates with personnel movement | Monitor the DI/UI signals at the moment of the pause | Fix the interlock tuning or the sensor |
| 8 | DeviceNet / network abort | Cell I/O on DeviceNet; OFF or ERROR on the DEV LST screen | DEV LST status, baud rate, duplicate MAC IDs | Repair the network |
| 9 | Program logic pause that cannot be resumed (e.g. paused inside a motion statement with an unsupported continue) | Always the same program, same line, no hardware fault | Test with a simplified program | Restructure the program |

> TIP — Rank 1 and rank 3 look identical from the outside: both give wrist play. The only thing that separates them is the tension reading. Measure the belt **first** — it takes 25 minutes and costs nothing; a reducer replacement costs a day and a mastering of the whole axis.

**The one check that decides everything**

~~~text
IF  J5 belt tension < 15.6 N            → re-tension / replace belt → master J5+J6 → re-test
ELIF J5 belt tension in 15.6 … 20.6 N
     AND backlash ≤ 0.18 mm at 180 mm   → the wrist is fine; go to ranks 4–9
     AND backlash > 0.18 mm             → reducer or fasteners; torque check, then reducer
ELSE (tension > 20.6 N)                 → over-tensioned; bearing and motor load; re-tension down
~~~
`,
        ru: `
![Дерево отказов](assets/diagram/intp106-flow.svg "Дерево отказов от симптома INTP-106 к измеримым первопричинам; для каждой ветви указана различающая проверка.")

Идите сверху вниз и останавливайтесь на первой ветви, для которой есть подтверждения. В каждой ветви указана проверка, которая её *различает* — измерение, доказывающее или опровергающее её, — поэтому вы никогда не чините два узла сразу.

| Ранг | Кандидат в причины | Подтверждения | Различающая проверка | Устранение |
|---|---|---|---|---|
| 1 | **Ослабление ремня J5** → люфт → рассогласование позиции при приостановленном движении | Видимая игра в кисти; нет записи о проверке ремней 6 месяцев; авария на движениях с паузой посреди траектории | Измерить натяжение ремня J5 (2.3) и люфт J5 (2.5) | Натянуть до 15,6–20,6 Н либо заменить ремень, затем **мастерить J5 и J6** |
| 2 | Ослабленный крепёж кисти или посадки мотора | Люфт пропадает, если держать руку; блестящие следы вокруг болта | Проверка момента крышки, болтов мотора и редуктора | Затянуть по норме с LOCTITE 243/263 |
| 3 | **Износ редуктора J5** (гармонический) | Люфт остаётся при правильном натяжении; смазка с металлическими частицами; шум | Люфт > 0,18 мм при верном натяжении; осмотр смазки | Заменить редуктор, заново смазать, выждать ≥ 1 ч, мастерить J5 |
| 4 | Повреждённый или ослабленный кабель мотора/кодера | Прерывистые аварии, связанные с положением руки; потёртая оболочка на изгибе кисти | Тест на шевеление в T1 с открытым журналом; осмотр кабеля раз в 4 года по регламенту | Заменить кабель механического блока |
| 5 | Слабая батарея APC → SRVO-062 BZAL → потеря мастерения | Батарея старше 1 года (встроенные элементы C) или 1,5 года (внешние D); авария после периода без питания | Проверить напряжение/возраст батареи, наличие BZAL в журнале | Заменить **при включённом питании** (часть 3.5) |
| 6 | Сингулярность или предел кисти в обученной траектории | Авария всегда на одном номере строки; J5 около 0° или около ±125° | Прочитать номер строки, посмотреть значения осей в этой точке | Добавить промежуточную точку или изменить конфигурацию |
| 7 | Внешняя пауза: калитка, светозанавес, сигнал останова сверху | INTP-106 без предшествующей аварии привода; коррелирует с движением людей | Отследить сигналы DI/UI в момент паузы | Настроить блокировку или датчик |
| 8 | Обрыв DeviceNet / сети | обмен ячейки по DeviceNet; OFF или ERROR на экране DEV LST | Статус DEV LST, скорость, дубли MAC ID | Починить сеть |
| 9 | Пауза логики программы, которую нельзя продолжить (например, пауза внутри утверждения движения с неподдерживаемым continue) | Всегда та же программа, та же строка, аппаратного отказа нет | Тест на упрощённой программе | Перестроить программу |

> TIP — Ранги 1 и 3 снаружи выглядят одинаково: оба дают игру в кисти. Разделяет их только показание натяжения. Измерьте ремень **первым**: это 25 минут и ноль затрат, а замена редуктора — день работы и мастерение всей оси.

**Единственная проверка, которая решает всё**

~~~text
ЕСЛИ  натяжение ремня J5 < 15,6 Н        → натянуть / заменить ремень → мастерить J5+J6 → перепроверить
ИНАЧЕ ЕСЛИ натяжение в диапазоне 15,6 … 20,6 Н
     И люфт ≤ 0,18 мм на 180 мм          → кисть исправна; идите к рангам 4–9
     И люфт > 0,18 мм                    → редуктор или крепёж; проверка момента, затем редуктор
ИНАЧЕ (натяжение > 20,6 Н)               → перетянут; нагрузка на подшипники и мотор; ослабить
~~~
`,
      },
    },
    {
      id: 'tension-prep',
      title: { en: '2.3 Checking J5 belt tension with a tensionmeter — preparation', ru: '2.3 Проверка натяжения ремня J5 тензометром — подготовка' },
      body: {
        en: `
![Belt tension measurement](assets/media/belt-tension.jpg "A Mitsuboshi-type non-contact tensionmeter reading the J5 belt span through the opened arm cover.")

The LR Mate 200iD/7L uses timing belts to drive the wrist. The maintenance manual specifies a **non-contact vibration-type tensionmeter** and gives the exact parameters for each axis. Do not "pluck and guess": an under-tensioned belt slips and loses position; an over-tensioned belt loads the motor bearings and the reducer and fails early.

**The instrument**

| Item | Value |
|---|---|
| FANUC part number | **A97L-0218-0700** |
| Make / model | Mitsuboshi **DOCTOR TENSION TYPE-III** |
| Principle | excites the free span of the belt, measures its resonant frequency, converts to tension using the belt mass per unit length and the span length |
| Contact with the belt | none — the microphone/sensor head sits beside the span |

**Target values from the maintenance manual (§6.1 Belt tension adjustment)**

| Axis | Tension (N) | Belt mass (kg/m) | Belt width (mm) | Span length (mm) |
|---|---|---|---|---|
| J1 | 49–65 (long arm 7L) / 30–40 (standard) | 0.0367 | 6 | 167.5 |
| J2 | 49–65 (long arm 7L) / 30–40 (standard) | 0.0290 | 6 | 167.5 |
| J3 | see manual for the variant | — | — | — |
| **J5** | **15.6–20.6** | **0.02083** | **4** | **187** |
| J6 | 15.6–20.6 | 0.02083 | 4 | 116 |

Belt part number for J5/J6: **A98L-0040-0286#004-157**.

> NOTE — The manual explicitly says tension **slowly decreases with use, and that is normal**. A reading at the bottom of the band on a 2-year-old robot is not a fault. A reading *below* the band, or one that dropped since the last check, is.

**Cross-check of the numbers (worth showing in the report)**

The meter's physics is \`T = 4 · m · L² · f²\`, where *m* is the belt mass per unit length and *L* the span. Rearranged, the resonant frequency the meter should see is \`f = √(T / (4 m L²))\`. Plugging in FANUC's own J5 values:

| Axis | Span | f at the low limit | f at the high limit |
|---|---|---|---|
| J5 | 187 mm | 73 Hz (15.6 N) | 84 Hz (20.6 N) |
| J6 | 116 mm | 118 Hz (15.6 N) | 136 Hz (20.6 N) |
| J1 (7L) | 167.5 mm | 109 Hz (49 N) | 126 Hz (65 N) |
| J2 (7L) | 167.5 mm | 123 Hz (49 N) | 141 Hz (65 N) |

These frequencies are derived, not quoted from the manual — but they land exactly inside the working range of a vibration tensionmeter, which confirms the parameters are being interpreted correctly. If your meter shows 400 Hz on J5, your inputs are wrong, not the belt.

**Safety before you touch anything**

1. **Stop the cell.** Program paused, cycle finished, no product in the gripper.
2. **Lock out / tag out** the main disconnect. Belt tension measurement is done with the power **OFF**; the manual's adjustment procedure has you move the arm by hand.
3. **Support the arm mechanically** before releasing any brake. The wrist is light, but a J3 or J2 axis is not — if you release brakes to reach a pose, the arm will fall. Use the manual's rule: never release a brake without mechanically supporting that axis.
4. Let the machine cool; the reducer and motor housings get hot in production.
5. Wear gloves. Belt dust and old grease are not pleasant, and the cover edges are sharp.
6. Have the record sheet open before you start (download: [belt-tension-record.csv](assets/dl/belt-tension-record.csv)) — a measurement nobody wrote down is a measurement that did not happen. That is literally how this task began.

> DANGER — Never remove the robot's external APC battery with the power **OFF**, and never open the controller's battery compartment during this work. Doing so loses mastering data and creates SRVO-062 BZAL — turning a 25-minute tension check into a half-day mastering job. Parts 4 and 5 exist because somebody did exactly that.
`,
        ru: `
![Измерение натяжения ремня](assets/media/belt-tension.jpg "Бесконтактный тензометр типа Mitsuboshi снимает показание с ветви ремня J5 через открытую крышку руки.")

В LR Mate 200iD/7L кисть приводится зубчатыми ремнями. Руководство по обслуживанию предписывает **бесконтактный тензометр вибрационного типа** и приводит точные параметры для каждой оси. Не «щипайте на слух»: недотянутый ремень проскальзывает и теряет позицию, перетянутый нагружает подшипники мотора и редуктор и выходит из строя рано.

**Прибор**

| Позиция | Значение |
|---|---|
| Номер FANUC | **A97L-0218-0700** |
| Марка / модель | Mitsuboshi **DOCTOR TENSION TYPE-III** |
| Принцип | возбуждает свободную ветвь ремня, измеряет её резонансную частоту и пересчитывает в натяжение по массе ремня на единицу длины и длине ветви |
| Контакт с ремнём | отсутствует — головка датчика/микрофон располагается рядом с ветвью |

**Целевые значения из руководства по обслуживанию (§6.1 регулировка натяжения ремня)**

| Ось | Натяжение (Н) | Масса ремня (кг/м) | Ширина ремня (мм) | Длина ветви (мм) |
|---|---|---|---|---|
| J1 | 49–65 (длинная рука 7L) / 30–40 (стандарт) | 0,0367 | 6 | 167,5 |
| J2 | 49–65 (длинная рука 7L) / 30–40 (стандарт) | 0,0290 | 6 | 167,5 |
| J3 | см. руководство для вашей модификации | — | — | — |
| **J5** | **15,6–20,6** | **0,02083** | **4** | **187** |
| J6 | 15,6–20,6 | 0,02083 | 4 | 116 |

Номер ремня для J5/J6: **A98L-0040-0286#004-157**.

> NOTE — Руководство прямо говорит, что натяжение **медленно снижается в процессе работы, и это нормально**. Показание у нижней границы двухлетнего робота — не отказ. Отказ — это показание *ниже* диапазона либо падение с прошлой проверки.

**Перекрёстная проверка чисел (стоит показать в отчёте)**

Физика прибора: \`T = 4 · m · L² · f²\`, где *m* — масса ремня на единицу длины, *L* — длина ветви. Отсюда резонансная частота, которую должен видеть прибор: \`f = √(T / (4 m L²))\`. Подставим собственные значения FANUC для J5:

| Ось | Ветвь | f на нижней границе | f на верхней границе |
|---|---|---|---|
| J5 | 187 мм | 73 Гц (15,6 Н) | 84 Гц (20,6 Н) |
| J6 | 116 мм | 118 Гц (15,6 Н) | 136 Гц (20,6 Н) |
| J1 (7L) | 167,5 мм | 109 Гц (49 Н) | 126 Гц (65 Н) |
| J2 (7L) | 167,5 мм | 123 Гц (49 Н) | 141 Гц (65 Н) |

Эти частоты выведены, а не процитированы из руководства, но они попадают ровно в рабочий диапазон вибрационного тензометра, что подтверждает правильность интерпретации параметров. Если прибор показывает 400 Гц на J5 — ошиблись вы во входных данных, а не ремень.

**Безопасность перед любым касанием**

1. **Остановите ячейку.** Программа на паузе, цикл завершён, в захвате нет продукта.
2. **Заблокируйте и повесьте бирку** на главный разъединитель. Натяжение измеряют при **выключенном** питании; процедура регулировки в руководстве предполагает перемещение руки вручную.
3. **Механически подоприте руку** до снятия любого тормоза. Кисть лёгкая, а ось J2 или J3 — нет: если для позы придётся снять тормоза, рука упадёт. Правило из руководства: никогда не снимайте тормоз, механически не подперев ось.
4. Дайте машине остыть; корпуса редуктора и мотора в производстве горячие.
5. Работайте в перчатках. Пыль от ремня и старая смазка неприятны, а кромки крышки острые.
6. Откройте бланк записи до начала работы (скачать: [belt-tension-record.csv](assets/dl/belt-tension-record.csv)) — измерение, которое никто не записал, не состоялось. Именно так и началась эта задача.

> DANGER — Никогда не снимайте внешнюю батарею APC робота при **выключенном** питании и не открывайте батарейный отсек контроллера во время этой работы. Это приводит к потере данных мастерения и аварии SRVO-062 BZAL, превращая 25-минутную проверку натяжения в полудня мастерения. Части 4 и 5 существуют потому, что кто-то сделал ровно это.
`,
      },
    },
    {
      id: 'tension-procedure',
      title: { en: '2.4 The measurement sequence, step by step', ru: '2.4 Последовательность измерения, шаг за шагом' },
      body: {
        en: `
![Tension measurement sequence](assets/diagram/belt-tension.svg "Arm pose, cover removal, span definition, three readings per axis, and the decision that follows.")

Follow the maintenance manual's §6.1 sequence. Total time: about 25 minutes for J5 and J6 together.

**A. Bring the arm to the measurement pose**

1. With power ON, in **T1**, override ≤ 10 %, deadman held, jog to the manual's inspection pose: **J3 = 80°, J5 = ±90°**.
2. Record the pose on the sheet. Every reading must be taken in the same pose, otherwise the span length changes and the numbers are not comparable.
3. Power **OFF**, lock out.

**B. Open the wrist**

4. Remove the fixing bolt and the **arm cover** on the wrist. Keep the bolts in a tray — they are different lengths.
5. Remove the **gasket** and put it aside, clean side up. It goes back; a missing gasket is how dust and brick abrasive get into a reducer.
6. Note the cover bolt torque for reassembly: **5.6 N·m**.

**C. Set up the tensionmeter**

7. Switch the meter on and set the parameters exactly as the manual gives them:

| Setting | J5 | J6 |
|---|---|---|
| Belt type / unit | timing belt, metric | timing belt, metric |
| **Belt mass per unit length** | **0.02083 kg/m** | **0.02083 kg/m** |
| **Belt width** | **4 mm** | **4 mm** |
| **Span length** | **187 mm** | **116 mm** |
| Unit of result | N | N |
| Number of belt strands | 1 | 1 |

8. Zero / calibrate the meter in a quiet place with no belt nearby. A brick plant is noisy — take the reading during a line stop, not with the kiln fans running.

**D. Measure**

9. Place the sensor head beside the **free span** of the J5 belt — the straight run between the two pulleys, 187 mm of it — without touching the belt.
10. Pluck the belt once with a fingertip (or use the meter's excitation), and read the tension when the value stabilises.
11. Take **three readings** and record all three plus the mean. Repeatability worse than ±0.5 N means your span length or mass input is wrong.
12. Repeat steps 9–11 for **J6** (span 116 mm) — the manual has you adjust both in the same opening, and a J5 belt replacement always requires re-mastering **J5 and J6**.
13. While the cover is off, do the free visual checks that cost nothing:

| Check | What a bad sign looks like |
|---|---|
| Belt teeth | glazing, missing teeth, cracks at the tooth root, fibres sticking out |
| Belt sides | fraying, uneven wear (a sign of pulley misalignment) |
| Pulleys | debris in the teeth, rust, a shiny band where the belt has been slipping |
| Bolt witness marks | paint marks broken or rotated → a fastener has moved |
| Grease around the reducer | grey or black grease, metal flakes → reducer wear |
| Cable at the wrist bend | chafed jacket, cracked strain relief |

**E. Adjust, if the reading is out of band**

14. Loosen the **tension-adjusting bolts** of the motor mount.
15. Move the motor to change tension — small turns. Re-measure after each adjustment; the belt needs a moment to settle.
16. Target the **middle** of the band (about 18 N for J5/J6), not the edge: it gives you the longest interval before the next check finds it low again.
17. Tighten the adjusting bolts, re-measure once more (tightening changes the tension slightly), then refit the **gasket**, the **cover** and the bolt at **5.6 N·m**.
18. Apply thread locker to the fasteners the manual lists (LOCTITE 243 for general bolts, 263 for high-strength) and mark fresh witness marks with a paint pen.

**F. After any belt work**

19. Removing or replacing the belt breaks the relationship between the motor and the joint, so the axis must be re-mastered:
   - belt re-tensioned only → verify the master position; if the arm was moved by hand with brakes released, re-master.
   - belt replaced, motor or reducer removed → **single-axis mastering is mandatory**. For **J5 you must master J5 *and* J6**.
20. Full procedure in Part 4.4.
21. Power on, jog in T1 at low override, check that the wrist holds position when you nudge it by hand (it should not move at all), and run a slow test cycle before returning the cell to production.
22. **Write the entry in the service log.** Date, hours, pose, three readings, mean, action taken, who did it. This is the step whose absence created the assignment.

> TIP — Photograph the witness marks and the meter display with the reading visible. Two photos in the report are worth more than a table of numbers nobody can trace.
`,
        ru: `
![Последовательность измерения натяжения](assets/diagram/belt-tension.svg "Поза руки, снятие крышки, определение ветви, три отсчёта на ось и следующее за этим решение.")

Следуйте последовательности §6.1 руководства по обслуживанию. Общее время: около 25 минут на J5 и J6 вместе.

**A. Приведите руку в позу измерения**

1. При включённом питании, в **T1**, переопределение ≤ 10 %, держите deadman, наведите на позу осмотра из руководства: **J3 = 80°, J5 = ±90°**.
2. Запишите позу в бланк. Все отсчёты делаются в одной и той же позе, иначе длина ветви меняется и числа несопоставимы.
3. Питание **ВЫКЛ**, блокировка.

**B. Откройте кисть**

4. Снимите крепёжный болт и **крышку руки** на кисти. Болты складывайте в лоток — они разной длины.
5. Снимите **прокладку** и отложите чистой стороной вверх. Она вернётся на место; отсутствующая прокладка — это путь пыли и кирпичного абразива в редуктор.
6. Запомните момент затяжки болта крышки для сборки: **5,6 Н·м**.

**C. Настройте тензометр**

7. Включите прибор и задайте параметры ровно так, как их даёт руководство:

| Установка | J5 | J6 |
|---|---|---|
| Тип ремня / единицы | зубчатый ремень, метрические | зубчатый ремень, метрические |
| **Масса ремня на единицу длины** | **0,02083 кг/м** | **0,02083 кг/м** |
| **Ширина ремня** | **4 мм** | **4 мм** |
| **Длина ветви** | **187 мм** | **116 мм** |
| Единица результата | Н | Н |
| Число ветвей ремня | 1 | 1 |

8. Обнулите / откалибруйте прибор в тихом месте, вдали от ремня. Кирпичный завод шумен — снимайте показание во время останова линии, а не при работающих вентиляторах печи.

**D. Измерьте**

9. Расположите головку датчика рядом со **свободной ветвью** ремня J5 — прямым участком между двумя шкивами, те самые 187 мм, — не касаясь ремня.
10. Один раз щипните ремень пальцем (либо используйте возбуждение прибора) и считайте натяжение, когда значение стабилизируется.
11. Сделайте **три отсчёта** и запишите все три плюс среднее. Разброс хуже ±0,5 Н означает, что неверно введены длина ветви или масса.
12. Повторите шаги 9–11 для **J6** (ветвь 116 мм) — руководство предписывает регулировать оба в одном вскрытии, а замена ремня J5 всегда требует повторного мастерения **J5 и J6**.
13. Пока крышка снята, выполните бесплатные визуальные проверки:

| Проверка | Как выглядит плохой признак |
|---|---|
| Зубья ремня | засаливание, отсутствие зубьев, трещины у основания зуба, торчащие волокна |
| Боковины ремня | бахрома, неравномерный износ (признак перекоса шкивов) |
| Шкивы | мусор в зубьях, ржавчина, блестящая полоса там, где ремень проскальзывал |
| Контрольные метки на болтах | метки сорваны или повёрнуты → крепёж сдвинулся |
| Смазка вокруг редуктора | серая или чёрная смазка, металлическая пудра → износ редуктора |
| Кабель на изгибе кисти | потёртая оболочка, треснувший ввод |

**E. Отрегулируйте, если показание вне диапазона**

14. Ослабьте **болты регулировки натяжения** на посадке мотора.
15. Перемещайте мотор, меняя натяжение, — небольшими поворотами. Перемеряйте после каждой регулировки; ремню нужно время улечься.
16. Цельтесь в **середину** диапазона (около 18 Н для J5/J6), а не в край: это даст наибольший интервал до следующей проверки, которая снова найдёт его низким.
17. Затяните регулировочные болты, перемерьте ещё раз (затяжка чуть меняет натяжение), затем верните на место **прокладку**, **крышку** и болт с моментом **5,6 Н·м**.
18. Нанесите фиксатор резьбы на крепёж из перечня руководства (LOCTITE 243 для обычных болтов, 263 для высокопрочных) и поставьте новые контрольные метки красным маркером.

**F. После любых работ с ремнём**

19. Снятие или замена ремня разрушает связь между мотором и суставом, поэтому ось надо заново отмастерить:
   - только натянули ремень → проверьте позицию мастерения; если руку двигали вручную со снятыми тормозами — мастерите заново.
   - ремень заменён, мотор или редуктор снимались → **обязательно мастерение одной оси**. Для **J5 мастерить надо J5 *и* J6**.
20. Полная процедура — в части 4.4.
21. Включите питание, подвигайте в T1 на низком переопределении, убедитесь, что кисть держит позицию при попытке сдвинуть её рукой (она не должна двигаться вовсе), и прогоните медленный тестовый цикл перед возвратом ячейки в производство.
22. **Внесите запись в журнал обслуживания.** Дата, наработка, поза, три отсчёта, среднее, выполненное действие, кто делал. Это тот самый шаг, отсутствие которого и породило задание.

> TIP — Сфотографируйте контрольные метки и дисплей прибора с видимым показанием. Две фотографии в отчёте стоят больше таблицы чисел, которые никто не может проследить.
`,
      },
    },
    {
      id: 'backlash',
      title: { en: '2.5 Measuring the J5 play (backlash)', ru: '2.5 Измерение люфта J5 (обратного хода)' },
      body: {
        en: `
"Visible play" is not a measurement. The maintenance manual gives limits for every axis, measured with a **dial gauge (1/100 mm)** at a defined distance from the axis of rotation, and for the wrist the number is small.

**Table 3.3(b) — backlash limits, LR Mate 200iD (values for the 7L long-arm variant in brackets)**

| Axis | Measuring distance from the axis (mm) | Maximum backlash (mm) |
|---|---|---|
| J1 | 715 (910 for 7L) | 0.41 (0.52 for 7L) |
| J2 | 330 (440 for 7L) | 0.19 (0.25 for 7L) |
| J3 | 335 (420 for 7L) | 0.20 (0.25 for 7L) |
| J4 | 100 | 0.16 |
| **J5** | **180** | **0.18** |
| J6 | 100 | 0.15 |

**How to measure it**

1. Power OFF, lock out, and **mechanically support the arm** if you intend to release brakes — otherwise keep the brakes engaged and measure only what is measurable with them on.
2. Mount the dial gauge on a magnetic base fixed to a solid, non-moving part (the pedestal or the arm casting upstream of J5). Zero the gauge.
3. Put the gauge tip on the measured point at **180 mm from the J5 axis**, perpendicular to the direction of motion.
4. Apply a light, consistent force in one direction and note the reading. Reverse the force direction slowly and note how far the tip travels before the joint actually moves. That travel is the backlash.
5. Repeat three times in both directions. Report the **maximum**.
6. For comparison, do the same at J6 (100 mm, limit 0.15 mm) and, if you can reach it, at J4.

**Interpreting the result**

| Measured at 180 mm | Verdict | Action |
|---|---|---|
| ≤ 0.18 mm | within specification | record it, no action |
| 0.18 – 0.40 mm | out of specification, moderate | check fasteners and belt tension first (2.6), re-measure |
| > 0.40 mm, or visible by eye | far out of specification | treat as a fault: belt, reducer or a loose motor mount |
| play disappears when the belt is tensioned correctly | belt was the cause | re-tension / replace, master J5+J6 |
| play remains at correct tension | reducer or fasteners | torque check, then reducer replacement |

> NOTE — Convert the number to something a report reader feels. 0.18 mm at 180 mm from the axis is about **0.057°** of angular play. The robot's repeatability specification is **±0.01 mm** — so a wrist at its backlash limit has roughly **six times** the positional slop of the whole machine's accuracy spec, and it sits at the far end of a 911 mm arm where every degree of wrist error becomes millimetres at the brick. That is why a brick on layer 8 lands off-pattern while layer 1 looks fine.

**Why backlash produces alarms and not just bad placement**

A loose belt means the motor turns and the joint does not. The pulse coder sits on the **motor**, so the controller believes the joint is where the motor says it is. During a rapid deceleration, a paused motion or a direction reversal, the joint lags, catches up, or overshoots — and the mismatch between commanded and actual position is what raises the servo-level alarms (SRVO-038 pulse mismatch being the classic). The interpreter, meanwhile, has a program paused in the middle of a motion it can no longer guarantee — and refuses the continue request. **INTP-106.**
`,
        ru: `
«Видимый люфт» — не измерение. Руководство по обслуживанию даёт пределы для каждой оси, измеренные **индикатором часового типа (1/100 мм)** на определённом расстоянии от оси вращения, и для кисти это маленькое число.

**Таблица 3.3(b) — пределы обратного хода, LR Mate 200iD (в скобках значения для длиннорукой 7L)**

| Ось | Расстояние от оси до точки измерения (мм) | Максимальный люфт (мм) |
|---|---|---|
| J1 | 715 (910 для 7L) | 0,41 (0,52 для 7L) |
| J2 | 330 (440 для 7L) | 0,19 (0,25 для 7L) |
| J3 | 335 (420 для 7L) | 0,20 (0,25 для 7L) |
| J4 | 100 | 0,16 |
| **J5** | **180** | **0,18** |
| J6 | 100 | 0,15 |

**Как измерить**

1. Питание ВЫКЛ, блокировка, и **механически подоприте руку**, если собираетесь снимать тормоза; иначе оставьте тормоза включёнными и измеряйте только то, что измеримо с ними.
2. Закрепите индикатор на магнитной стойке на неподвижной жёсткой части (тумба или корпус руки выше по потоку от J5). Обнулите индикатор.
3. Поставьте ножку индикатора в точку измерения на **180 мм от оси J5**, перпендикулярно направлению движения.
4. Приложите лёгкое постоянное усилие в одну сторону и запишите показание. Медленно поменяйте направление усилия и отметьте, какой путь проходит ножка, прежде чем сустав действительно сдвинется. Этот ход и есть обратный люфт.
5. Повторите трижды в обоих направлениях. В отчёт идёт **максимум**.
6. Для сравнения сделайте то же на J6 (100 мм, предел 0,15 мм) и, если дотянетесь, на J4.

**Интерпретация результата**

| Измерено на 180 мм | Вердикт | Действие |
|---|---|---|
| ≤ 0,18 мм | в норме | записать, действий не требуется |
| 0,18–0,40 мм | вне нормы, умеренно | сначала крепёж и натяжение ремня (2.6), перемерить |
| > 0,40 мм либо видно глазом | далеко вне нормы | считать отказом: ремень, редуктор или ослабленная посадка мотора |
| люфт исчезает при правильном натяжении ремня | причина — ремень | натянуть/заменить, мастерить J5+J6 |
| люфт остаётся при верном натяжении | редуктор или крепёж | проверка момента, затем замена редуктора |

> NOTE — Переведите число в то, что почувствует читатель отчёта. 0,18 мм на 180 мм от оси — это около **0,057°** угловой игры. Спецификация повторяемости робота — **±0,01 мм**, то есть кисть на пределе люфта имеет примерно **шестикратный** запас против точности всей машины, и находится она на конце руки вылетом 911 мм, где каждая доля градуса ошибки кисти превращается в миллиметры на кирпиче. Поэтому кирпич восьмого слоя встаёт мимо схемы, а первый слой выглядит нормально.

**Почему люфт даёт аварии, а не только плохую укладку**

Ослабленный ремень означает, что мотор крутится, а сустав — нет. Импульсный кодер сидит на **моторе**, поэтому контроллер считает, что сустав там, где его видит мотор. При резком замедлении, приостановленном движении или реверсе сустав отстаёт, догоняет или перескакивает — и рассогласование между заданным и фактическим положением поднимает аварии уровня привода (классика — SRVO-038, рассогласование импульсов). Интерпретатор при этом держит программу на паузе посреди движения, которое он больше не может гарантировать, — и отклоняет запрос на продолжение. **INTP-106.**
`,
      },
    },
    {
      id: 'action-plan',
      title: { en: '2.6 Action plan for the J5 backlash', ru: '2.6 План действий по люфту J5' },
      body: {
        en: `
![Action tree](assets/diagram/j5-tree.svg "Decision tree from the two measurements to one of four work packages, each with its time, parts and mastering consequences.")

The task asks for an action plan covering three things: **checking the fasteners**, **replacing the belt**, and **replacing the gearbox**. Do them in that order — they are also in ascending order of cost and downtime.

**Level 1 — fasteners and re-tension (≈ 45 min, no parts, no mastering if the arm was not moved)**

| # | Action | Spec |
|---|---|---|
| 1 | Lock out, support the arm, open the wrist cover | cover bolt 5.6 N·m on reassembly |
| 2 | Inspect witness marks on the motor mount, reducer and cover bolts | broken/rotated marks = a fastener moved |
| 3 | Torque-check every listed fastener with a calibrated wrench | tighten to the manual's values, in the stated sequence |
| 4 | Apply thread locker where the manual requires it | LOCTITE **243** medium strength for general bolts; **263** for high-strength; **518** as a flange sealant on mating faces; **638** for retaining cylindrical parts |
| 5 | Measure the belt tension and correct to the middle of the band | J5 and J6: 15.6–20.6 N, target ≈ 18 N |
| 6 | Re-measure the backlash at 180 mm | accept only if ≤ 0.18 mm |
| 7 | Paint fresh witness marks, refit gasket + cover, close the record | |

**Level 2 — belt replacement (≈ 2–3 h, part A98L-0040-0286#004-157, mastering J5 + J6 mandatory)**

Trigger: tension cannot be brought into the band, the belt has missing/cracked/glazed teeth, the sides are frayed, or the pulley shows a polished slip band.

1. Support the arm, remove the cover and gasket.
2. Loosen the tension-adjusting bolts and slide the motor to release the belt.
3. Remove the old belt; **compare it with the new one** tooth count and width before fitting (a wrong belt is a silent killer).
4. Clean the pulleys; check them for tooth damage and for runout.
5. Fit the new belt, set tension to the middle of the band, tighten the adjusting bolts, re-measure.
6. Refit gasket, cover, bolt at 5.6 N·m, thread locker and witness marks.
7. **Master J5 and J6** (Part 4.4). Removing the belt breaks the motor-to-joint relationship for both axes driven through that wrist.
8. Test cycle at 10 % override, then 50 %, then production speed.

**Level 3 — reducer (gearbox) replacement (≈ 1 day + curing, mastering mandatory, specialist tools)**

Trigger: backlash still above 0.18 mm with a correctly tensioned new belt; abnormal noise; grease containing metal particles; or the reducer has exceeded its service life.

| # | Action | Notes |
|---|---|---|
| 1 | Order the correct reducer for the **7L** variant | the long-arm wrist differs from the standard; verify by serial number |
| 2 | Drain/collect the old grease and inspect it | metal flakes confirm the diagnosis — photograph it for the claim |
| 3 | Remove the belt, the motor and the reducer | gear puller, separator, C-ring pliers per the manual's tool list |
| 4 | Clean the housing, inspect the mating faces | no dents, no old sealant residue |
| 5 | Fit the new reducer with **LOCTITE 518** on the flange | the manual specifies it for reducer mounting |
| 6 | Refit motor, belt, set tension, torque everything | |
| 7 | **Wait at least 1 hour** before operating | the sealant must set — the manual is explicit |
| 8 | Re-grease to the regulated amounts | J5 and J6: **1.8 g (2 ml)** each; grease A98L-0040-0230, kit A05B-1142-K021, plunger 2.5 mm = 1 ml |
| 9 | Master the axis, then run-in | slow cycles first, then re-measure backlash after 1 h of running |
| 10 | Record everything, including the old part's condition | this is your evidence for the claim in Part 5 |

> WARNING — Never use **Harmonic Drive SK-3** grease in these reducers even though it is the same brand family; the manual specifies **4B No.2 (A98L-0040-0230)**. Never exceed the regulated grease quantity: over-greasing builds pressure, blows the seals and creates the oil-seepage fault the manual tells you to check for. After greasing, if pressure builds up inside, vent through the grease inlet.

**Level 4 — cable and coder (only if levels 1–3 do not explain it)**

Replace the mechanical unit cable (the manual puts it on a 4-year / 15360 h interval), inspect the coder connector, and re-check. Cable faults produce *intermittent* alarms correlated with arm position, not steady backlash — which is how you tell them apart.

**The plan you hand in**

| Level | Trigger | Time | Parts | Mastering |
|---|---|---|---|---|
| 1 | first attempt, always | 45 min | LOCTITE only | only if the arm was moved with brakes off |
| 2 | tension out of band or belt damaged | 2–3 h | belt A98L-0040-0286#004-157 | **J5 + J6, mandatory** |
| 3 | backlash persists with a good belt | 1 day + 1 h cure | reducer, grease kit | **mandatory** |
| 4 | intermittent, position-dependent alarms | 4 h | mechanical unit cable | not normally required |
`,
        ru: `
![Дерево действий](assets/diagram/j5-tree.svg "Дерево решений: от двух измерений к одному из четырёх пакетов работ, каждый со своим временем, запчастями и последствиями для мастерения.")

Задание требует план действий, покрывающий три вещи: **проверку крепежа**, **замену ремня** и **замену редуктора**. Выполняйте их в этом порядке — он же порядок возрастания стоимости и простоя.

**Уровень 1 — крепёж и натяжение (≈ 45 мин, без запчастей, без мастерения, если руку не двигали)**

| № | Действие | Норма |
|---|---|---|
| 1 | Блокировка, подпор руки, вскрытие крышки кисти | момент болта крышки при сборке 5,6 Н·м |
| 2 | Осмотр контрольных меток на болтах посадки мотора, редуктора и крышки | сорванные/повёрнутые метки = крепёж сдвинулся |
| 3 | Контроль момента каждого болта из перечня калиброванным ключом | затягивать по значениям руководства, в указанной последовательности |
| 4 | Нанести фиксатор резьбы там, где требует руководство | LOCTITE **243** средней прочности для обычных болтов; **263** для высокопрочных; **518** как фланцевый герметик на стыки; **638** для вал-втулочных соединений |
| 5 | Измерить натяжение ремня и привести к середине диапазона | J5 и J6: 15,6–20,6 Н, цель ≈ 18 Н |
| 6 | Перемерить люфт на 180 мм | принимать только при ≤ 0,18 мм |
| 7 | Поставить новые контрольные метки, вернуть прокладку и крышку, закрыть запись | |

**Уровень 2 — замена ремня (≈ 2–3 ч, деталь A98L-0040-0286#004-157, мастерение J5 + J6 обязательно)**

Основание: натяжение не приводится в диапазон, у ремня отсутствуют/треснули/засалены зубья, боковины разлохмачены, либо на шкиве видна полированная полоса проскальзывания.

1. Подоприте руку, снимите крышку и прокладку.
2. Ослабьте болты регулировки натяжения и сдвиньте мотор, освобождая ремень.
3. Снимите старый ремень; **сравните его с новым** по числу зубьев и ширине до установки (неправильный ремень убивает тихо).
4. Очистите шкивы; проверьте их на повреждение зубьев и биение.
5. Установите новый ремень, натяните до середины диапазона, затяните регулировочные болты, перемерьте.
6. Верните прокладку, крышку, болт 5,6 Н·м, фиксатор резьбы и контрольные метки.
7. **Мастерите J5 и J6** (часть 4.4). Снятие ремня разрушает связь мотор-сустав для обеих осей, идущих через эту кисть.
8. Тестовый цикл на 10 % переопределения, затем 50 %, затем рабочая скорость.

**Уровень 3 — замена редуктора (≈ 1 день + выдержка, мастерение обязательно, спецоснастка)**

Основание: люфт больше 0,18 мм при правильно натянутом новом ремне; посторонний шум; смазка с металлическими частицами; либо редуктор выработал ресурс.

| № | Действие | Примечания |
|---|---|---|
| 1 | Заказать правильный редуктор для модификации **7L** | кисть длиннорукой версии отличается от стандартной; сверяйте по серийному номеру |
| 2 | Слить/собрать старую смазку и осмотреть её | металлическая пудра подтверждает диагноз — сфотографируйте для рекламации |
| 3 | Снять ремень, мотор и редуктор | съёмник, сепаратор, съёмник стопорных колец по перечню инструмента руководства |
| 4 | Очистить корпус, осмотреть стыки | без вмятин и остатков старого герметика |
| 5 | Установить новый редуктор с **LOCTITE 518** на фланец | руководство предписывает его для посадки редуктора |
| 6 | Вернуть мотор, ремень, натянуть, затянуть всё по моментам | |
| 7 | **Выждать не менее 1 часа** до пуска | герметик должен схватиться — руководство формулирует это прямо |
| 8 | Заново смазать в регламентном объёме | J5 и J6: по **1,8 г (2 мл)**; смазка A98L-0040-0230, комплект A05B-1142-K021, ход поршня 2,5 мм = 1 мл |
| 9 | Отмастерить ось, затем обкатка | сначала медленные циклы, перемерить люфт после 1 ч работы |
| 10 | Записать всё, включая состояние старой детали | это ваши доказательства для рекламации в части 5 |

> WARNING — Никогда не применяйте в этих редукторах смазку **Harmonic Drive SK-3**, хотя это то же семейство: руководство предписывает **4B No.2 (A98L-0040-0230)**. Никогда не превышайте регламентное количество смазки: избыток создаёт давление, выдавливает уплотнения и порождает течь, которую то же руководство велит проверять. Если после смазки давление внутри выросло — стравите его через отверстие подачи смазки.

**Уровень 4 — кабель и кодер (только если уровни 1–3 ничего не объяснили)**

Замените кабель механического блока (руководство ставит его на интервал 4 года / 15360 ч), осмотрите разъём кодера и перепроверьте. Кабельные отказы дают *прерывистые* аварии, связанные с положением руки, а не постоянный люфт — по этому их и отличают.

**План, который вы сдаёте**

| Уровень | Основание | Время | Запчасти | Мастерение |
|---|---|---|---|---|
| 1 | первая попытка, всегда | 45 мин | только LOCTITE | только если руку двигали со снятыми тормозами |
| 2 | натяжение вне диапазона или ремень повреждён | 2–3 ч | ремень A98L-0040-0286#004-157 | **J5 + J6, обязательно** |
| 3 | люфт сохраняется при исправном ремне | 1 день + 1 ч выдержки | редуктор, комплект смазки | **обязательно** |
| 4 | прерывистые аварии, зависящие от положения | 4 ч | кабель механического блока | обычно не требуется |
`,
      },
    },
    {
      id: 'root-cause',
      title: { en: '2.7 Root cause: the missing log entry', ru: '2.7 Первопричина: отсутствующая запись в журнале' },
      body: {
        en: `
A good diagnosis report separates the **technical cause** (a slack belt) from the **organisational cause** (nobody was checking). Fixing only the first one guarantees a repeat in six months.

| Question | Answer for this task |
|---|---|
| What failed? | The J5 wrist timing belt lost tension beyond 15.6 N, creating backlash above the 0.18 mm limit |
| Why did it fail? | Tension decreases slowly in normal use and nobody re-tensioned it |
| Why did nobody notice? | The quarterly belt-condition check was not performed for at least two cycles — 6 months of missing log entries |
| Why was the check not performed? | No scheduled work order, no checklist in the cell, no owner for the task |
| What is the corrective action? | Re-tension/replace + master (technical) **and** introduce the 6-month PPM programme with signed checklists (organisational) — Part 3 |
| What is the preventive action? | Belt tension becomes a *recorded, trending* value; an alarm threshold at 16.5 N triggers work before the limit is reached |

**What the trend should look like once you start recording**

| Check | Running hours | J5 tension (N) | Action |
|---|---|---|---|
| Baseline (after repair) | 0 | 18.1 | record |
| +3 months | 960 | 17.6 | none — normal slow loss |
| +6 months | 1920 | 17.1 | none |
| +9 months | 2880 | 16.6 | watch — approaching the trigger |
| +12 months | 3840 | 16.0 | re-tension to 18 N before it reaches 15.6 |

The manual's own wording — tension slowly decreases with use, which is normal — only becomes a maintenance programme when somebody writes the numbers down. That table is the difference between "the robot broke" and "the robot was maintained".

> TIP — Put the trigger value on the checklist, not just the limit: *"J5 belt tension must read 15.6–20.6 N; raise a work order at ≤ 16.5 N."* Limits tell you when you have already failed; triggers tell you when to act.
`,
        ru: `
Хороший отчёт о диагностике разделяет **техническую причину** (ослабленный ремень) и **организационную** (никто не проверял). Устранение только первой гарантирует повтор через полгода.

| Вопрос | Ответ для этой задачи |
|---|---|
| Что отказало? | Зубчатый ремень кисти J5 потерял натяжение ниже 15,6 Н, создав люфт выше предела 0,18 мм |
| Почему отказало? | Натяжение медленно снижается в нормальной эксплуатации, и его никто не восстанавливал |
| Почему никто не заметил? | Квартальная проверка состояния ремней не выполнялась минимум два цикла — 6 месяцев без записей в журнале |
| Почему проверка не выполнялась? | Не было планового задания, чек-листа в ячейке и ответственного |
| Корректирующее действие? | Натянуть/заменить + мастерить (техническое) **и** ввести программу ППР на 6 месяцев с подписываемыми чек-листами (организационное) — часть 3 |
| Предупреждающее действие? | Натяжение ремня становится *записываемой и анализируемой* величиной; порог 16,5 Н запускает работу до достижения предела |

**Как должен выглядеть тренд, когда вы начнёте записывать**

| Проверка | Наработка, ч | Натяжение J5, Н | Действие |
|---|---|---|---|
| База (после ремонта) | 0 | 18,1 | записать |
| +3 месяца | 960 | 17,6 | нет — нормальная медленная потеря |
| +6 месяцев | 1920 | 17,1 | нет |
| +9 месяцев | 2880 | 16,6 | следить — подходим к порогу |
| +12 месяцев | 3840 | 16,0 | натянуть до 18 Н, пока не дошли до 15,6 |

Формулировка самого руководства — натяжение медленно снижается в процессе работы, и это нормально — превращается в программу обслуживания только тогда, когда кто-то записывает числа. Эта таблица и есть разница между «робот сломался» и «робот обслуживался».

> TIP — Пишите в чек-листе пороговое значение, а не только предел: *«Натяжение ремня J5 должно быть 15,6–20,6 Н; при ≤ 16,5 Н открыть заявку на работу»*. Предел сообщает, что вы уже отказали; порог сообщает, когда действовать.
`,
      },
    },
    {
      id: 'verification',
      title: { en: '2.8 Verification after the repair', ru: '2.8 Проверка после ремонта' },
      body: {
        en: `
Do not hand the cell back to production on the strength of a good tension reading. Verify in four stages, and record each.

| Stage | Test | Pass criterion |
|---|---|---|
| 1 · Static | Nudge the wrist by hand at the measured point | no perceptible movement; gauge ≤ 0.18 mm at 180 mm |
| 2 · No-load motion | T1, 10 % override, jog J5 through its full ±125° range and back, three times | smooth, no noise, no alarm, no drift in the displayed position when returning to a mark |
| 3 · Accuracy | Jog to a fixed point, mark it, move away and return three times | returns to the same point within the repeatability spec (±0.01 mm) |
| 4 · Production | Run the palletizing cycle for one full pallet at 50 %, then 100 % | all 192 bricks placed on pattern, zero INTP-106, zero servo alarms |

**Then, in the simulation** — reproduce the whole story so the report is not just prose. In the Visual Components layout from Part 1, add a joint-position offset of 0.3° to J5 inside the place routine and watch layers 5–8 drift off the pattern; then set the offset to 0 and watch it disappear. Export both runs as video and statistics. A reviewer who sees the drift cannot argue with your diagnosis.

**Finally, the paperwork**

1. Service log entry: date, hours, what was measured, what was replaced, who did it, next due date.
2. Attach the tension record sheet ([download](assets/dl/belt-tension-record.csv)) and the backlash readings.
3. If the belt or reducer failed inside the warranty period → the claim act in Part 5.2, with the photographs of the old part.
4. Update the PPM schedule in Part 3 with the new "next due" dates, counted from today, not from the last (missing) check.
`,
        ru: `
Не возвращайте ячейку в производство на основании одного хорошего показания натяжения. Проверьте в четыре этапа и запишите каждый.

| Этап | Проверка | Критерий приёмки |
|---|---|---|
| 1 · Статика | Попробуйте сдвинуть кисть рукой в точке измерения | ощутимого движения нет; индикатор ≤ 0,18 мм на 180 мм |
| 2 · Холостое движение | T1, переопределение 10 %, прокрутите J5 трижды через весь диапазон ±125° и обратно | плавно, без шума и аварий, без дрейфа отображаемого положения при возврате к метке |
| 3 · Точность | Наведите в фиксированную точку, отметьте, отведите и верните трижды | возврат в ту же точку в пределах повторяемости (±0,01 мм) |
| 4 · Производство | Прогоните цикл паллетирования на одну полную паллету при 50 %, затем 100 % | все 192 кирпича встали по схеме, ноль INTP-106, ноль аварий привода |

**Затем — в симуляции**: воспроизведите всю историю, чтобы отчёт не был только текстом. В макете Visual Components из части 1 добавьте смещение положения J5 на 0,3° внутри подпрограммы укладки и посмотрите, как слои 5–8 уезжают со схемы; затем поставьте смещение 0 и посмотрите, как оно исчезает. Экспортируйте оба прогона как видео и статистику. Рецензент, увидевший увод, не сможет спорить с вашим диагнозом.

**И наконец — бумаги**

1. Запись в журнале обслуживания: дата, наработка, что измерено, что заменено, кто делал, дата следующей проверки.
2. Приложите бланк измерения натяжения ([скачать](assets/dl/belt-tension-record.csv)) и показания люфта.
3. Если ремень или редуктор отказали в гарантийный период → акт-рекламация из части 5.2 с фотографиями старой детали.
4. Обновите график ППР из части 3 новыми датами «следующая проверка», считая их от сегодняшнего дня, а не от прошлой (отсутствующей) проверки.
`,
      },
    },
  ],
};
