export const part6 = {
  id: 'sources',
  num: '6',
  title: { en: 'Sources, document numbers and traceability', ru: 'Источники, номера документов и прослеживаемость' },
  sub: {
    en: 'Every manual, lesson and standard used in this guide, what was taken from it, and a table that maps each number in the text back to its source.',
    ru: 'Все руководства, уроки и стандарты, использованные в этом руководстве, что из них взято, и таблица, возвращающая каждое число текста к его источнику.',
  },
  sections: [
    {
      id: 'how-to-verify',
      title: { en: '6.0 How to verify anything in this guide', ru: '6.0 Как проверить что угодно в этом руководстве' },
      body: {
        en: `
This guide was assembled from official documentation, and it is written so that every claim can be checked. Three rules were applied:

1. **A number is only printed if it appears in a manufacturer document.** Where a value could not be confirmed, the text says so explicitly instead of guessing.
2. **A procedure is quoted, not remembered.** Menu paths, screen names and variable names are reproduced as they appear in the manuals for the stated software version, with a note where wording varies between versions.
3. **Secondary sources are labelled.** Field write-ups, forum posts and reseller pages were used only to locate the right manual section or to cross-check a screen path — never as the authority for a specification value.

**How to check a value yourself**

| If the guide says | Verify it in |
|---|---|
| a belt tension, span length or belt part number | Maintenance Manual **B-83495EN**, chapter 6 (§6.1 belt tension adjustment) |
| a backlash limit | Maintenance Manual **B-83495EN**, Table 3.3(b) |
| a periodic inspection interval or a running-hours figure | Operator's Manual **B-83494EN** §7.1.2, and Maintenance Manual **B-83495EN** §1 + Appendix C |
| a battery part number or lifetime | Operator's Manual **B-83494EN** §7.3.1; R-30iB Plus Controller Maintenance Manual **B-83525EN** §8.11.1 |
| grease type, kit part number or quantity per axis | Maintenance Manual **B-83495EN** §2.2 |
| a mastering procedure, variable or screen | Operator's Manual **B-83494EN**, chapter 8 |
| an alarm text or remedy | R-30iB Plus **Error Code Manual** (INTP, SRVO, MOTN, SYST groups) |
| mounting dimensions, loads, stopping distances, maintenance clearances | Operator's Manual **B-83494EN**, §1.2–§1.4 |
| a Visual Components property, statement or workflow | the VC 4.8 online help, the VC Academy lesson named in the section, or the component's own property panel |

> NOTE — Document **revisions** matter. The manuals quoted here are the revisions that were available at the time of writing (B-83494EN/10, B-83495EN/01, B-83284EN/10). Your controller's software version may correspond to a different revision; when in doubt, the value printed on the machine's own nameplate and the manual supplied with it take precedence over anything in a guide.
`,
        ru: `
Это руководство собрано по официальной документации и написано так, чтобы каждое утверждение можно было проверить. Применены три правила:

1. **Число печатается, только если оно есть в документе изготовителя.** Там, где значение подтвердить не удалось, текст говорит об этом прямо, а не угадывает.
2. **Процедура цитируется, а не вспоминается.** Пути по меню, названия экранов и переменных воспроизведены так, как они выглядят в руководствах для указанной версии ПО, с оговоркой там, где формулировки между версиями различаются.
3. **Вторичные источники помечены.** Полевые описания, сообщения на форумах и страницы дилеров использовались только чтобы найти нужный раздел руководства или сверить путь по экранам — никогда как авторитет для нормативного значения.

**Как проверить значение самостоятельно**

| Если в руководстве сказано | Проверяйте в |
|---|---|
| натяжение ремня, длина ветви или номер ремня | Maintenance Manual **B-83495EN**, глава 6 (§6.1 регулировка натяжения ремня) |
| предел люфта | Maintenance Manual **B-83495EN**, таблица 3.3(b) |
| интервал периодического осмотра или наработка в часах | Operator's Manual **B-83494EN** §7.1.2 и Maintenance Manual **B-83495EN** §1 + приложение C |
| номер или ресурс батареи | Operator's Manual **B-83494EN** §7.3.1; R-30iB Plus Controller Maintenance Manual **B-83525EN** §8.11.1 |
| тип смазки, номер комплекта или объём на ось | Maintenance Manual **B-83495EN** §2.2 |
| процедура мастерения, переменная или экран | Operator's Manual **B-83494EN**, глава 8 |
| текст аварии или remedy | **Справочник кодов ошибок** R-30iB Plus (группы INTP, SRVO, MOTN, SYST) |
| монтажные размеры, нагрузки, тормозной путь, зоны обслуживания | Operator's Manual **B-83494EN**, §1.2–§1.4 |
| свойство, утверждение или процесс Visual Components | онлайн-справка VC 4.8, урок VC Academy, названный в разделе, либо панель свойств самого компонента |

> NOTE — **Ревизии** документов имеют значение. Здесь процитированы ревизии, доступные на момент написания (B-83494EN/10, B-83495EN/01, B-83284EN/10). Вашей версии ПО контроллера может соответствовать другая ревизия; при сомнении значение с таблички самой машины и поставленное с ней руководство имеют приоритет над любым пособием.
`,
      },
    },
    {
      id: 'fanuc-docs',
      title: { en: '6.1 FANUC documents used', ru: '6.1 Использованные документы FANUC' },
      body: {
        en: `
| Document | Title | Revision | What this guide took from it |
|---|---|---|---|
| **B-83494EN** | LR Mate 200iD / 200iD/7L **Operator's Manual** | /10 | §1.2 installation, base dimensions, flatness ≤ 0.5 mm and inclination ≤ 0.5°; §1.2.1 mounting-angle setting (PREV+NEXT controlled start → MAINTENANCE → F4 MANUAL); §1.3 maintenance clearance (500 mm around, 705 mm above for the 7L); §1.4 installation conditions; §2 cable connection warnings and the earth-before-power rule; force and moment tables; stopping time and distance tables; §7.1.2 periodic inspection; §7.2.1 oil seepage; §7.3.1 batteries; §7.3.2 grease; chapter 8 mastering methods, zero position, witness marks, \`$MASTER_ENB\`, brake-release variables |
| **B-83495EN** | LR Mate 200iD **Maintenance Manual** | /01 | §1 periodic inspection items and intervals; §2.2 greasing procedure, grease and kit part numbers, quantities per axis; Table 3.3(b) backlash limits; chapter 5 mechanical-unit cable (4-year interval); §6.1 belt tension adjustment — tensionmeter part number, measurement pose, J5/J6 and J1/J2 parameters, belt part number; Appendix A spare parts; Appendix C running-hours basis |
| **B-83284EN** | R-30iB Plus **Basic Operator's Manual** | /10 | power on/off, controlled start (PREV+NEXT → 3 Controlled start), CYCLE POWER via FCTN, panel indicator meanings |
| **B-83525EN** | R-30iB (Mate) Plus **Controller Maintenance Manual** | /01–/08 | §8.11.1 battery replacement, SYST-035, battery part numbers, the 30-minute rule, ventilation cleaning |
| **Error Code Manual** (R-30iB Plus) | Alarm texts and remedies | — | **INTP-106** text and remedy, SRVO-038, SRVO-062 BZAL, SRVO-075, SRVO-199, SYST-035, MOTN group |
| **B-80687EN** | FANUC Robot **Safety Handbook** | — | general safety principles referenced in Part 1.9 |
| **B-83184EN** | **Dual Check Safety** Operator's Manual (R-30iB Plus) | — | safety-function context referenced in Part 1.9 |
| PalletTool documentation (option) | Palletizing software option | — | referenced in Part 1.11 as the production alternative to hand-written pattern loops |

**Robot specification values used in this guide**

| Parameter | Value | Source |
|---|---|---|
| Axes | 6 | B-83494EN, specifications |
| Payload | 7 kg | B-83494EN |
| Reach (7L / standard) | 911 mm / 717 mm | B-83494EN |
| Repeatability | ±0.01 mm | FANUC published specification |
| Mass | 27 kg | B-83494EN |
| Protection | IP67 (IP69K option) | B-83494EN |
| Power consumption | 0.5 kW | B-83494EN |
| Mounting | floor, angle, inverted | B-83494EN §1.2 |
| Joint ranges J1–J6 | 340 (360) / 245 / 430 / 380 / 250 / 720 ° | B-83494EN |
| Max speeds J1–J6 | 370 / 310 / 410 / 550 / 545 / 1000 °/s | B-83494EN (7L) |
| Wrist allowable moment J4/J5 | 16.6 N·m | B-83494EN |
| Wrist allowable inertia J4/J5 | 0.47 kg·m² | B-83494EN |
| Wrist allowable moment J6 | 9.4 N·m | B-83494EN |
| Wrist allowable inertia J6 | 0.15 kg·m² | B-83494EN |
| Base fixing | 190 × 190 mm, 4 × Ø11 | B-83494EN §1.2 |

> SOURCE — Access points used to consult these documents: the LR Mate 200iD operator's manual copy published at robochallenge.pl (B-83494EN/10), the maintenance manual copy at img1.wsimg.com (B-83495EN/01), the full-text HTML mirror at manualmachine.com, and the R-30iB Plus basic operator's manual copy at robochallenge.pl (B-83284EN/10). Order official copies through your FANUC representative for the revisions matching your controller software.
`,
        ru: `
| Документ | Название | Ревизия | Что взяло из него это руководство |
|---|---|---|---|
| **B-83494EN** | LR Mate 200iD / 200iD/7L, **Operator's Manual** | /10 | §1.2 установка, размеры основания, плоскостность ≤ 0,5 мм и наклон ≤ 0,5°; §1.2.1 установка угла монтажа (PREV+NEXT controlled start → MAINTENANCE → F4 MANUAL); §1.3 зона обслуживания (500 мм вокруг, 705 мм над роботом для 7L); §1.4 условия установки; §2 предупреждения о подключении кабелей и правило заземления до включения; таблицы сил и моментов; таблицы времени и пути торможения; §7.1.2 периодические осмотры; §7.2.1 течь масла; §7.3.1 батареи; §7.3.2 смазка; глава 8 — способы мастерения, нулевая позиция, контрольные метки, \`$MASTER_ENB\`, переменные снятия тормозов |
| **B-83495EN** | LR Mate 200iD, **Maintenance Manual** | /01 | §1 пункты и интервалы периодических осмотров; §2.2 процедура смазки, номера смазки и комплекта, объёмы по осям; таблица 3.3(b) пределы люфта; глава 5 кабель механического блока (интервал 4 года); §6.1 регулировка натяжения ремня — номер тензометра, поза измерения, параметры J5/J6 и J1/J2, номер ремня; приложение A запасные части; приложение C база по часам наработки |
| **B-83284EN** | R-30iB Plus, **Basic Operator's Manual** | /10 | включение/выключение питания, управляемый пуск (PREV+NEXT → 3 Controlled start), CYCLE POWER через FCTN, значения индикаторов панели |
| **B-83525EN** | R-30iB (Mate) Plus, **Controller Maintenance Manual** | /01–/08 | §8.11.1 замена батареи, SYST-035, номера батарей, правило 30 минут, очистка вентиляции |
| **Справочник кодов ошибок** (R-30iB Plus) | Тексты аварий и remedy | — | текст и remedy **INTP-106**, SRVO-038, SRVO-062 BZAL, SRVO-075, SRVO-199, SYST-035, группа MOTN |
| **B-80687EN** | FANUC Robot **Safety Handbook** | — | общие принципы безопасности, на которые ссылается часть 1.9 |
| **B-83184EN** | **Dual Check Safety**, Operator's Manual (R-30iB Plus) | — | контекст функций безопасности в части 1.9 |
| Документация PalletTool (опция) | ПО для паллетирования | — | упоминается в части 1.11 как производственная альтернатива самописным циклам схемы |

**Значения характеристик робота, использованные в руководстве**

| Параметр | Значение | Источник |
|---|---|---|
| Число осей | 6 | B-83494EN, спецификации |
| Грузоподъёмность | 7 кг | B-83494EN |
| Вылет (7L / стандарт) | 911 мм / 717 мм | B-83494EN |
| Повторяемость | ±0,01 мм | публикуемая спецификация FANUC |
| Масса | 27 кг | B-83494EN |
| Степень защиты | IP67 (опция IP69K) | B-83494EN |
| Потребляемая мощность | 0,5 кВт | B-83494EN |
| Монтаж | пол, под углом, перевёрнутый | B-83494EN §1.2 |
| Диапазоны осей J1–J6 | 340 (360) / 245 / 430 / 380 / 250 / 720 ° | B-83494EN |
| Макс. скорости J1–J6 | 370 / 310 / 410 / 550 / 545 / 1000 °/с | B-83494EN (7L) |
| Допустимый момент в кисти J4/J5 | 16,6 Н·м | B-83494EN |
| Допустимый момент инерции J4/J5 | 0,47 кг·м² | B-83494EN |
| Допустимый момент в кисти J6 | 9,4 Н·м | B-83494EN |
| Допустимый момент инерции J6 | 0,15 кг·м² | B-83494EN |
| Крепление основания | 190 × 190 мм, 4 × Ø11 | B-83494EN §1.2 |

> SOURCE — Точки доступа, через которые эти документы просматривались: копия operator's manual LR Mate 200iD на robochallenge.pl (B-83494EN/10), копия maintenance manual на img1.wsimg.com (B-83495EN/01), полнотекстовое HTML-зеркало manualmachine.com и копия R-30iB Plus basic operator's manual на robochallenge.pl (B-83284EN/10). Официальные копии заказывайте у представителя FANUC — ревизии, соответствующие ПО вашего контроллера.
`,
      },
    },
    {
      id: 'vc-docs',
      title: { en: '6.2 Visual Components documents used', ru: '6.2 Использованные документы Visual Components' },
      body: {
        en: `
| Source | Version tag | What this guide took from it |
|---|---|---|
| **Visual Components 4.8 online help** — [help.visualcomponents.com/4.8](https://help.visualcomponents.com/4.8) | 4.8 | ribbon structure, Process Modelling components, Program tab statements, OLP export, Python API |
| **VC 4.8 release notes / What's New** | 4.8, released 2023-06-10; 4.8.0.1 January 2024 | version facts quoted in Part 0: robotics OLP merged onto the PROGRAM tab, Via Solver in all product versions, Program Validation conveyor synchronisation and the linear 180° check, CAD translator versions |
| **VC Academy — "Pick And Place Components" manual** ([PDF, 15-02-2023](https://academy.visualcomponents.com/app/uploads/2023/02/pick-and-place-components-manual-15-02-2023.pdf)) | 4.6+ | the whole of Part 1.7 and 1.8: Pick And Place Process behaviour, sensor positions, ProcessType/ProductsOn/StopAt, transport controller LinkDefaults, TcpIndex, approach motions, gripper signals, the double-gripper multi-pick configuration, and the rule that these components must be renamed rather than edited |
| **VC Academy — "Introduction to Layout Configuration"** ([PDF, PM v2](https://academy.visualcomponents.com/app/uploads/2025-05-introduction-to-layout-configuration_pm_v2.pdf)) | 4.10 (names apply to 4.8) | ribbon and eCatalog navigation, Product Type Editor fields, the feeder → process → flow workflow used in Part 1.2–1.3 |
| **VC Academy — "Palletize using PM TransportPatternIn statement"** | 4.8.0+ | Route B in Part 0/1: TransportPatternIn + Attach/Detach as the alternative to assemblies |
| **VC Academy — "Robot Transport Controller manual"** | 5.0+ | transport controller structure; used with care, since the page describes a newer version than 4.8 |
| **VC Academy — "Palletizing robot programming"** | 4.9.0+ | palletizing programming patterns; noted in Part 1.11 as a version difference |
| **VC Academy — "MachineTending-1"** ([PDF, 2017-01](https://academy.visualcomponents.com/app/uploads/2017/01/MachineTending-1.pdf)) | 4.x | Shape Feeder → CollarPallet, Pallet Filler, XYZ pattern with Z_Count — the origin of the pattern approach in Part 1.6 |
| **VC training module 3 — "Create a Robot Program"** | 4.x | PROGRAM tab workflow quoted in Part 1.11: Jog panel Base/Tool selection, Snap teaching, Joint Motion as the approach, Linear Motion as the pick and retract, Set Binary Output for the gripper, Call Sequence Statement from Main, statement naming |
| **VC eCatalog / eLibrary component index** — download.visualcomponents.net/elib | 4.1 index | confirmation that official FANUC components exist for the LR Mate 200iD family, including the 7L, and the fallback route in Part 1.4 |
| **vcHelpers.Robot2 Python API reference** (inside the 4.8 help) | 4.8 | \`getRobot\`, \`home\`, \`pick\`, \`place\`, \`sim.delay\` used in Part 1.12 |

**Version differences worth stating in a report**

| Feature | 4.8 | Later versions |
|---|---|---|
| OLP tabs | all OLP functions on the PROGRAM tab | unchanged in principle, extended in 4.9/4.10 |
| Via Solver | available in **all** 4.8 product versions | unchanged |
| Robotics Solver (collision, singularity, joint-limit solving) | paid add-on | continued |
| TransportPatternIn palletizing | available (4.8.0+) | extended |
| Robot Transport Controller | Pick And Place Transport Controller is the documented component for PnP flows | the Robot Transport Controller manual page targets 5.0+ |
| Interactive VR | fixed in 4.8.0.1 | continued |
| Statement loading from Via Solver | fixed in 4.8.0.1 | continued |

> WARNING — Do not copy a procedure from a lesson tagged for a newer version into a 4.8 report without checking the property names. The VC Academy tags every lesson with the version it was recorded on, and the transport-controller material in particular changed between 4.8 and 5.0.
`,
        ru: `
| Источник | Метка версии | Что взяло из него это руководство |
|---|---|---|
| **Онлайн-справка Visual Components 4.8** — [help.visualcomponents.com/4.8](https://help.visualcomponents.com/4.8) | 4.8 | структура ленты, компоненты процессного моделирования, утверждения вкладки PROGRAM, экспорт OLP, Python API |
| **Примечания к выпуску / What's New VC 4.8** | 4.8, выпущена 10.06.2023; 4.8.0.1 январь 2024 | факты о версии в части 0: OLP для робототехники объединён на вкладке PROGRAM, Via Solver во всех версиях продукта, синхронизация с конвейером в Program Validation и проверка линейного поворота на 180°, версии CAD-трансляторов |
| **VC Academy — «Pick And Place Components»** ([PDF, 15.02.2023](https://academy.visualcomponents.com/app/uploads/2023/02/pick-and-place-components-manual-15-02-2023.pdf)) | 4.6+ | целиком части 1.7 и 1.8: поведение Pick And Place Process, положения датчиков, ProcessType/ProductsOn/StopAt, LinkDefaults транспортного контроллера, TcpIndex, движения подвода, сигналы захвата, конфигурация мультизахвата с двойным захватом и правило «переименовывать, а не редактировать» эти компоненты |
| **VC Academy — «Introduction to Layout Configuration»** ([PDF, PM v2](https://academy.visualcomponents.com/app/uploads/2025-05-introduction-to-layout-configuration_pm_v2.pdf)) | 4.10 (названия применимы к 4.8) | навигация по ленте и eCatalog, поля Product Type Editor, связка «фидер → процесс → поток» из частей 1.2–1.3 |
| **VC Academy — «Palletize using PM TransportPatternIn statement»** | 4.8.0+ | маршрут B в частях 0/1: TransportPatternIn + Attach/Detach как альтернатива сборкам |
| **VC Academy — «Robot Transport Controller manual»** | 5.0+ | структура транспортного контроллера; использовано осторожно, так как страница описывает версию новее 4.8 |
| **VC Academy — «Palletizing robot programming»** | 4.9.0+ | приёмы программирования паллетирования; отмечено в части 1.11 как разница версий |
| **VC Academy — «MachineTending-1»** ([PDF, 2017-01](https://academy.visualcomponents.com/app/uploads/2017/01/MachineTending-1.pdf)) | 4.x | Shape Feeder → CollarPallet, Pallet Filler, схема XYZ с Z_Count — происхождение подхода к схеме укладки в части 1.6 |
| **Учебный модуль VC 3 — «Create a Robot Program»** | 4.x | процесс на вкладке PROGRAM из части 1.11: выбор Base/Tool в панели Jog, обучение через Snap, Joint Motion как подвод, Linear Motion как съём и отход, Set Binary Output для захвата, Call Sequence Statement из Main, именование утверждений |
| **Индекс компонентов eCatalog / eLibrary** — download.visualcomponents.net/elib | индекс 4.1 | подтверждение, что официальные компоненты FANUC существуют для семейства LR Mate 200iD, включая 7L, и запасной путь из части 1.4 |
| **Справка по Python API vcHelpers.Robot2** (внутри справки 4.8) | 4.8 | \`getRobot\`, \`home\`, \`pick\`, \`place\`, \`sim.delay\` из части 1.12 |

**Различия версий, о которых стоит написать в отчёте**

| Возможность | 4.8 | Более поздние версии |
|---|---|---|
| Вкладки OLP | все функции OLP на вкладке PROGRAM | в основе без изменений, расширены в 4.9/4.10 |
| Via Solver | доступен во **всех** версиях продукта 4.8 | без изменений |
| Robotics Solver (решение коллизий, сингулярностей, пределов осей) | платная надстройка | продолжается |
| Паллетирование TransportPatternIn | доступно (4.8.0+) | расширено |
| Robot Transport Controller | документированный компонент для потоков PnP — Pick And Place Transport Controller | страница руководства по Robot Transport Controller относится к 5.0+ |
| Интерактивный VR | исправлено в 4.8.0.1 | продолжается |
| Загрузка утверждений из Via Solver | исправлено в 4.8.0.1 | продолжается |

> WARNING — Не переносите процедуру из урока, помеченного более новой версией, в отчёт по 4.8 без проверки названий свойств. VC Academy помечает каждый урок версией, на которой он записан, а материалы по транспортному контроллеру в частности менялись между 4.8 и 5.0.
`,
      },
    },
    {
      id: 'standards',
      title: { en: '6.3 Standards, options and plant documents', ru: '6.3 Стандарты, опции и документы предприятия' },
      body: {
        en: `
**Standards referenced in Part 1.9**

| Standard | Scope | Relevance here |
|---|---|---|
| ISO 10218-1 | Robots and robotic devices — safety requirements for industrial robots | the robot itself: protective stopping, speed and separation limits |
| ISO 10218-2 | Robot systems and integration | the cell: fencing, interlocks, light curtains, safe distances |
| ISO/TS 15066 | Collaborative robots | referenced only to say the LR Mate 200iD is **not** collaborative by default |
| ISO 13849-1 | Safety of machinery — safety-related parts of control systems | performance level of the interlock circuit, if you design one |
| ISO 11161 | Safety of integrated manufacturing systems | the line-level view when zones A–E are integrated |

> NOTE — Russian adopted equivalents of these standards exist (ГОСТ Р ИСО …). Cite the current designation from the official standards register rather than copying a number from a guide, because designations are re-issued.

**FANUC software options mentioned**

| Option | What it provides |
|---|---|
| ASCII upload / program conversion | allows the controller to load \`.LS\` files directly — without it only compiled \`.TP\` files load |
| PalletTool | pattern-based palletizing with pattern registers; the production alternative to hand-written loops |
| Dual Check Safety (DCS) | safety-rated monitored stop, safe zones, speed limiting |
| DeviceNet / PROFINET / EtherNet-IP | fieldbus I/O for the cell; the DeviceNet variant of INTP-106 relates to this |
| Conveyor tracking / line tracking | if the pick is done on a moving belt rather than at a stopped station |

**Plant documents your report should also cite**

| Document | Why |
|---|---|
| Purchase contract and warranty certificate | establish the warranty period and the covered serial numbers |
| Commissioning / acceptance act | the date the warranty clock starts |
| Service contract, if any | who is allowed to open the wrist without voiding the warranty |
| Maintenance log (журнал ТО) | the document with the six-month gap — the central evidence of the task |
| Risk assessment for the cell | required by ISO 10218-2 and the basis for your fence distances |
| Lock-out/tag-out procedure | the legal basis for the safety steps in Parts 2–4 |
| Spare parts list with your supplier's lead times | justifies the spares kit in Part 3.4 |
`,
        ru: `
**Стандарты, на которые ссылается часть 1.9**

| Стандарт | Область | Значение здесь |
|---|---|---|
| ISO 10218-1 | Роботы и робототехнические устройства — требования безопасности к промышленным роботам | сам робот: защитный останов, ограничения скорости и расстояния |
| ISO 10218-2 | Робототехнические системы и интеграция | ячейка: ограждение, блокировки, светозанавесы, безопасные расстояния |
| ISO/TS 15066 | Коллаборативные роботы | упомянут только чтобы сказать: LR Mate 200iD по умолчанию **не** коллаборативен |
| ISO 13849-1 | Безопасность машин — части систем управления, связанные с безопасностью | уровень полноты безопасности цепи блокировки, если вы её проектируете |
| ISO 11161 | Безопасность интегрированных производственных систем | взгляд на уровень линии при интеграции зон A–E |

> NOTE — Существуют российские принятые эквиваленты этих стандартов (ГОСТ Р ИСО …). Ссылайтесь на актуальное обозначение из официального реестра стандартов, а не копируйте номер из пособия: обозначения перевыпускаются.

**Упомянутые программные опции FANUC**

| Опция | Что даёт |
|---|---|
| ASCII upload / конвертация программ | позволяет контроллеру загружать файлы \`.LS\` напрямую; без неё загружаются только скомпилированные \`.TP\` |
| PalletTool | паллетирование на основе схем с регистрами схем; производственная альтернатива самописным циклам |
| Dual Check Safety (DCS) | контролируемый останов с уровнем безопасности, безопасные зоны, ограничение скорости |
| DeviceNet / PROFINET / EtherNet-IP | полевые шины ввода-вывода ячейки; с ними связан вариант INTP-106 по DeviceNet |
| Conveyor tracking / line tracking | если съём выполняется на движущейся ленте, а не на остановленной позиции |

**Документы предприятия, которые стоит процитировать в отчёте**

| Документ | Зачем |
|---|---|
| Договор поставки и гарантийный талон | устанавливают гарантийный срок и покрытые серийные номера |
| Акт ввода в эксплуатацию | дата, с которой пошёл гарантийный отсчёт |
| Сервисный контракт, если есть | кто вправе вскрывать кисть, не теряя гарантию |
| Журнал ТО | документ с шестимесячным пробелом — центральное доказательство задачи |
| Оценка рисков для ячейки | требуется ISO 10218-2 и служит основанием для ваших расстояний до ограждения |
| Процедура блокировки/бирок (LOTO) | правовая основа шагов безопасности в частях 2–4 |
| Перечень запчастей со сроками поставки вашего снабжения | обосновывает комплект ЗИП в части 3.4 |
`,
      },
    },
    {
      id: 'traceability',
      title: { en: '6.4 Traceability: every number and where it comes from', ru: '6.4 Прослеживаемость: каждое число и его происхождение' },
      body: {
        en: `
This is the table a reviewer will actually use. It maps each specification value in the guide to its source.

**Mechanical — belts, backlash, grease**

| Value | Source |
|---|---|
| Tensionmeter A97L-0218-0700 (Mitsuboshi DOCTOR TENSION TYPE-III) | B-83495EN §6.1 |
| Measurement pose J3 = 80°, J5 = ±90° | B-83495EN §6.1 |
| Wrist cover bolt torque 5.6 N·m | B-83495EN §6.1 |
| J5 tension 15.6–20.6 N, belt mass 0.02083 kg/m, width 4 mm, span 187 mm | B-83495EN §6.1, Table 6.1 |
| J6 tension 15.6–20.6 N, same mass and width, span 116 mm | B-83495EN §6.1, Table 6.1 |
| J1/J2 tension 49–65 N (7L) and 30–40 N (standard), width 6 mm, span 167.5 mm | B-83495EN §6.1, Table 6.1 |
| J5/J6 belt part number A98L-0040-0286#004-157 | B-83495EN §6.1 / Appendix A |
| Backlash limits: J5 0.18 mm at 180 mm, J6 0.15 mm at 100 mm, J4 0.16 mm at 100 mm | B-83495EN Table 3.3(b) |
| Backlash limits J1–J3: 0.41/0.19/0.20 mm standard, 0.52/0.25/0.25 mm for 7L | B-83495EN Table 3.3(b) |
| Dial gauge resolution 1/100 mm for backlash measurement | B-83495EN ch. 3 |
| Grease A98L-0040-0230 (Harmonic 4B No.2), kit A05B-1142-K021, tube A05B-1139-K022 | B-83495EN §2.2 |
| Grease quantities: J1 2.7 g (3 ml), J2 2.7 g (3 ml), J3–J6 1.8 g (2 ml) | B-83495EN §2.2 |
| Syringe plunger 2.5 mm = 1 ml | B-83495EN §2.2 |
| Greasing procedure: power off, remove inlet seal bolts, inject, fit new seal bolts | B-83495EN §2.2 |
| Wait ≥ 1 h after reducer replacement; LOCTITE 518 on the flange | B-83495EN §2.2 / ch. 3 |
| Never use Harmonic SK-3 | B-83495EN §2.2 |
| Tool list: LOCTITE 243, 263, 518, 638, hex and monkey wrenches, screwdrivers, gear puller, separator, C-ring pliers | B-83495EN, tools section |
| Mechanical-unit cable interval 4 years / 15360 h | B-83495EN ch. 5 |

**Electrical — batteries and mastering**

| Value | Source |
|---|---|
| Controller SRAM battery A05B-2650-K030 (also A98L-0031-0028), 3 V lithium | B-83525EN §8.11.1 |
| Healthy controller battery voltage 3.1–3.3 VDC; low → SYST-035 | B-83525EN §8.11.1 |
| Battery life ~4 years (controller) | B-83525EN §8.11.1 |
| Replacement procedure: back up, power on ~30 s, power off, swap within 30 minutes | B-83525EN §8.11.1 |
| Battery unit location: lower-right area of the backplane | B-83525EN §8.11.1 |
| Robot APC battery: 4 × C cells 1.5 V built-in (~1 year) or 4 × D external (~1.5 years) | B-83494EN §7.3.1 / Appendix A |
| APC battery replacement **with power ON** | B-83494EN §7.3.1 |
| Power-off swap → SRVO-062 BZAL and loss of mastering data | B-83494EN §7.3.1 / Error Code Manual |
| Mastering methods: Fixture Position, Zero Position, Quick Master, Quick Master for Single Axis, Single Axis Master, Set Quick Master Ref, Calibrate | B-83494EN ch. 8 |
| Screen path MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Master/Cal | B-83494EN ch. 8 |
| \`$MASTER_ENB = 1\` required to enable mastering | B-83494EN ch. 8 |
| Brake release: \`$PARAM_GROUP.$SV_OFF_ALL = FALSE\`, \`$SV_OFF_ENB[*] = FALSE\`, then power cycle; support the axis mechanically | B-83494EN ch. 8 |
| \`$DMR_GRP[1].$MASTER_DONE\`, \`$MASTER_COUN[1..6]\`, \`$REF_DONE\` | B-83494EN ch. 8 |
| Single Axis Master sequence: SEL = 1 → jog to mark → MSTR POS → EXEC → SEL = 0 → CALIBRATE | B-83494EN ch. 8 |
| Quick Master impossible after pulse coder replacement or loss of mastering data | B-83494EN ch. 8 |
| SRVO-038 recovery: RES_PCA → jog ≥ 1 motor revolution → verify marks → MASTER_DONE → CALIBRATE | Error Code Manual / B-83494EN ch. 8 |
| SYSMAST.SV restore via FILE → UTIL → Set Device → LOAD/RESTORE → cold start | B-83284EN / B-83494EN |
| Controlled start: hold PREV + NEXT while powering on → 3 Controlled start | B-83284EN |

**Alarms**

| Value | Source |
|---|---|
| INTP-106 text "PAUSE.L (%s^4, %d^5) Continue request failed" | R-30iB Plus Error Code Manual, INTP group |
| INTP-106 remedy: read the cause code from the alarm log, correct it, release and restart; otherwise controlled start | R-30iB Plus Error Code Manual |
| DeviceNet variant checks: DEV LST status, baud rate, duplicate MAC IDs | R-30iB Plus Error Code Manual |
| SYST-035, SRVO-038, SRVO-062, SRVO-075, SRVO-199 meanings | Error Code Manual / B-83525EN |

**Installation and periodic inspection**

| Value | Source |
|---|---|
| Flatness ≤ 0.5 mm, inclination ≤ 0.5°, base 190 × 190 with 4 × Ø11 | B-83494EN §1.2 |
| Maintenance clearance 500 mm around, 705 mm above (7L) / 620 mm (standard) | B-83494EN §1.3 |
| Mounting-angle setting procedure via controlled start and MAINTENANCE → F4 MANUAL | B-83494EN §1.2.1 |
| Power-off stop moment at J1 base: 1657.2 N·m (7L); stopping times 372/364/324 ms and distances 69.0/57.3/54.4° for J1/J2/J3 | B-83494EN §1.2, stopping tables |
| Earth the controller before power-on; never run a ≥ 10 m cable coiled | B-83494EN §2 |
| Periodic intervals: 1 month 320 h, 3 months 960 h, 1 year 3840 h, 1.5 years 5760 h, 2 years 7680 h, 4 years 15360 h | B-83495EN §1 / Appendix C; B-83494EN §7.1.2 |
| Interval basis: up to 3840 h/year | B-83494EN §7.1.2 |
| Oil-seepage check: wipe, re-check the next day, vent the grease inlet if pressure builds | B-83494EN §7.2.1 |
| Periodic items: connector looseness (0.2 h), end-effector bolt tightening, cover and main bolt torque, mechanical stopper, dust and spatter removal, hand and external battery cable check, battery replacement, reducer greasing, controller ventilation cleaning | B-83495EN §1; B-83494EN §7 |

**Derived in this guide (not quoted from a manual)**

| Value | How it was derived |
|---|---|
| Resonant frequencies 73–84 Hz (J5), 118–136 Hz (J6), 109–141 Hz (J1/J2 at 7L tensions) | \`f = √(T / (4·m·L²))\` with the manual's tension, belt mass and span values — a consistency check, labelled as derived wherever it appears |
| Brick 250 × 120 × 65 mm, 3.2 kg; gripper 0.80 kg; 4.00 kg on the flange | the guide's own product definition (Part 0.3), chosen to match a real decorative brick and to stay inside the robot's ratings |
| 24 bricks per layer, 8 layers, 192 bricks, 614 kg net, 664 mm stack | arithmetic on the EUR pallet 1200 × 800 × 144 mm |
| Takt 6.0 s = 600 bricks/h; 21.2 min single-position vs 19.2 min two-position pallet cycle | arithmetic in Part 0.5 |
| Payload utilisation 57 %, moment 3.92 N·m (24 %), inertia 0.090 kg·m² (19 %) | the guide's product values against the B-83494EN ratings |
| Downtime economics (28 h/year lost, 24 h/year planned) | arithmetic in Part 5.4 from the task's 30–40 min figure |
| Simulated outputs in Part 4.8 (4 550 / 4 830 / 3 400 bricks per shift) | arithmetic from the 600 bricks/h takt and the modelled downtime — labelled illustrative |

> TIP — Reproduce this table in your own report as an appendix. It is the single most effective defence against "where did this number come from?" — and writing it forces you to notice every number you cannot source.
`,
        ru: `
Это таблица, которой рецензент действительно воспользуется. Она сопоставляет каждое нормативное значение руководства с его источником.

**Механика — ремни, люфт, смазка**

| Значение | Источник |
|---|---|
| Тензометр A97L-0218-0700 (Mitsuboshi DOCTOR TENSION TYPE-III) | B-83495EN §6.1 |
| Поза измерения J3 = 80°, J5 = ±90° | B-83495EN §6.1 |
| Момент болта крышки кисти 5,6 Н·м | B-83495EN §6.1 |
| Натяжение J5 15,6–20,6 Н, масса ремня 0,02083 кг/м, ширина 4 мм, ветвь 187 мм | B-83495EN §6.1, таблица 6.1 |
| Натяжение J6 15,6–20,6 Н, та же масса и ширина, ветвь 116 мм | B-83495EN §6.1, таблица 6.1 |
| Натяжение J1/J2 49–65 Н (7L) и 30–40 Н (стандарт), ширина 6 мм, ветвь 167,5 мм | B-83495EN §6.1, таблица 6.1 |
| Номер ремня J5/J6 A98L-0040-0286#004-157 | B-83495EN §6.1 / приложение A |
| Пределы люфта: J5 0,18 мм на 180 мм, J6 0,15 мм на 100 мм, J4 0,16 мм на 100 мм | B-83495EN таблица 3.3(b) |
| Пределы люфта J1–J3: 0,41/0,19/0,20 мм стандарт, 0,52/0,25/0,25 мм для 7L | B-83495EN таблица 3.3(b) |
| Разрешение индикатора 1/100 мм для измерения люфта | B-83495EN глава 3 |
| Смазка A98L-0040-0230 (Harmonic 4B No.2), комплект A05B-1142-K021, туба A05B-1139-K022 | B-83495EN §2.2 |
| Объёмы смазки: J1 2,7 г (3 мл), J2 2,7 г (3 мл), J3–J6 1,8 г (2 мл) | B-83495EN §2.2 |
| Ход поршня шприца 2,5 мм = 1 мл | B-83495EN §2.2 |
| Процедура смазки: питание выкл, снять уплотнительные болты отверстия подачи, ввести смазку, поставить новые болты | B-83495EN §2.2 |
| Выдержка ≥ 1 ч после замены редуктора; LOCTITE 518 на фланец | B-83495EN §2.2 / глава 3 |
| Никогда не применять Harmonic SK-3 | B-83495EN §2.2 |
| Перечень инструмента: LOCTITE 243, 263, 518, 638, шестигранники и разводной ключ, отвёртки, съёмник, сепаратор, съёмник стопорных колец | B-83495EN, раздел инструмента |
| Интервал кабеля механического блока 4 года / 15360 ч | B-83495EN глава 5 |

**Электрика — батареи и мастерение**

| Значение | Источник |
|---|---|
| Батарея SRAM контроллера A05B-2650-K030 (также A98L-0031-0028), 3 В литиевая | B-83525EN §8.11.1 |
| Исправное напряжение батареи контроллера 3,1–3,3 В; низкое → SYST-035 | B-83525EN §8.11.1 |
| Ресурс батареи ~4 года (контроллер) | B-83525EN §8.11.1 |
| Процедура замены: копия, питание вкл ~30 с, выкл, замена в течение 30 минут | B-83525EN §8.11.1 |
| Расположение батарейного блока: нижняя правая область монтажной платы | B-83525EN §8.11.1 |
| Батарея APC робота: 4 × C 1,5 В встроенные (~1 год) или 4 × D внешние (~1,5 года) | B-83494EN §7.3.1 / приложение A |
| Замена батареи APC **при включённом питании** | B-83494EN §7.3.1 |
| Замена при выключенном питании → SRVO-062 BZAL и потеря данных мастерения | B-83494EN §7.3.1 / справочник кодов ошибок |
| Способы мастерения: Fixture Position, Zero Position, Quick Master, Quick Master for Single Axis, Single Axis Master, Set Quick Master Ref, Calibrate | B-83494EN глава 8 |
| Путь по экранам MENU → 0 NEXT → 6 SYSTEM → F1 [TYPE] → Master/Cal | B-83494EN глава 8 |
| Для разрешения мастерения нужен \`$MASTER_ENB = 1\` | B-83494EN глава 8 |
| Снятие тормозов: \`$PARAM_GROUP.$SV_OFF_ALL = FALSE\`, \`$SV_OFF_ENB[*] = FALSE\`, затем перещёлкнуть питание; ось механически подпереть | B-83494EN глава 8 |
| \`$DMR_GRP[1].$MASTER_DONE\`, \`$MASTER_COUN[1..6]\`, \`$REF_DONE\` | B-83494EN глава 8 |
| Последовательность Single Axis Master: SEL = 1 → навести на метку → MSTR POS → EXEC → SEL = 0 → CALIBRATE | B-83494EN глава 8 |
| Quick Master невозможен после замены импульсного кодера или потери данных мастерения | B-83494EN глава 8 |
| Восстановление после SRVO-038: RES_PCA → прокрутить ось минимум на оборот мотора → проверить метки → MASTER_DONE → CALIBRATE | справочник кодов ошибок / B-83494EN глава 8 |
| Восстановление SYSMAST.SV через FILE → UTIL → Set Device → LOAD/RESTORE → cold start | B-83284EN / B-83494EN |
| Управляемый пуск: держать PREV + NEXT при включении → 3 Controlled start | B-83284EN |

**Аварии**

| Значение | Источник |
|---|---|
| Текст INTP-106 «PAUSE.L (%s^4, %d^5) Continue request failed» | справочник кодов ошибок R-30iB Plus, группа INTP |
| Remedy INTP-106: прочитать код причины в журнале аварий, устранить, снять аварию и перезапустить; иначе управляемый пуск | справочник кодов ошибок R-30iB Plus |
| Проверки варианта по DeviceNet: статус DEV LST, скорость передачи, дубли MAC ID | справочник кодов ошибок R-30iB Plus |
| Значения SYST-035, SRVO-038, SRVO-062, SRVO-075, SRVO-199 | справочник кодов ошибок / B-83525EN |

**Установка и периодические осмотры**

| Значение | Источник |
|---|---|
| Плоскостность ≤ 0,5 мм, наклон ≤ 0,5°, основание 190 × 190 с 4 × Ø11 | B-83494EN §1.2 |
| Зона обслуживания 500 мм вокруг, 705 мм над роботом (7L) / 620 мм (стандарт) | B-83494EN §1.3 |
| Процедура установки угла монтажа через управляемый пуск и MAINTENANCE → F4 MANUAL | B-83494EN §1.2.1 |
| Момент при остановке снятием питания у основания J1: 1657,2 Н·м (7L); время торможения 372/364/324 мс и путь 69,0/57,3/54,4° для J1/J2/J3 | B-83494EN §1.2, таблицы торможения |
| Заземлить контроллер до включения; никогда не эксплуатировать кабель ≥ 10 м в бухте | B-83494EN §2 |
| Интервалы осмотров: 1 месяц 320 ч, 3 месяца 960 ч, 1 год 3840 ч, 1,5 года 5760 ч, 2 года 7680 ч, 4 года 15360 ч | B-83495EN §1 / приложение C; B-83494EN §7.1.2 |
| База интервалов: до 3840 ч/год | B-83494EN §7.1.2 |
| Проверка на течь масла: протереть, перепроверить на следующий день, стравить давление через отверстие подачи смазки | B-83494EN §7.2.1 |
| Периодические пункты: ослабление разъёмов (0,2 ч), подтяжка болтов конечного устройства, момент крышек и основных болтов, механические упоры, удаление пыли и брызг, проверка кабеля захвата и внешней батареи, замена батареи, смазка редукторов, очистка вентиляции контроллера | B-83495EN §1; B-83494EN §7 |

**Выведено в этом руководстве (не цитата из руководства)**

| Значение | Как получено |
|---|---|
| Резонансные частоты 73–84 Гц (J5), 118–136 Гц (J6), 109–141 Гц (J1/J2 при натяжениях 7L) | \`f = √(T / (4·m·L²))\` по значениям натяжения, массы ремня и длины ветви из руководства — проверка согласованности, везде помечена как выведенная |
| Кирпич 250 × 120 × 65 мм, 3,2 кг; захват 0,80 кг; 4,00 кг на фланце | собственное определение продукта в руководстве (часть 0.3), подобранное под реальный декоративный кирпич и под номиналы робота |
| 24 кирпича в слое, 8 слоёв, 192 кирпича, 614 кг нетто, штабель 664 мм | арифметика по EUR-паллете 1200 × 800 × 144 мм |
| Такт 6,0 с = 600 кирп/ч; 21,2 мин при одной позиции против 19,2 мин при двухпозиционном цикле | арифметика части 0.5 |
| Использование грузоподъёмности 57 %, момент 3,92 Н·м (24 %), инерция 0,090 кг·м² (19 %) | значения продукта из руководства против номиналов B-83494EN |
| Экономика простоев (28 ч/год потерь, 24 ч/год плановых) | арифметика части 5.4 от данных в задании 30–40 мин |
| Модельные выпуски в части 4.8 (4 550 / 4 830 / 3 400 кирпичей за смену) | арифметика от такта 600 кирп/ч и смоделированного простоя — помечено как иллюстративное |

> TIP — Воспроизведите эту таблицу в своём отчёте как приложение. Это самая действенная защита от вопроса «откуда это число?» — а её составление заставляет заметить каждое число, источник которого вы назвать не можете.
`,
      },
    },
    {
      id: 'pitfalls-sources',
      title: { en: '6.5 Figures in circulation that do not survive checking', ru: '6.5 Значения в обращении, которые не выдерживают проверки' },
      body: {
        en: `
While assembling this guide, several widely repeated numbers turned out to conflict with the manuals. They are listed here so that you do not repeat them in a report.

| Widely repeated | What the manuals say | Where the error comes from |
|---|---|---|
| Controller battery part "A98L-0031-0010" | **A05B-2650-K030** (also listed as A98L-0031-0028); the full-size R-30iB lists A02B-0200-K102 / A98L-0031-0012 | part numbers from a different controller family copied across blogs |
| "Hot-swap the robot battery in 5–30 minutes" | the APC swap is done **with power ON** and should take seconds; the *controller* battery has a 30-minute window **after power-off** | two different procedures merged into one sentence |
| Repeatability "±0.02 mm" for the 200iD family | **±0.01 mm** | reseller pages for the standard-arm variant, or older 200iC data |
| Joint speeds quoted from the standard-arm 200iD | the **7L** long-arm variant has its own speed set: 370 / 310 / 410 / 550 / 545 / 1000 °/s | the two variants are frequently conflated |
| "INTP-106 means the program is corrupted" | INTP-106 means a **continue request failed on a paused program**; the cause is a different alarm in the log | the alarm text is read as a diagnosis instead of a symptom |
| Variables such as "\`$MASTER_COUNTER\`" or "\`$PARAM_GROUP.$MASTER_ENB\`" | the real names are \`$MASTER_ENB\`, \`$DMR_GRP[1].$MASTER_DONE\`, \`$DMR_GRP[1].$MASTER_COUN[*]\`, \`$REF_DONE\` | third-party recovery write-ups inventing plausible names |
| Recovery procedures written for R-30iA applied to R-30iB Plus | menu trees and some screens differ; use the Plus manuals | a large installed base of R-30iA material online |
| "Visual Components 4.8 has a separate OLP tab" | in 4.8 the robotics OLP functions were merged onto the **PROGRAM** tab | older screenshots from 4.5–4.7 |
| Legacy "Feeder"-folder components used for product flow | PM **Flow Components** create products; the legacy ones create components and do not work with the Process Modelling flow | tutorials predating Process Modelling |
| Grease "Harmonic SK-3 is equivalent" | the manual specifies **4B No.2 (A98L-0040-0230)** and explicitly excludes SK-3 | confusion between grease families of the same manufacturer |

**General rules for sourcing robot maintenance data**

1. Prefer the manual that came with the machine, then the manual for the exact revision, then any other copy.
2. If two copies of the same manual disagree, the higher revision wins.
3. If a reseller page disagrees with a manual, the manual wins.
4. If a forum post disagrees with a manual, the manual wins — but the forum post may still be right about what a *specific* software version's screen looks like.
5. If you cannot source a number, do not print it. Write "to be confirmed against the manual supplied with the machine" and move on. Reviewers respect that far more than a confident fabrication.
`,
        ru: `
При сборке этого руководства несколько широко тиражируемых чисел оказались в противоречии с руководствами. Они перечислены здесь, чтобы вы не повторили их в отчёте.

| Широко повторяется | Что говорят руководства | Откуда ошибка |
|---|---|---|
| Номер батареи контроллера «A98L-0031-0010» | **A05B-2650-K030** (указывается также A98L-0031-0028); для полноразмерного R-30iB указаны A02B-0200-K102 / A98L-0031-0012 | номера деталей из другого семейства контроллеров, перекочевали между блогами |
| «Горячая замена батареи робота за 5–30 минут» | замена APC выполняется **при включённом питании** и занимает секунды; окно **30 минут после выключения** относится к батарее *контроллера* | две разные процедуры слиты в одну фразу |
| Повторяемость «±0,02 мм» для семейства 200iD | **±0,01 мм** | страницы дилеров для короткорукой модификации либо данные старой 200iC |
| Скорости осей, процитированные со стандартной 200iD | у длиннорукой **7L** свой набор: 370 / 310 / 410 / 550 / 545 / 1000 °/с | две модификации постоянно путают |
| «INTP-106 означает повреждение программы» | INTP-106 означает, что **запрос на продолжение приостановленной программы не прошёл**; причина — другая авария в журнале | текст аварии читают как диагноз, а не как симптом |
| Переменные вроде «\`$MASTER_COUNTER\`» или «\`$PARAM_GROUP.$MASTER_ENB\`» | настоящие имена: \`$MASTER_ENB\`, \`$DMR_GRP[1].$MASTER_DONE\`, \`$DMR_GRP[1].$MASTER_COUN[*]\`, \`$REF_DONE\` | сторонние описания восстановления выдумывают правдоподобные имена |
| Процедуры восстановления, написанные для R-30iA, применены к R-30iB Plus | деревья меню и часть экранов различаются; пользуйтесь руководствами для Plus | большое количество материалов по R-30iA в сети |
| «В Visual Components 4.8 отдельная вкладка OLP» | в 4.8 функции OLP для робототехники объединены на вкладке **PROGRAM** | старые скриншоты из 4.5–4.7 |
| Компоненты из старой папки «Feeder» для потока продуктов | PM **Flow Components** создают продукты; старые создают компоненты и не работают с потоком процессного моделирования | учебные материалы до появления Process Modelling |
| Смазка «Harmonic SK-3 эквивалентна» | руководство предписывает **4B No.2 (A98L-0040-0230)** и прямо исключает SK-3 | путаница между семействами смазок одного производителя |

**Общие правила поиска данных по обслуживанию робота**

1. Предпочитайте руководство, поставленное с машиной, затем руководство точной ревизии, затем любую другую копию.
2. Если две копии одного руководства расходятся, побеждает старшая ревизия.
3. Если страница дилера расходится с руководством, побеждает руководство.
4. Если сообщение на форуме расходится с руководством, побеждает руководство — но форум может быть прав в том, как выглядит экран *конкретной* версии ПО.
5. Если число не удаётся подтвердить источником, не печатайте его. Напишите «требует подтверждения по руководству, поставленному с машиной» и идите дальше. Рецензенты уважают это намного больше, чем уверенную выдумку.
`,
      },
    },
    {
      id: 'access',
      title: { en: '6.6 Where the documents were consulted', ru: '6.6 Где просматривались документы' },
      body: {
        en: `
Listed for transparency, so that anyone can follow the same path. Official copies should always be obtained from the manufacturer or your authorised representative; the links below are the publicly accessible copies that were used to read the sections quoted in this guide.

| Document | Access point used |
|---|---|
| LR Mate 200iD Operator's Manual B-83494EN/10 | [robochallenge.pl (PDF)](https://robochallenge.pl/wp-content/uploads/2025-02/LRMate200iD_operator_manual_B-83494EN_10.pdf) — chapters 1–2 |
| LR Mate 200iD Operator's Manual, chapters 7–8 | [manualmachine.com full-text mirror](https://manualmachine.com/fanuc/lrmate200id/18164338-operator-manual/) |
| LR Mate 200iD Maintenance Manual B-83495EN/01 | [img1.wsimg.com (PDF)](https://img1.wsimg.com/blobby/go/755d0207-60cb-48da-8f1e-621d6d7ff94f/downloads/lr_mate_200id_maintenance_manual.pdf) |
| R-30iB Plus Basic Operator's Manual B-83284EN/10 | [robochallenge.pl (PDF)](https://robochallenge.pl/wp-content/uploads/2023/09/R-30iB_Plus_basic_operator_manual_B-83284EN_10.pdf) |
| R-30iB (Mate) Plus Controller Maintenance Manual B-83525EN | publicly hosted copies (pdfcoffee, kupdf, idoc.tips) — cross-checked against each other |
| R-30iB Error Code Manual | publicly hosted copies — used for INTP-106, SRVO and SYST entries |
| VC 4.8 help and What's New | [help.visualcomponents.com/4.8](https://help.visualcomponents.com/4.8) |
| VC Pick And Place Components manual | [academy.visualcomponents.com (PDF)](https://academy.visualcomponents.com/app/uploads/2023/02/pick-and-place-components-manual-15-02-2023.pdf) |
| VC Introduction to Layout Configuration | [academy.visualcomponents.com (PDF)](https://academy.visualcomponents.com/app/uploads/2025-05-introduction-to-layout-configuration_pm_v2.pdf) |
| VC training module 3, Create a Robot Program | forum.visualcomponents.com uploads |
| VC component library index | download.visualcomponents.net/elib |

> NOTE — Publicly hosted copies may be older revisions than the ones FANUC supplies with a specific machine, and some are incomplete scans. Where this guide quotes a value, it was read in at least one complete copy and, wherever possible, cross-checked against a second source. Where two sources disagreed, the disagreement is recorded in Part 6.5 rather than silently resolved.
`,
        ru: `
Приведено для прозрачности, чтобы любой мог пройти тем же путём. Официальные копии всегда следует получать у изготовителя или authorised представителя; ссылки ниже — общедоступные копии, по которым читались разделы, процитированные в этом руководстве.

| Документ | Использованная точка доступа |
|---|---|
| LR Mate 200iD Operator's Manual B-83494EN/10 | [robochallenge.pl (PDF)](https://robochallenge.pl/wp-content/uploads/2025-02/LRMate200iD_operator_manual_B-83494EN_10.pdf) — главы 1–2 |
| LR Mate 200iD Operator's Manual, главы 7–8 | [полнотекстовое зеркало manualmachine.com](https://manualmachine.com/fanuc/lrmate200id/18164338-operator-manual/) |
| LR Mate 200iD Maintenance Manual B-83495EN/01 | [img1.wsimg.com (PDF)](https://img1.wsimg.com/blobby/go/755d0207-60cb-48da-8f1e-621d6d7ff94f/downloads/lr_mate_200id_maintenance_manual.pdf) |
| R-30iB Plus Basic Operator's Manual B-83284EN/10 | [robochallenge.pl (PDF)](https://robochallenge.pl/wp-content/uploads/2023/09/R-30iB_Plus_basic_operator_manual_B-83284EN_10.pdf) |
| R-30iB (Mate) Plus Controller Maintenance Manual B-83525EN | общедоступные копии (pdfcoffee, kupdf, idoc.tips) — сверены между собой |
| Справочник кодов ошибок R-30iB | общедоступные копии — для записей INTP-106, SRVO и SYST |
| Справка VC 4.8 и What's New | [help.visualcomponents.com/4.8](https://help.visualcomponents.com/4.8) |
| Руководство VC по компонентам Pick And Place | [academy.visualcomponents.com (PDF)](https://academy.visualcomponents.com/app/uploads/2023/02/pick-and-place-components-manual-15-02-2023.pdf) |
| VC Introduction to Layout Configuration | [academy.visualcomponents.com (PDF)](https://academy.visualcomponents.com/app/uploads/2025-05-introduction-to-layout-configuration_pm_v2.pdf)
| Учебный модуль VC 3, Create a Robot Program | материалы forum.visualcomponents.com |
| Индекс библиотеки компонентов VC | download.visualcomponents.net/elib |

> NOTE — Общедоступные копии могут оказаться более ранними ревизиями, чем те, что FANUC поставляет с конкретной машиной, а некоторые являются неполными сканами. Каждое процитированное здесь значение прочитано минимум в одной полной копии и, где возможно, сверено со вторым источником. Там, где источники расходились, расхождение зафиксировано в части 6.5, а не устранено молча.
`,
      },
    },
  ],
};
