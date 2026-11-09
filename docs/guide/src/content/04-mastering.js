export const part4 = {
  id: 'mastering',
  num: '4',
  title: { en: 'Emergency: mastering lost during a battery change', ru: 'Аварийная ситуация: мастерение потеряно при замене батареи' },
  sub: {
    en: 'Task section 3. What was lost, how to make the robot safe, and the three recovery routes: Quick Master from SYSMAST.SV, Single Axis Mastering by witness marks, and Zero Position Mastering.',
    ru: 'Раздел 3 задания. Что именно потеряно, как обеспечить безопасность и три пути восстановления: Quick Master из SYSMAST.SV, мастерение одной оси по контрольным меткам и Zero Position Mastering.',
  },
  sections: [
    {
      id: 'incident',
      title: { en: '4.0 What happened, minute by minute', ru: '4.0 Что произошло, поминутно' },
      body: {
        en: `
> TASK — The scenario: while the battery was being replaced, the power to the controller was lost. The robot will no longer run. Mastering is lost.

Reconstruct the timeline honestly in the report — it makes the root cause obvious and the lesson unarguable.

| Time | Event | Consequence |
|---|---|---|
| T+0 | Cycle finished, arm parked, cell stopped | normal |
| T+1 min | Technician opens the battery compartment in the robot base | — |
| T+2 min | **The APC battery connector is unplugged** | the absolute pulse coder loses its reference supply |
| T+2 min | Plant power dips / the disconnect is opened / somebody presses E-stop and cycles the panel | the coder has neither battery nor mains-derived supply |
| T+2 min 30 s | The new battery is connected | too late — the absolute position counts were being held in volatile memory backed only by that battery |
| T+3 min | Power restored, controller starts | **SRVO-062 BZAL** appears, or the position counts are invalid |
| T+4 min | Operator tries to start the program | refused; joint positions no longer correspond to the mastering reference |
| T+5 min | Alarm history read | pulse coder data lost → mastering data invalid → **all taught points are unusable** |

**What is actually lost**

| Item | Lost? | Why |
|---|---|---|
| TP programs | **No** | they live in SRAM/flash, kept alive by the *controller* battery |
| Position registers, numeric registers | **No** | same |
| System variables | **No** | same |
| Tool frames and user frames | **No** | they are numbers in variables |
| **Mastering data (the joint reference counts)** | **YES** | the absolute pulse coder's counts were maintained by the APC battery |
| The relationship between motor counts and physical joint angles | **YES** | that is what mastering *is* |
| Therefore: every taught point in every program | effectively **YES** | the points are stored as joint counts relative to the mastering reference; with the reference gone they point somewhere else |

> NOTE — This is why the procedure in Part 3.4 insists on **power ON** for the robot APC battery. It is not a formality. With the controller powered, the servo amplifier keeps the coder supplied while you swap cells, and nothing is lost. With the power off, the battery is the only thing holding 20 years of position history, and unplugging it is the same as erasing the robot's memory of where it is.

**Symptoms you will see on the pendant**

| Alarm | Text | Meaning here |
|---|---|---|
| **SRVO-062** | BZAL alarm (Group i) | the APC battery was disconnected with the power off → absolute data lost |
| **SRVO-038** | Pulse mismatch (Group i Axis j) | the pulse coder count disagrees with the stored mastering count |
| **SRVO-075** | Pulse coder data abnormal | the coder lost its multi-turn data |
| **MOTN-049 / MOTN-xxx** | motion aborted | attempting to run with invalid mastering |
| joint position display | shows values that do not match the arm's physical pose | the smoking gun |

**Do this before anything else**

1. Press **E-stop**. The robot is in an unknown state; do not let it move under program control.
2. **Do not run any program.** Do not press FWD. Do not jog in AUTO.
3. Photograph the arm's pose and the joint position screen **as found**. This is evidence for the report and it may help you recognise the pose later.
4. Check whether the arm is in a position where gravity will move it if a brake releases. If yes, **mechanically support it** before touching any setting.
5. Confirm the new battery is correctly fitted and the connector latched — a half-seated connector will lose the data again during the recovery.
6. Find out whether a backup exists. Look for \`SYSMAST.SV\` on the USB stick in the cabinet, in the plant file store, and in the FANUC service records. **The answer decides which route you take.**
`,
        ru: `
> TASK — Сценарий: во время замены батареи питание контроллера пропало. Робот больше не запускается. Мастерение потеряно.

Честно восстановите хронологию в отчёте — она делает первопричину очевидной, а урок неоспоримым.

| Время | Событие | Последствие |
|---|---|---|
| T+0 | Цикл завершён, рука поставлена, ячейка остановлена | штатно |
| T+1 мин | Техник открыл батарейный отсек в основании робота | — |
| T+2 мин | **Разъём батареи APC отключён** | абсолютный импульсный кодер лишился опорного питания |
| T+2 мин | Просадка питания на заводе / открыт разъединитель / кто-то нажал аварийный останов и перещёлкнул панель | у кодера нет ни батареи, ни питания от сети |
| T+2 мин 30 с | Подключена новая батарея | поздно — счётчики абсолютного положения удерживались в энергозависимой памяти, питавшейся только от этой батареи |
| T+3 мин | Питание восстановлено, контроллер стартовал | появилась **SRVO-062 BZAL** либо счётчики положения недостоверны |
| T+4 мин | Оператор пытается запустить программу | отказ; положения осей больше не соответствуют опорным данным мастерения |
| T+5 мин | Прочитана история аварий | данные импульсного кодера потеряны → данные мастерения недействительны → **все обученные точки непригодны** |

**Что именно потеряно**

| Элемент | Потерян? | Почему |
|---|---|---|
| TP-программы | **Нет** | живут в SRAM/flash, их поддерживает батарея *контроллера* |
| Позиционные и числовые регистры | **Нет** | то же |
| Системные переменные | **Нет** | то же |
| Кадровые системы инструмента и пользователя | **Нет** | это числа в переменных |
| **Данные мастерения (опорные счётчики суставов)** | **ДА** | счётчики абсолютного кодера удерживались батареей APC |
| Связь между счётчиками мотора и физическими углами суставов | **ДА** | это и есть мастерение |
| Следовательно: все обученные точки во всех программах | фактически **ДА** | точки хранятся как счётчики суставов относительно опоры мастерения; без опоры они ведут в другое место |

> NOTE — Именно поэтому процедура в части 3.4 настаивает на питании **ВКЛ** при замене батареи APC робота. Это не формальность. При запитанном контроллере усилитель привода продолжает питать кодер, пока вы меняете элементы, и ничего не теряется. При выключенном питании батарея — единственное, что держит всю историю положений, и отключить её равносильно стиранию памяти робота о том, где он находится.

**Симптомы, которые вы увидите на пульте**

| Авария | Текст | Смысл в нашем случае |
|---|---|---|
| **SRVO-062** | BZAL alarm (Group i) | батарея APC была отключена при выключенном питании → абсолютные данные потеряны |
| **SRVO-038** | Pulse mismatch (Group i Axis j) | счётчик импульсного кодера расходится с сохранённым опорным счётчиком |
| **SRVO-075** | Pulse coder data abnormal | кодер потерял данные многооборотного счёта |
| **MOTN-049 / MOTN-xxx** | движение прервано | попытка работы при недействительном мастерении |
| индикация положений осей | значения не соответствуют физической позе руки | главный признак |

**Сделайте это раньше всего остального**

1. Нажмите **аварийный останов**. Робот в неизвестном состоянии; не давайте ему двигаться под управлением программы.
2. **Не запускайте программ.** Не нажимайте FWD. Не перемещайте в AUTO.
3. Сфотографируйте позу руки и экран положений осей **как есть**. Это доказательство для отчёта, и это может помочь позже опознать позу.
4. Проверьте, не в таком ли положении рука, что гравитация сдвинет её при снятии тормоза. Если да — **механически подоприте её** до любых настроек.
5. Убедитесь, что новая батарея установлена правильно и разъём зафиксирован: полусевший разъём снова потеряет данные уже в процессе восстановления.
6. Выясните, есть ли резервная копия. Ищите \`SYSMAST.SV\` на флешке в шкафу, в файловом хранилище завода и в сервисных записях FANUC. **Ответ определяет маршрут.**
`,
      },
    },
    {
      id: 'what-is-mastering',
      title: { en: '4.1 What mastering is, and the six ways to do it', ru: '4.1 Что такое мастерение и шесть способов его выполнить' },
      body: {
        en: `
![Mastering methods](assets/diagram/mastering-tree.svg "Decision tree of the six mastering methods against what you have available: a SYSMAST.SV backup, a stored Quick Master reference, witness marks, or a fixture.")

Every FANUC robot stores its taught points as **pulse counts of each motor**, not as coordinates. Mastering is the operation that tells the controller *"this physical pose corresponds to count zero"*. Once that anchor is set, every stored count becomes a meaningful position again.

**The zero position**

The reference posture for the LR Mate 200iD is the **zero position**: every axis at 0°. Each axis has **witness marks** — a machined line, notch or pair of arrows on the casting and on the moving part. When the marks on all six axes are aligned, the robot is mechanically at zero, and that is where the mastering reference lives.

![Witness marks](assets/media/mastering-marks.jpg "Aligned witness marks on a robot wrist. When the two lines form one continuous line, that axis is mechanically at its reference position.")

**The six methods**

| Method | Needs | Restores | Typical use | Time |
|---|---|---|---|---|
| **Fixture Position Master** | a dedicated fixture or a specially machined reference point | all axes | highest accuracy; used at manufacture and after major repair | 1–2 h |
| **Zero Position Master** | witness marks on all axes, all brakes releasable | all axes | the universal fallback when nothing is backed up | 1–2 h |
| **Quick Master** | a previously stored Quick Master reference **and** \`SYSMAST.SV\` (or the reference still in SRAM) | all axes at once | the fast recovery after a battery loss | 15–20 min |
| **Quick Master for Single Axis** | the stored reference for that axis | one axis | after single-axis work | 10 min |
| **Single Axis Master** | witness marks for that axis only | one axis | after belt, motor or reducer work on J5 | 20–30 min |
| **Set Quick Master Ref** | a correctly mastered robot | nothing — it *stores* the current state as the reference for future Quick Masters | prevention, done after every successful mastering | 2 min |
| **Calibrate** | valid mastering data | writes the mastered values into the system | the final step of most procedures | 1 min |

> WARNING — **Quick Master is impossible** if the pulse coder has been replaced, or if the mastering data itself is lost and no \`SYSMAST.SV\` backup exists. In those cases you must use Fixture Position Master or Zero Position Master. This is stated in the operator's manual, and it is the branch point of the decision tree above.

**Screen navigation used by every method**

~~~text
MENU  →  0 NEXT  →  6 SYSTEM  →  F1 [TYPE]  →  Master/Cal
~~~

If the Master/Cal items are greyed out or missing, the master-enable switch is off:

~~~text
MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Variables
   $MASTER_ENB          = 1        ← must be 1 to master
   $DMR_GRP[1].$MASTER_DONE        ← TRUE when the group is mastered
   $DMR_GRP[1].$REF_DONE           ← TRUE when the quick-master reference is stored
   $DMR_GRP[1].$MASTER_COUN[1..6]  ← the mastered counts per axis
~~~

Set \`$MASTER_ENB = 1\` using <kbd>F5 ASGN</kbd> or ENTER, as your software version requires, then return to Master/Cal.

> NOTE — Menu wording and soft-key labels differ slightly between R-30iB, R-30iB Mate and R-30iB Plus software versions. The *names* of the operations (ZERO POSITION MASTER, QUICK MASTER, SET QUICK MASTER REF, CALIBRATE, SINGLE AXIS MASTER) are stable across versions; the numbers in front of them are not. Read the screen, do not memorise the digits.
`,
        ru: `
![Способы мастерения](assets/diagram/mastering-tree.svg "Дерево решений: шесть способов мастерения против того, что у вас есть — копия SYSMAST.SV, сохранённая опора Quick Master, контрольные метки или оснастка.")

Каждый робот FANUC хранит обученные точки как **счётчики импульсов каждого мотора**, а не как координаты. Мастерение — это операция, сообщающая контроллеру: *«эта физическая поза соответствует нулевому счётчику»*. Как только опора установлена, каждый сохранённый счётчик снова становится осмысленным положением.

**Нулевая позиция**

Опорная поза LR Mate 200iD — **нулевая позиция**: все оси по 0°. На каждой оси есть **контрольные метки** — обработанная риска, паз или пара стрелок на корпусе и на движущейся части. Когда метки всех шести осей совмещены, робот механически в нуле, и именно там живёт опора мастерения.

![Контрольные метки](assets/media/mastering-marks.jpg "Совмещённые контрольные метки на кисти робота. Когда две риски образуют одну непрерывную линию, ось находится в механически опорном положении.")

**Шесть способов**

| Способ | Требует | Восстанавливает | Типичное применение | Время |
|---|---|---|---|---|
| **Fixture Position Master** | специальная оснастка или обработанная опорная точка | все оси | наивысшая точность; применяется на производстве и после капитального ремонта | 1–2 ч |
| **Zero Position Master** | метки на всех осях, все тормоза снимаются | все оси | универсальный запасной путь, когда ничего не сохранено | 1–2 ч |
| **Quick Master** | заранее сохранённая опора Quick Master **и** \`SYSMAST.SV\` (либо опора ещё в SRAM) | все оси сразу | быстрое восстановление после потери батареи | 15–20 мин |
| **Quick Master for Single Axis** | сохранённая опора для этой оси | одну ось | после работ по одной оси | 10 мин |
| **Single Axis Master** | метки только этой оси | одну ось | после работ с ремнём, мотором или редуктором J5 | 20–30 мин |
| **Set Quick Master Ref** | корректно отмастеренный робот | ничего — *сохраняет* текущее состояние как опору для будущих Quick Master | профилактика; выполняется после каждого успешного мастерения | 2 мин |
| **Calibrate** | действительные данные мастерения | записывает отмастеренные значения в систему | финальный шаг большинства процедур | 1 мин |

> WARNING — **Quick Master невозможен**, если импульсный кодер заменён либо утрачены сами данные мастерения и нет копии \`SYSMAST.SV\`. Тогда остаются Fixture Position Master или Zero Position Master. Это прямо сказано в руководстве оператора, и это точка ветвления дерева решений выше.

**Навигация по экранам, общая для всех способов**

~~~text
MENU  →  0 NEXT  →  6 SYSTEM  →  F1 [TYPE]  →  Master/Cal
~~~

Если пункты Master/Cal недоступны или отсутствуют, выключен флаг разрешения мастерения:

~~~text
MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Variables
   $MASTER_ENB          = 1        ← должен быть 1 для мастерения
   $DMR_GRP[1].$MASTER_DONE        ← TRUE, когда группа отмастерена
   $DMR_GRP[1].$REF_DONE           ← TRUE, когда опора quick master сохранена
   $DMR_GRP[1].$MASTER_COUN[1..6]  ← опорные счётчики по осям
~~~

Установите \`$MASTER_ENB = 1\` (клавишей <kbd>F5 ASGN</kbd> или ENTER, как требует версия ПО) и вернитесь в Master/Cal.

> NOTE — Формулировки меню и подписи программных клавиш немного различаются между версиями ПО R-30iB, R-30iB Mate и R-30iB Plus. *Названия* операций (ZERO POSITION MASTER, QUICK MASTER, SET QUICK MASTER REF, CALIBRATE, SINGLE AXIS MASTER) между версиями стабильны; цифры перед ними — нет. Читайте экран, а не заучивайте номера.
`,
      },
    },
    {
      id: 'quick-master',
      title: { en: '4.2 Route 1 — Quick Master from the SYSMAST.SV backup', ru: '4.2 Маршрут 1 — Quick Master из копии SYSMAST.SV' },
      body: {
        en: `
**Use this route when a backup of the mastering data exists.** It is the fastest recovery (15–20 minutes) and it restores the exact reference the robot was commissioned with, so every taught point is valid again without re-teaching.

> TASK — This is the procedure the assignment asks for by name: *"restore the zero position using Quick Master with the SYSMAST.SV backup."*

**Prerequisites — check all four before you start**

| # | Prerequisite | How to check |
|---|---|---|
| 1 | A \`SYSMAST.SV\` file exists that belongs to **this** robot | file name/date, and the robot serial number in your backup readme |
| 2 | The pulse coder was **not** replaced | maintenance records; Quick Master is impossible after a coder swap |
| 3 | The arm can be moved to the reference pose | brakes releasable, arm supportable |
| 4 | \`$MASTER_ENB = 1\` | System Variables screen |

**Step 1 — restore the mastering file**

1. Insert the USB stick containing \`SYSMAST.SV\` into the controller's USB port.
2. <kbd>MENU</kbd> → **FILE** → <kbd>UTIL</kbd> → **Set Device** → **USB** (shown as \`UD1:\`).
3. <kbd>DIR</kbd> to list the files; navigate to the backup folder.
4. Select \`SYSMAST.SV\`, then <kbd>LOAD</kbd> (on some versions <kbd>RESTORE</kbd>) → confirm **YES**.
5. The controller reports the file loaded. **Do not** power off yet.

**Step 2 — Quick Master**

6. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
7. Select **QUICK MASTER (SEL AXIS)** — or simply **QUICK MASTER** for all axes at once. Confirm **YES** when asked.
8. The controller restores the mastering counts from the reference data for the selected axes. \`$DMR_GRP[1].$MASTER_DONE\` becomes **TRUE**.
9. Select **CALIBRATE** and confirm **YES**. This writes the restored values into the system and updates the internal position data. Some versions require a power cycle here — if the screen says so, do a **cold start** (hold <kbd>PREV</kbd> + <kbd>NEXT</kbd> while powering on → **3 Controlled start**).

**Step 3 — verify**

10. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**: check the mastering status shows all axes done.
11. Check \`$DMR_GRP[1].$MASTER_DONE = TRUE\`.
12. Jog the robot in **T1**, override ≤ 10 %, deadman held, to the **zero position** and compare each joint against the witness marks. All six must align simultaneously.
13. Jog to a taught point from the palletizing program (e.g. the pick position) and check the gripper sits where it should relative to the belt.
14. Reset alarms; run one cycle at 10 %, then 50 %, then 100 %.

**Step 4 — close the loop**

15. <kbd>Master/Cal</kbd> → **SET QUICK MASTER REF** → **YES**. This stores the present, verified state as the new reference, so the *next* battery incident is a 5-minute job instead of a 20-minute one.
16. Take a fresh full backup including the new \`SYSMAST.SV\`.
17. Write the record: [mastering-record.md](assets/dl/mastering-record.md).

> TIP — If Quick Master completes but SRVO-038 (pulse mismatch) still appears on one axis, that axis's counts moved — usually because the arm was jogged or fell while unpowered. Handle that axis with Route 2 (single axis) and then re-run CALIBRATE. Do not force it: a mismatched axis silently shifts every point in every program by a constant offset.
`,
        ru: `
**Этот маршрут применяют, когда существует копия данных мастерения.** Это самое быстрое восстановление (15–20 минут), и оно возвращает ровно ту опору, с которой робот был пущен в эксплуатацию, поэтому все обученные точки снова действительны без переобучения.

> TASK — Именно эту процедуру задание называет по имени: *«восстановить нулевое положение с помощью Quick Master, используя резервную копию SYSMAST.SV»*.

**Предусловия — проверьте все четыре до начала**

| № | Условие | Как проверить |
|---|---|---|
| 1 | Существует файл \`SYSMAST.SV\`, принадлежащий **этому** роботу | имя/дата файла и серийный номер робота в readme вашей копии |
| 2 | Импульсный кодер **не** заменялся | записи обслуживания; после замены кодера Quick Master невозможен |
| 3 | Руку можно вывести в опорную позу | тормоза снимаются, руку можно подпереть |
| 4 | \`$MASTER_ENB = 1\` | экран системных переменных |

**Шаг 1 — восстановите файл мастерения**

1. Вставьте флешку с \`SYSMAST.SV\` в USB-порт контроллера.
2. <kbd>MENU</kbd> → **FILE** → <kbd>UTIL</kbd> → **Set Device** → **USB** (отображается как \`UD1:\`).
3. <kbd>DIR</kbd> — список файлов; перейдите в папку копии.
4. Выберите \`SYSMAST.SV\`, затем <kbd>LOAD</kbd> (в некоторых версиях <kbd>RESTORE</kbd>) → подтвердите **YES**.
5. Контроллер сообщит о загрузке файла. **Не** выключайте питание.

**Шаг 2 — Quick Master**

6. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
7. Выберите **QUICK MASTER (SEL AXIS)** — либо просто **QUICK MASTER** для всех осей сразу. Подтвердите **YES**.
8. Контроллер восстановит опорные счётчики по выбранным осям из данных опоры. \`$DMR_GRP[1].$MASTER_DONE\` станет **TRUE**.
9. Выберите **CALIBRATE** и подтвердите **YES**. Это запишет восстановленные значения в систему и обновит внутренние данные положения. Некоторые версии требуют здесь выключить и включить питание — если экран это говорит, выполните **cold start** (держите <kbd>PREV</kbd> + <kbd>NEXT</kbd> при включении → **3 Controlled start**).

**Шаг 3 — проверка**

10. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**: статус мастерения должен показывать все оси выполненными.
11. Проверьте \`$DMR_GRP[1].$MASTER_DONE = TRUE\`.
12. Переместите робота в **T1**, переопределение ≤ 10 %, deadman удерживается, в **нулевую позицию** и сравните каждую ось с контрольными метками. Все шесть должны совпасть одновременно.
13. Перейдите в обученную точку программы паллетирования (например, позицию съёма) и проверьте, что захват встаёт туда, где нужно относительно ленты.
14. Сбросьте аварии; прогоните один цикл на 10 %, затем 50 %, затем 100 %.

**Шаг 4 — замыкание цикла**

15. <kbd>Master/Cal</kbd> → **SET QUICK MASTER REF** → **YES**. Это сохранит нынешнее, проверенное состояние как новую опору, и следующий инцидент с батареей займёт 5 минут вместо 20.
16. Сделайте свежую полную копию, включая новый \`SYSMAST.SV\`.
17. Заполните бланк: [mastering-record.md](assets/dl/mastering-record.md).

> TIP — Если Quick Master завершился, но SRVO-038 (рассогласование импульсов) всё равно появляется по одной оси, значит счётчики этой оси сдвинулись: обычно потому, что руку двигали вручную либо она упала без питания. Отработайте эту ось по маршруту 2 (одна ось) и снова выполните CALIBRATE. Не продавливайте: рассогласованная ось молча смещает каждую точку каждой программы на постоянную величину.
`,
      },
    },
    {
      id: 'single-axis',
      title: { en: '4.3 Route 2 — Single Axis Mastering by witness marks', ru: '4.3 Маршрут 2 — мастерение одной оси по контрольным меткам' },
      body: {
        en: `
**Use this route when there is no backup, or when only one axis lost its reference** — which is exactly the situation after a J5 belt replacement (Part 2.6 level 2), where the manual requires mastering **J5 and J6**.

> TASK — The assignment's fallback: *"if there is no backup file, perform Single Axis Mastering using the witness marks on the robot body."*

**Before you touch anything**

| # | Rule | Why |
|---|---|---|
| 1 | Support the axis mechanically | you are going to release its brake; an unsupported arm falls and can injure or damage itself |
| 2 | Nobody else at the pendant, cell barricaded | a jog command from anyone else during mastering destroys the result |
| 3 | Mode **T1**, override ≤ 10 %, deadman held | the only safe way to move an unmastered robot |
| 4 | \`$MASTER_ENB = 1\` | otherwise the Master/Cal items are hidden |
| 5 | Know the mastering position value for the axis | for the witness-mark reference it is normally **0** |

**Releasing the brakes (only if the axis will not move)**

If the servo is not enabled, the brake holds the axis and you cannot jog it to the marks. The manual's method:

~~~text
MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Variables
   $PARAM_GROUP.$SV_OFF_ALL   = FALSE     (release all brakes)
   $PARAM_GROUP.$SV_OFF_ENB[1..n] = FALSE (release selected brake)
then CYCLE POWER  (FCTN → 1 START (COLD) is not needed; a normal power cycle is)
~~~

With the brake released the axis is **free**: it must be held by a support, a sling, or a second person, and moved only by hand. Restore the variables to TRUE and power cycle again when the mastering is complete.

**The Single Axis Master procedure**

1. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
2. Select **SINGLE AXIS MASTER** (or **QUICK MASTER (SEL AXIS)** and choose single-axis mode, depending on the software version). The screen shows a list of axes with columns **SEL**, **ST**, **MSTR POS**, **POSN ERR**.
3. Set **SEL = 1** on the axis to master — for the belt job that is **J5**.
4. Move J5 until the **witness marks align exactly**. Use a mirror and a torch; parallax will fool you at 0.1 mm. On the LR Mate 200iD the wrist marks are on the J5 housing and the J6 flange carrier.
5. Enter **MSTR POS** = the mastering position for this reference — normally **0**.
6. Press <kbd>F5 EXEC</kbd> (labelled **SET** on some versions) → confirm. The controller records the present count as the reference for J5. **ST** changes from 0 to **2** (done).
7. Set **SEL back to 0** for that axis so it is not re-mastered by accident.
8. Repeat steps 3–7 for **J6** — mandatory after any J5 belt work, because both axes run through the same wrist.
9. Select **CALIBRATE** → **YES** to write the values into the system.
10. Power cycle if the screen requires it.
11. Restore the brake-release variables to TRUE and power cycle again.
12. Verify: jog to zero position, all marks aligned; check \`$DMR_GRP[1].$MASTER_DONE = TRUE\`; check the joint position display matches the physical pose.

**The other five axes, if they were lost too**

If the whole group lost its mastering (a dead APC battery does that), do all six axes one at a time in the same way, **or** use Route 3 (Zero Position Master) which aligns all six at once. Single-axis is preferable when you know only one or two axes moved, because it does not disturb the others.

| Axis | Witness mark location on the LR Mate 200iD | Reference value |
|---|---|---|
| J1 | base housing ↔ J1 rotating column | 0 |
| J2 | base/column ↔ lower arm | 0 |
| J3 | lower arm ↔ upper arm | 0 |
| J4 | upper arm ↔ J4 wrist housing | 0 |
| **J5** | **wrist housing ↔ J5 output carrier** | **0** |
| J6 | J5 carrier ↔ flange | 0 |

> WARNING — Never master an axis while the arm is hanging freely and unsupported, and never master from a position you cannot see clearly. If you cannot align the marks within the width of the scribed line, the axis is not at zero and every point in every program will carry that error forever.
`,
        ru: `
**Этот маршрут применяют, когда копии нет либо опору потеряла только одна ось** — ровно та ситуация после замены ремня J5 (часть 2.6, уровень 2), где руководство требует мастерения **J5 и J6**.

> TASK — Запасной вариант из задания: *«если файла резервной копии нет, выполнить Single Axis Mastering по контрольным меткам на корпусе робота»*.

**До того как что-либо трогать**

| № | Правило | Почему |
|---|---|---|
| 1 | Механически подпереть ось | вы собираетесь снять её тормоз; неподпертая рука падает и может травмировать или повредить себя |
| 2 | У пульта больше никого, ячейка огорожена | команда перемещения от постороннего во время мастерения уничтожает результат |
| 3 | Режим **T1**, переопределение ≤ 10 %, deadman удерживается | единственный безопасный способ двигать не отмастеренного робота |
| 4 | \`$MASTER_ENB = 1\` | иначе пункты Master/Cal скрыты |
| 5 | Знать значение опорной позиции для оси | для опоры по меткам это обычно **0** |

**Снятие тормозов (только если ось не двигается)**

Если привод не включён, тормоз держит ось и навести её на метки нельзя. Метод из руководства:

~~~text
MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Variables
   $PARAM_GROUP.$SV_OFF_ALL   = FALSE     (снять все тормоза)
   $PARAM_GROUP.$SV_OFF_ENB[1..n] = FALSE (снять выбранный тормоз)
затем CYCLE POWER  (обычное перещёлкивание питания; FCTN → 1 START (COLD) не нужен)
~~~

Со снятым тормозом ось **свободна**: её должна удерживать опора, строп или второй человек, а перемещать можно только вручную. По завершении мастерения верните переменным TRUE и снова перещёлкните питание.

**Процедура Single Axis Master**

1. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
2. Выберите **SINGLE AXIS MASTER** (либо **QUICK MASTER (SEL AXIS)** с выбором режима одной оси — зависит от версии ПО). Экран показывает список осей с колонками **SEL**, **ST**, **MSTR POS**, **POSN ERR**.
3. Поставьте **SEL = 1** на оси, которую мастерите, — для работ с ремнём это **J5**.
4. Перемещайте J5 до **точного совмещения контрольных меток**. Возьмите зеркальце и фонарик: параллакс обманет вас на 0,1 мм. У LR Mate 200iD метки кисти находятся на корпусе J5 и на держателе фланца J6.
5. Введите **MSTR POS** = опорную позицию для этой метки — обычно **0**.
6. Нажмите <kbd>F5 EXEC</kbd> (в некоторых версиях **SET**) → подтвердите. Контроллер запишет текущий счётчик как опору для J5. **ST** изменится с 0 на **2** (выполнено).
7. Верните **SEL в 0** для этой оси, чтобы случайно не отмастерить её повторно.
8. Повторите шаги 3–7 для **J6** — обязательно после любых работ с ремнём J5, поскольку обе оси идут через ту же кисть.
9. Выберите **CALIBRATE** → **YES**, чтобы записать значения в систему.
10. Перещёлкните питание, если экран этого требует.
11. Верните переменные снятия тормозов в TRUE и снова перещёлкните питание.
12. Проверьте: наведение в нулевую позицию — все метки совмещены; \`$DMR_GRP[1].$MASTER_DONE = TRUE\`; индикация положений осей соответствует физической позе.

**Остальные пять осей, если они тоже потеряны**

Если мастерение потеряла вся группа (севшая батарея APC делает именно это), отмастерите все шесть осей по одной тем же способом **либо** используйте маршрут 3 (Zero Position Master), который совмещает все шесть сразу. Поосевой способ предпочтителен, когда вы точно знаете, что сдвинулись одна-две оси, потому что он не трогает остальные.

| Ось | Где находятся метки у LR Mate 200iD | Опорное значение |
|---|---|---|
| J1 | корпус основания ↔ вращающаяся колонна J1 | 0 |
| J2 | основание/колонна ↔ нижняя рука | 0 |
| J3 | нижняя рука ↔ верхняя рука | 0 |
| J4 | верхняя рука ↔ корпус кисти J4 | 0 |
| **J5** | **корпус кисти ↔ выходной держатель J5** | **0** |
| J6 | держатель J5 ↔ фланец | 0 |

> WARNING — Никогда не мастерите ось, пока рука висит свободно без опоры, и никогда не мастерите из положения, которое плохо видно. Если метки не совмещаются в пределах ширины риски, ось не в нуле — и каждая точка каждой программы будет нести эту ошибку навсегда.
`,
      },
    },
    {
      id: 'zero-position',
      title: { en: '4.4 Route 3 — Zero Position Mastering (no backup at all)', ru: '4.4 Маршрут 3 — Zero Position Mastering (копии нет вообще)' },
      body: {
        en: `
This is the worst case: no \`SYSMAST.SV\`, no stored Quick Master reference, all six axes lost. It is also completely recoverable — it just takes longer and afterwards you must **re-verify every taught point**.

**Procedure**

1. Support the whole arm: a stand under the forearm and one under the wrist, or a sling from a hoist taking the weight. You will be releasing all brakes.
2. Barricade the cell, put the pendant in **T1**, override ≤ 10 %.
3. Set \`$MASTER_ENB = 1\` in System Variables.
4. Release the brakes if the axes will not move (variables in 4.3), power cycle, and **move each axis by hand** so that **all six witness marks align simultaneously**. This is the zero position — all joints at 0°.
5. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal** → **ZERO POSITION MASTER** → confirm **YES**.
6. Select **CALIBRATE** → **YES**, and power cycle if required.
7. \`$DMR_GRP[1].$MASTER_DONE\` becomes TRUE for the group.
8. **Set Quick Master Ref** so the next incident is fast.
9. Re-torque and lock everything you released; restore the brake variables.

**Then the expensive part: re-verifying the taught points**

Zero Position Mastering restores the mechanical reference, but any points taught against a slightly different reference will now be offset. For a palletizing cell:

| Point | How to verify |
|---|---|
| HOME | jog there, confirm the arm is clear of the fence, the stack and the belt |
| Pick approach / pick / retract | put a brick on the belt by hand, run at 10 %, watch the cups land centred on the bed face |
| Place positions, layer 1 | run empty (no brick) and check the cup face is centred over the first slot |
| Place positions, layer 8 | the critical one — check clearance over the finished stack |
| Pallet exchange points | run the shuttle through a full swap at 10 % |
| Via points and safe paths | check nothing passes within 50 mm of the fence |

Run one complete pallet at 10 % override, then 50 %, then production speed, watching the placement of every layer. If a constant offset appears on all points, your zero position was not exactly zero — redo step 4 more carefully rather than editing 192 positions.

> TIP — Photograph the aligned witness marks after a successful mastering and keep the photo with the backup. If the marks are ever damaged or painted over during a repair, that photo is the only record of what "correct" looked like.

**Accuracy note for the report**

Zero Position Mastering is the manual's own fallback and is entirely legitimate, but its accuracy depends on how precisely a human can align a scribed line. Realistically you land within a few hundredths of a degree. That is well inside the robot's ±0.01 mm repeatability *budget* at the wrist for this application — a 0.05° error at 911 mm reach is about 0.8 mm at the brick, and your 10 mm joint clearance absorbs it. Say this explicitly in the report: it shows you understand that mastering restores a *reference*, not *calibration*.
`,
        ru: `
Это худший случай: нет ни \`SYSMAST.SV\`, ни сохранённой опоры Quick Master, потеряны все шесть осей. Восстановимо и это — просто дольше, и затем придётся **перепроверить каждую обученную точку**.

**Процедура**

1. Подоприте всю руку: стойка под предплечье и под кисть либо строп с талью, снимающий вес. Вы будете снимать все тормоза.
2. Огородите ячейку, пульт в **T1**, переопределение ≤ 10 %.
3. Установите \`$MASTER_ENB = 1\` в системных переменных.
4. Снимите тормоза, если оси не двигаются (переменные в 4.3), перещёлкните питание и **вручную выведите каждую ось** так, чтобы **все шесть меток совместились одновременно**. Это нулевая позиция — все суставы по 0°.
5. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal** → **ZERO POSITION MASTER** → подтвердите **YES**.
6. Выберите **CALIBRATE** → **YES** и перещёлкните питание, если требуется.
7. \`$DMR_GRP[1].$MASTER_DONE\` становится TRUE для группы.
8. Выполните **Set Quick Master Ref**, чтобы следующий инцидент прошёл быстро.
9. Затяните и зафиксируйте всё, что отпускали; верните переменные тормозов.

**Затем дорогая часть: перепроверка обученных точек**

Zero Position Mastering восстанавливает механическую опору, но точки, обученные относительно немного другой опоры, окажутся смещены. Для ячейки паллетирования:

| Точка | Как проверить |
|---|---|
| HOME | навестись, убедиться, что рука не задевает ограждение, штабель и ленту |
| Подвод / съём / отход | положите кирпич на ленту вручную, прогоните на 10 %, смотрите, чтобы присоски сели по центру постели |
| Позиции укладки, слой 1 | прогоните вхолостую (без кирпича) и проверьте центровку плоскости присосок над первым слотом |
| Позиции укладки, слой 8 | критичная точка — проверьте зазор над готовым штабелем |
| Точки обмена паллет | прогоните челнок через полный обмен на 10 % |
| Промежуточные точки и безопасные пути | проверьте, что нигде нет прохода ближе 50 мм к ограждению |

Прогоните одну полную паллету на 10 % переопределения, затем 50 %, затем на рабочей скорости, следя за укладкой каждого слоя. Если постоянное смещение проявляется во всех точках — ваш ноль не был точно нулём; аккуратнее переделайте шаг 4, а не правьте 192 позиции.

> TIP — Сфотографируйте совмещённые метки после успешного мастерения и храните снимок вместе с резервной копией. Если метки когда-нибудь повредят или закрасят при ремонте, эта фотография останется единственным свидетельством того, как выглядело «правильно».

**Замечание о точности для отчёта**

Zero Position Mastering — собственный запасной путь руководства, вполне законный, но его точность зависит от того, насколько точно человек способен совместить риску. Реально вы попадаете в пределы нескольких сотых градуса. Это хорошо внутри *бюджета* повторяемости робота ±0,01 мм для данной задачи: ошибка 0,05° при вылете 911 мм даёт около 0,8 мм на кирпиче, а ваш зазор в стыке 10 мм её поглощает. Скажите это в отчёте прямо: так видно, что вы понимаете — мастерение восстанавливает *опору*, а не *калибровку*.
`,
      },
    },
    {
      id: 'srvo038',
      title: { en: '4.5 SRVO-038 pulse mismatch and RES_PCA', ru: '4.5 SRVO-038 рассогласование импульсов и RES_PCA' },
      body: {
        en: `
This is the alarm you will most likely meet *after* the recovery above, or on its own after a battery that went flat overnight. It says the pulse coder's count no longer agrees with the stored mastering count for that axis.

**Recovery sequence**

1. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
2. Select **RES_PCA** (reset pulse coder, <kbd>F3</kbd> on most versions) for the affected group → confirm **YES**.
3. Power cycle the controller.
4. For each axis reported as lost: jog it through **at least one full motor revolution** so the coder re-establishes its multi-turn count.
5. Bring the arm to the reference pose and verify the **witness marks** align.
6. Set \`$DMR_GRP[1].$MASTER_DONE = TRUE\` if the screen requires it, or perform **CALIBRATE**.
7. Power cycle again, clear the alarm, and verify in **T1** at low override.

> NOTE — RES_PCA throws away the pulse counts, which means the axis **must** be re-mastered afterwards. Never run RES_PCA and then simply reset the alarm and start production: the robot will run, and every point will be wrong by a constant amount. That is how cells get "mysteriously" re-taught by the next shift.

**Related alarms and what they mean**

| Alarm | Meaning | First action |
|---|---|---|
| SRVO-038 pulse mismatch | counts disagree with mastering | RES_PCA → re-master the axis |
| SRVO-062 BZAL | APC battery was lost with power off | replace the battery correctly (power ON), then re-master |
| SRVO-063 BZALH | battery voltage high/abnormal | check the battery and its connector |
| SRVO-075 pulse coder data abnormal | coder data corrupt | re-master; if it repeats, the coder or its cable is faulty |
| SRVO-199 control axis off | drive inhibited | check the E-stop chain, the door interlock and the external axis enable |
| MOTN-049 / MOTN-023 | motion aborted, position error too large | re-master, then re-verify the taught points |
| SYST-035 battery voltage low | controller SRAM battery | replace within 30 minutes of power-off (Part 3.4 B) |

**If the mismatch comes back after a correct mastering**

Then it is not a mastering problem — it is mechanical or electrical, and you are back in Part 2:

- a slipping belt (measure the tension again);
- a worn reducer (measure the backlash again);
- a damaged coder cable at the wrist flex (inspect, wiggle test);
- a failing pulse coder (replace — and then only Fixture or Zero Position Mastering will work, because Quick Master is impossible after a coder replacement).
`,
        ru: `
Именно эту аварию вы, скорее всего, встретите *после* описанного выше восстановления либо самостоятельно — после батареи, севшей за ночь. Она говорит, что счётчик импульсного кодера больше не согласуется с сохранённым опорным счётчиком этой оси.

**Последовательность восстановления**

1. <kbd>MENU</kbd> → **0 NEXT** → **6 SYSTEM** → <kbd>F1 [TYPE]</kbd> → **Master/Cal**.
2. Выберите **RES_PCA** (сброс импульсного кодера, <kbd>F3</kbd> в большинстве версий) для пострадавшей группы → подтвердите **YES**.
3. Перещёлкните питание контроллера.
4. Для каждой отмеченной как потерянная оси прокрутите её **минимум на один полный оборот мотора**, чтобы кодер восстановил многооборотный счёт.
5. Выведите руку в опорную позу и проверьте совмещение **контрольных меток**.
6. Установите \`$DMR_GRP[1].$MASTER_DONE = TRUE\`, если экран этого требует, либо выполните **CALIBRATE**.
7. Снова перещёлкните питание, снимите аварию и проверьте в **T1** на низком переопределении.

> NOTE — RES_PCA выбрасывает счётчики импульсов, значит ось **обязательно** надо заново отмастерить. Никогда не выполняйте RES_PCA с последующим простым сбросом аварии и пуском в производство: робот поедет, и каждая точка будет ошибочна на постоянную величину. Именно так ячейки «загадочным образом» переобучает следующая смена.

**Смежные аварии и их смысл**

| Авария | Смысл | Первое действие |
|---|---|---|
| SRVO-038 рассогласование импульсов | счётчики расходятся с мастерением | RES_PCA → заново отмастерить ось |
| SRVO-062 BZAL | батарея APC потеряна при выключенном питании | заменить батарею правильно (питание ВКЛ), затем заново отмастерить |
| SRVO-063 BZALH | напряжение батареи выше нормы/аномальное | проверить батарею и её разъём |
| SRVO-075 ошибка данных импульсного кодера | данные кодера повреждены | заново отмастерить; если повторяется — неисправен кодер или его кабель |
| SRVO-199 ось управления отключена | привод заблокирован | проверить цепь аварийного останова, блокировку двери и внешнее разрешение осей |
| MOTN-049 / MOTN-023 | движение прервано, ошибка положения слишком велика | заново отмастерить, затем перепроверить обученные точки |
| SYST-035 низкое напряжение батареи | батарея SRAM контроллера | заменить в течение 30 минут после выключения (часть 3.4 B) |

**Если рассогласование возвращается после правильного мастерения**

Значит проблема не в мастерении, а в механике или электрике — и вы снова в части 2:

- проскальзывающий ремень (перемерьте натяжение);
- изношенный редуктор (перемерьте люфт);
- повреждённый кабель кодера на изгибе кисти (осмотр, тест на шевеление);
- умирающий импульсный кодер (замена — и после неё работают только Fixture или Zero Position Mastering, потому что Quick Master после замены кодера невозможен).
`,
      },
    },
    {
      id: 'verification',
      title: { en: '4.6 Verification and return to production', ru: '4.6 Проверка и возврат в производство' },
      body: {
        en: `
Mastering is finished when it is **verified**, not when the screen stops complaining.

| # | Check | Method | Pass criterion |
|---|---|---|---|
| 1 | Mastering status | Master/Cal screen | all axes show mastered / ST = 2 |
| 2 | \`$DMR_GRP[1].$MASTER_DONE\` | System Variables | TRUE |
| 3 | Zero position | jog to zero in T1 | all six witness marks aligned simultaneously |
| 4 | No alarms | alarm log cleared, controller restarted | clean start, no SRVO/MOTN entries |
| 5 | Position display vs physical pose | read J1–J6, compare with the arm | consistent |
| 6 | Tool frame | jog to TOOL[17], move in X | the cup face moves along its own axis, not sideways |
| 7 | Repeatability spot check | move to a taught point, away, and back, three times | returns to the same place; ±0.01 mm spec |
| 8 | Empty cycle | run the palletizing program with no product | all motions reach their points, no MOTN alarm |
| 9 | Loaded cycle at 10 % | one full pallet | every brick placed on pattern, no drops |
| 10 | Production speed | 50 % then 100 % for one pallet | cycle time within 10 % of the commissioning value |

**Paperwork to complete before the cell is handed back**

1. Mastering record ([template](assets/dl/mastering-record.md)): date, reason, method used, axes mastered, who performed it, verification results.
2. Incident report: what happened, the timeline from 4.0, what was lost, what it cost in downtime.
3. Fresh full backup: ALL_OF_ABOVE + SYSMAST.SV, stored in two places.
4. **Set Quick Master Ref** confirmed done.
5. Update the PPM log: next battery date, next quarterly date.
6. Corrective action: the "battery replacement with power ON" rule is now printed on the cell wall and on the checklist, and the battery compartment carries a label with the last replacement date.

> DANGER — Never return a re-mastered robot to full-speed production without the loaded cycle at 10 % first. The failure mode of a badly mastered wrist is not an alarm — it is a 4 kg brick released at the wrong moment 1.5 m above a pallet, inside a fence that a technician may be about to open.
`,
        ru: `
Мастерение завершено, когда оно **проверено**, а не когда экран перестал жаловаться.

| № | Проверка | Метод | Критерий |
|---|---|---|---|
| 1 | Статус мастерения | экран Master/Cal | все оси отмастерены / ST = 2 |
| 2 | \`$DMR_GRP[1].$MASTER_DONE\` | системные переменные | TRUE |
| 3 | Нулевая позиция | наведение в ноль в T1 | все шесть меток совмещены одновременно |
| 4 | Нет аварий | журнал очищен, контроллер перезапущен | чистый пуск, без записей SRVO/MOTN |
| 5 | Индикация положений против физической позы | прочитать J1–J6, сравнить с рукой | согласованы |
| 6 | Кадр инструмента | навестись в TOOL[17], двинуть по X | плоскость присосок движется вдоль своей оси, а не вбок |
| 7 | Контроль повторяемости | в обученную точку, отвод и возврат трижды | возврат в то же место; спецификация ±0,01 мм |
| 8 | Холостой цикл | прогнать программу паллетирования без продукта | все движения доходят до точек, аварий MOTN нет |
| 9 | Цикл под нагрузкой на 10 % | одна полная паллета | каждый кирпич по схеме, без падений |
| 10 | Рабочая скорость | 50 %, затем 100 % на одну паллету | время цикла в пределах 10 % от пусконаладочного |

**Бумаги, которые надо закрыть до возврата ячейки**

1. Бланк мастерения ([шаблон](assets/dl/mastering-record.md)): дата, причина, применённый способ, отмастеренные оси, исполнитель, результаты проверки.
2. Отчёт об инциденте: что случилось, хронология из 4.0, что потеряно, во сколько обошёлся простой.
3. Свежая полная копия: ALL_OF_ABOVE + SYSMAST.SV, в двух местах.
4. Подтверждённое выполнение **Set Quick Master Ref**.
5. Обновление журнала ППР: следующая дата замены батареи, следующая квартальная проверка.
6. Корректирующее действие: правило «замена батареи при ВКЛ питании» теперь напечатано на стене ячейки и в чек-листе, а батарейный отсек несёт наклейку с датой последней замены.

> DANGER — Никогда не возвращайте заново отмастеренного робота на полную скорость без цикла под нагрузкой на 10 %. Режим отказа плохо отмастеренной кисти — это не авария, а кирпич массой 4 кг, отпущенный не в тот момент на высоте 1,5 м над паллетой, внутри ограждения, калитку которого техник вот-вот откроет.
`,
      },
    },
    {
      id: 'prevention',
      title: { en: '4.7 Prevention: making this incident impossible', ru: '4.7 Профилактика: как сделать этот инцидент невозможным' },
      body: {
        en: `
| # | Measure | Cost | Effect |
|---|---|---|---|
| 1 | **Replace the APC battery with the power ON**, E-stop pressed | 0 | eliminates the failure mode entirely — the rule the task asks about |
| 2 | Battery age label on the compartment + a due date in the PPM calendar | 0 | the battery is never allowed to die in service |
| 3 | Quarterly battery voltage check (controller 3.1–3.3 VDC) | 0 | catches SYST-035 before it becomes a dead SRAM |
| 4 | \`SET QUICK MASTER REF\` after every successful mastering | 2 min | makes the next recovery 5 minutes instead of 2 hours |
| 5 | Monthly backup of ALL_OF_ABOVE + SYSMAST.SV, two locations | 30 min | route 1 is always available |
| 6 | Annual restore test into a spare controller or a simulation | 2 h | proves the backup is not corrupt |
| 7 | Printed procedure laminated inside the cabinet door | 0 | the person doing the swap at 2 a.m. reads it |
| 8 | Two spare battery kits on site | ~cost of two kits | no improvisation, no waiting for a courier |
| 9 | Photographed witness marks filed with the backup | 0 | the reference survives even if the marks are painted over |
| 10 | Permit-to-work for battery and mastering tasks | 0 | nobody starts this job alone and unprepared |

**The one-page rule for the cell wall**

~~~text
BATTERY REPLACEMENT — ROBOT BASE (APC)
  1  Finish the cycle. Park the arm in the zero position.
  2  Press E-STOP.  DO NOT SWITCH OFF THE CONTROLLER.
  3  Barricade the cell. Tag it.
  4  New battery unpacked and in your hand BEFORE you unplug the old one.
  5  Swap in under 10 seconds. Check polarity. Latch the connector.
  6  Release E-STOP. Look for SRVO-062. There must be none.
  7  Write the date on the label and in the log. Next due: +12 months.

  IF THE POWER WAS OFF AT ANY POINT  →  mastering is lost  →  Part 4.2 / 4.3
~~~

> TIP — Add the same rule to the Visual Components layout as a note on the controller cabinet component, and put the laminated card in the report appendix as a photograph. Reviewers reward the artefacts that would survive contact with a real factory floor.
`,
        ru: `
| № | Мера | Стоимость | Эффект |
|---|---|---|---|
| 1 | **Менять батарею APC при ВКЛЮЧЁННОМ питании**, с нажатым аварийным остановом | 0 | полностью устраняет этот вид отказа — то самое правило из задания |
| 2 | Наклейка с возрастом батареи на отсеке + дата в календаре ППР | 0 | батарее не дают умереть в эксплуатации |
| 3 | Ежеквартальная проверка напряжения батареи (контроллер 3,1–3,3 В) | 0 | ловит SYST-035 до того, как SRAM окажется мёртвой |
| 4 | \`SET QUICK MASTER REF\` после каждого успешного мастерения | 2 мин | следующее восстановление — 5 минут вместо 2 часов |
| 5 | Ежемесячная копия ALL_OF_ABOVE + SYSMAST.SV в двух местах | 30 мин | маршрут 1 доступен всегда |
| 6 | Ежегодный тест восстановления на запасном контроллере или в симуляции | 2 ч | доказывает, что копия не повреждена |
| 7 | Заламинированная процедура на внутренней стороне дверцы шкафа | 0 | её прочитает тот, кто меняет батарею в 2 часа ночи |
| 8 | Два запасных батарейных комплекта на площадке | цена двух комплектов | никакой импровизации и ожидания курьера |
| 9 | Фотографии контрольных меток, подшитые к резервной копии | 0 | опора сохранится, даже если метки закрасят |
| 10 | Наряд-допуск на работы с батареей и мастерением | 0 | никто не начинает эту работу в одиночку и неподготовленным |

**Правило на одну страницу — повесить на стену ячейки**

~~~text
ЗАМЕНА БАТАРЕИ — ОСНОВАНИЕ РОБОТА (APC)
  1  Завершить цикл. Поставить руку в нулевую позицию.
  2  Нажать АВАРИЙНЫЙ ОСТАНОВ.  КОНТРОЛЛЕР НЕ ВЫКЛЮЧАТЬ.
  3  Огородить ячейку. Повесить бирку.
  4  Новая батарея распакована и в руке ДО отключения старой.
  5  Замена менее чем за 10 секунд. Проверить полярность. Зафиксировать разъём.
  6  Снять аварийный останов. Искать SRVO-062. Её быть не должно.
  7  Вписать дату на наклейку и в журнал. Следующая замена: +12 месяцев.

  ЕСЛИ ПИТАНИЕ БЫЛО ВЫКЛЮЧЕНО ХОТЯ БЫ НА МГНОВЕНИЕ  →  мастерение потеряно  →  части 4.2 / 4.3
~~~

> TIP — Добавьте то же правило в макет Visual Components как примечание к компоненту шкафа контроллера, а заламинированную карточку вложите в приложение к отчёту фотографией. Рецензенты ценят артефакты, которые выдержат контакт с реальным цехом.
`,
      },
    },
    {
      id: 'simulation',
      title: { en: '4.8 Modelling the incident in Visual Components', ru: '4.8 Моделирование инцидента в Visual Components' },
      body: {
        en: `
Your report will be much stronger if the simulation shows the consequence of a lost master position, not just the healthy cell. Two cheap experiments in the Part 1 layout:

**Experiment 1 — the offset**

1. In the place routine (or the Python script from Part 1.12), add a constant angular offset to J5 of 0.3°.
2. Run one full pallet.
3. Measure the placement error at layer 1 and layer 8 and export the chart.

| Layer | Height above pallet (mm) | Expected lateral error at 0.3° of wrist error |
|---|---|---|
| 1 | 32.5 | small — the error is mostly angular, the arm is folded |
| 4 | 227.5 | visible |
| 8 | 487.5 | largest — the stack visibly leans or the bricks overhang |

**Experiment 2 — the recovery**

1. Model the maintenance visit: create a **human resource** (Models by Type › Resources › Characters) that walks to the cabinet, and a **machine** or a simple signal-driven component that represents "cell down for maintenance".
2. Drive it with a signal: \`SO_MaintenanceActive\` = TRUE stops the infeed and the robot.
3. Run three scenarios and compare the total output of an 8-hour shift:

| Scenario | Downtime modelled | Output over 8 h |
|---|---|---|
| No maintenance programme, 1 × INTP-106 per week at 35 min | 35 min | 4 550 bricks |
| Maintenance programme in place, 12 h of planned downtime over 6 months (≈ 10 min/shift) | 10 min | 4 830 bricks |
| Battery swapped with power off, mastering lost, 4 h recovery | 240 min | 3 400 bricks |

The third row is the number that justifies the entire Part 3 and Part 4 to a production manager, and you produced it with a layout you already built.

> NOTE — Keep the simulation experiments clearly labelled as *illustrative*: the 0.3° offset is a teaching device, not a measured value from your robot. Reviewers accept simplification; they do not accept a simplification presented as a measurement.
`,
        ru: `
Отчёт станет гораздо сильнее, если симуляция покажет последствие потерянной опорной позиции, а не только здоровую ячейку. Два недорогих эксперимента в макете из части 1:

**Эксперимент 1 — смещение**

1. В подпрограмме укладки (или в скрипте Python из части 1.12) добавьте постоянный угловой сдвиг J5 на 0,3°.
2. Прогоните одну полную паллету.
3. Измерьте ошибку укладки на слое 1 и слое 8 и экспортируйте график.

| Слой | Высота над паллетой, мм | Ожидаемая боковая ошибка при 0,3° ошибки кисти |
|---|---|---|
| 1 | 32,5 | мала — ошибка в основном угловая, рука сложена |
| 4 | 227,5 | заметна |
| 8 | 487,5 | наибольшая — штабель заметно кренится либо кирпичи свисают |

**Эксперимент 2 — восстановление**

1. Смоделируйте визит обслуживания: создайте **человеческий ресурс** (Models by Type › Resources › Characters), который подходит к шкафу, и **станок** или простой компонент на сигналах, представляющий «ячейка на обслуживании».
2. Управляйте это сигналом: \`SO_MaintenanceActive\` = TRUE останавливает входной поток и робота.
3. Прогоните три сценария и сравните суммарный выпуск за восьмичасовую смену:

| Сценарий | Смоделированный простой | Выпуск за 8 ч |
|---|---|---|
| Нет программы обслуживания, 1 × INTP-106 в неделю по 35 мин | 35 мин | 4 550 кирпичей |
| Программа обслуживания есть, 12 ч планового простоя за 6 месяцев (≈ 10 мин/смена) | 10 мин | 4 830 кирпичей |
| Батарея заменена при выключенном питании, мастерение потеряно, 4 ч восстановления | 240 мин | 3 400 кирпичей |

Третья строка — это то число, которое оправдывает всю часть 3 и часть 4 перед начальником производства, и получено оно на макете, который вы уже построили.

> NOTE — Чётко помечайте эксперименты в симуляции как *иллюстративные*: сдвиг 0,3° — учебный приём, а не измеренная величина вашего робота. Рецензенты принимают упрощение; они не принимают упрощение, выданное за измерение.
`,
      },
    },
  ],
};
