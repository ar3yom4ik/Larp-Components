export const part5 = {
  id: 'report',
  num: '5',
  title: { en: 'The report: warranty claim, tools and conclusions', ru: 'Отчёт: рекламация, инструмент и выводы' },
  sub: {
    en: 'Task section 4. The акт-рекламация for a belt that failed inside the warranty period, the maintenance tool list, the economics, and how to assemble the whole submission.',
    ru: 'Раздел 4 задания. Акт-рекламация на ремень, отказавший в гарантийный период, перечень инструмента для ТО, экономика и сборка всей работы в единый пакет.',
  },
  sections: [
    {
      id: 'structure',
      title: { en: '5.0 How to assemble the report', ru: '5.0 Как собрать отчёт' },
      body: {
        en: `
The assignment has four sections. The report should have the same four, in the same order, so a reviewer can tick them off without hunting.

| Report section | Task requirement | Where it comes from in this guide | Length |
|---|---|---|---|
| 0 · Introduction | context: what plant, what cell, what robot | Part 0 | 1 page |
| 1 · Modelling | the Visual Components 4.8 layout | Part 1 + screenshots + video | 4–6 pages |
| 2 · Diagnostics | INTP-106 causes, J5 belt tension check, backlash action plan | Part 2 | 4–6 pages |
| 3 · ППР | 6-month schedule, daily and quarterly checks, battery replacement with safety rules | Part 3 | 4–5 pages |
| 4 · Emergency | lost mastering, Quick Master with SYSMAST.SV, Single Axis Mastering by witness marks | Part 4 | 3–4 pages |
| 5 · Claim and tools | акт-рекламация, maintenance tool list | Part 5 | 3–4 pages |
| 6 · Conclusions | what was proven, what to do next | Part 5.6 | 1 page |
| 7 · Sources | manuals and documents used | Part 6 | 1 page |
| Appendices | checklists, records, full listings, screenshots | downloads | as needed |

**Rules that raise the mark**

1. **Every number has a source.** Not "the belt tension should be about 18 N" but "J5 belt tension 15.6–20.6 N — Maintenance Manual B-83495EN, §6.1, Table 6.1(b)".
2. **Every claim has evidence.** A screenshot, a measurement sheet, a photograph, or a simulation export.
3. **State your assumptions.** Duty cycle, brick weight, takt, layer count. A stated assumption is engineering; an unstated one is guesswork.
4. **Show the arithmetic.** The takt calculation, the payload check, the downtime economics — reviewers follow a calculation, they do not follow an assertion.
5. **Separate what you measured from what you simulated.** The simulation proves the layout; the manual values prove the maintenance. Do not present a simulated number as a measured one.
6. **Write the conclusions as actions.** "Introduce the quarterly belt check with a 16.5 N trigger" beats "maintenance should be improved".

**The submission package**

~~~text
submission/
  Report.pdf                        ← the written work, sections 0–7
  appendix_A_checklists.pdf         ← daily + quarterly checklists, filled in with example readings
  appendix_B_records.pdf            ← belt tension record, backlash record, mastering record
  appendix_C_claim_act.pdf          ← the акт-рекламация, signed
  appendix_D_sim/
     BrickPlant_v03.vcmx            ← the layout itself
     layout_video.mp4               ← 60 s, camera path from Part 1.14
     layout_3d.pdf                  ← orbitable 3D PDF
     statistics.csv                 ← throughput and utilisation export
     charts.png                     ← the three-curve product count chart
  appendix_E_program/
     PALLETIZE_MAIN.ls              ← post-processed FANUC program
     routine_T1_PICK.ls
     routine_T2_PLACE.ls
  appendix_F_sources.pdf            ← Part 6, with the document numbers and revisions
~~~

> TIP — Keep the layout file name and the report version consistent, and put the date on everything. A reviewer who cannot tell which video belongs to which version of the layout stops trusting the rest.
`,
        ru: `
В задании четыре раздела. В отчёте должно быть столько же и в том же порядке, чтобы рецензент отмечал их по списку, а не искал.

| Раздел отчёта | Требование задания | Откуда берётся в этом руководстве | Объём |
|---|---|---|---|
| 0 · Введение | контекст: какой завод, какая ячейка, какой робот | Часть 0 | 1 стр. |
| 1 · Моделирование | макет в Visual Components 4.8 | Часть 1 + скриншоты + видео | 4–6 стр. |
| 2 · Диагностика | причины INTP-106, проверка натяжения ремня J5, план по люфту | Часть 2 | 4–6 стр. |
| 3 · ППР | график на 6 месяцев, ежедневные и квартальные проверки, замена батареи с правилами безопасности | Часть 3 | 4–5 стр. |
| 4 · Аварийная ситуация | потеря мастерения, Quick Master с SYSMAST.SV, Single Axis Mastering по меткам | Часть 4 | 3–4 стр. |
| 5 · Рекламация и инструмент | акт-рекламация, перечень инструмента для ТО | Часть 5 | 3–4 стр. |
| 6 · Выводы | что доказано, что делать дальше | Часть 5.6 | 1 стр. |
| 7 · Источники | использованные руководства и документы | Часть 6 | 1 стр. |
| Приложения | чек-листы, бланки, полные листинги, скриншоты | файлы для скачивания | по необходимости |

**Правила, которые поднимают оценку**

1. **У каждого числа есть источник.** Не «натяжение ремня должно быть около 18 Н», а «натяжение ремня J5 15,6–20,6 Н — Maintenance Manual B-83495EN, §6.1, таблица 6.1(b)».
2. **У каждого утверждения есть доказательство.** Скриншот, бланк измерения, фотография или экспорт из симуляции.
3. **Формулируйте допущения.** Режим работы, масса кирпича, такт, число слоёв. Заявленное допущение — это инженерия; незаявленное — угадывание.
4. **Показывайте арифметику.** Расчёт такта, проверка нагрузки, экономика простоя: за расчётом рецензент следует, за декларацией — нет.
5. **Разделяйте измеренное и смоделированное.** Симуляция доказывает планировку, значения из руководства доказывают обслуживание. Не выдавайте модельное число за измеренное.
6. **Пишите выводы как действия.** «Ввести квартальную проверку ремня с порогом 16,5 Н» сильнее, чем «обслуживание следует улучшить».

**Пакет к сдаче**

~~~text
submission/
  Report.pdf                        ← письменная работа, разделы 0–7
  appendix_A_checklists.pdf         ← ежедневный + квартальный чек-листы, заполненные примерами показаний
  appendix_B_records.pdf            ← бланк натяжения ремня, бланк люфта, бланк мастерения
  appendix_C_claim_act.pdf          ← акт-рекламация, подписанный
  appendix_D_sim/
     BrickPlant_v03.vcmx            ← сам макет
     layout_video.mp4               ← 60 с, траектория камеры из части 1.14
     layout_3d.pdf                  ← вращаемый 3D PDF
     statistics.csv                 ← экспорт производительности и загрузки
     charts.png                     ← график количества продуктов, три кривые
  appendix_E_program/
     PALLETIZE_MAIN.ls              ← постпроцессированная программа FANUC
     routine_T1_PICK.ls
     routine_T2_PLACE.ls
  appendix_F_sources.pdf            ← часть 6 с номерами документов и ревизиями
~~~

> TIP — Держите имя файла макета и версию отчёта согласованными и ставьте дату на всё. Рецензент, который не может понять, какое видео к какой версии макета относится, перестаёт доверять остальному.
`,
      },
    },
    {
      id: 'warranty',
      title: { en: '5.1 Is it a warranty case?', ru: '5.1 Гарантийный ли это случай' },
      body: {
        en: `
Before writing a claim, establish that you have one. Four questions, in order.

**Q1 — Is the robot still in the warranty period?**

The period is defined by **your purchase contract**, not by a general rule. Commercial terms commonly seen for FANUC robots and controllers are 12 months from commissioning or from delivery, sometimes 18 months from shipment; service contracts may extend individual items. Find:

| Document | What it tells you |
|---|---|
| Purchase contract / specification | warranty period, start date, what is covered |
| Warranty certificate (гарантийный талон) | serial numbers covered, start date, conditions |
| Commissioning / acceptance act (акт ввода в эксплуатацию) | the date the clock starts |
| Service contract, if any | extended coverage, response times, who may perform work |

Write the robot serial number, the controller serial number, the delivery date and the commissioning date into the claim — a claim without them gets returned.

**Q2 — Is the failure a manufacturing defect or an operating condition?**

| Points towards a **manufacturing defect** (warranty) | Points towards **wear / operating** (not warranty) |
|---|---|
| Belt failed or lost tension far earlier than the normal service interval | Belt tension lost gradually over years of normal running |
| Tooth shear, cord rupture, delamination | Normal glazing, even wear |
| Backlash above the limit at low running hours | Backlash growing steadily with hours |
| Reducer noise and metal particles early in life | Reducer at or beyond its rated life |
| The same failure on several machines from the same batch | a single machine |
| Failure with correct maintenance, correct grease, correct payload | Wrong grease, over-greasing, exceeded payload, collision damage |

**Q3 — Did you maintain it as the manual requires?** This is the uncomfortable question, and the task is built around it.

> WARNING — The missing six months of belt-check entries is a real weakness in a warranty claim. A supplier is entitled to argue that the failure resulted from skipped maintenance. You have three honest responses, and the report should contain all three:
>
> 1. **Prove the maintenance that did happen** — running hours from the controller, the entries that do exist, purchase records for grease and batteries, service visit notes. A gap in one column is not a gap in the whole programme.
> 2. **Show the failure is not consistent with the gap** — a belt does not lose all tension in six months if it was correct before; if the measurement shows a defect mode (sheared tooth, delamination) rather than gradual loss, the gap is irrelevant to causation.
> 3. **Own the organisational fault and separate it from the technical one** — state plainly that the inspection regime was deficient, that it has been corrected by the programme in Part 3, and that the defect mode observed is nevertheless a manufacturing matter. A claim that admits and fixes its own weakness is far harder to dismiss than one that hides it.

**Q4 — Has anything voided the warranty?**

| Common voiding condition | Check for this cell |
|---|---|
| Unauthorised repair or modification | was the wrist opened by anyone without FANUC authorisation or an approved service contract? |
| Non-original spare parts or consumables | was the grease A98L-0040-0230? Was the belt the specified part? |
| Operation outside the specification | payload ≤ 7 kg, wrist moments within 16.6 N·m, duty within the rated range |
| Absence of required maintenance | the six-month gap — see Q3 |
| Damage from external causes | collision, flooding, overvoltage, wrong supply |
| Software changes by a third party | modified system variables, non-FANUC post-processors written into the controller |

**If the answer is "not a warranty case"**

Then you still write the act — as an **internal defect act (акт о выявленных недостатках)**, which becomes the input to a repair order, a spare-parts purchase and a corrective-action record. Same document, different addressee. Many student reports stop at "the warranty expired, so nothing to do"; that is the wrong conclusion, because the paperwork exists to drive the repair regardless of who pays.
`,
        ru: `
Прежде чем писать рекламацию, установите, что она у вас есть. Четыре вопроса по порядку.

**В1 — Робот ещё в гарантийном периоде?**

Период определяется **вашим договором поставки**, а не общим правилом. В коммерческой практике для роботов и контроллеров FANUC часто встречаются 12 месяцев с ввода в эксплуатацию или с поставки, иногда 18 месяцев с отгрузки; сервисные контракты могут продлевать отдельные позиции. Найдите:

| Документ | Что он сообщает |
|---|---|
| Договор поставки / спецификация | гарантийный срок, дата начала, что покрывается |
| Гарантийный талон | покрытые серийные номера, дата начала, условия |
| Акт ввода в эксплуатацию | дата, с которой пошёл отсчёт |
| Сервисный контракт, если есть | расширенное покрытие, время реакции, кто вправе выполнять работы |

Внесите в рекламацию серийный номер робота, серийный номер контроллера, дату поставки и дату ввода в эксплуатацию: документ без них возвращают.

**В2 — Это производственный дефект или условия эксплуатации?**

| Указывает на **производственный дефект** (гарантия) | Указывает на **износ / эксплуатацию** (не гарантия) |
|---|---|
| Ремень отказал или потерял натяжение намного раньше нормального межсервисного интервала | Натяжение терялось постепенно за годы нормальной работы |
| Срез зуба, обрыв корда, расслоение | Обычное засаливание, равномерный износ |
| Люфт выше предела при малой наработке | Люфт постепенно рос с наработкой |
| Шум редуктора и металлическая пудра в начале жизни узла | Редуктор на предельном ресурсе или за ним |
| Тот же отказ на нескольких машинах одной партии | одна машина |
| Отказ при правильном обслуживании, правильной смазке, правильной нагрузке | неверная смазка, пересмазка, превышение нагрузки, повреждение при столкновении |

**В3 — Обслуживали ли вы его так, как требует руководство?** Это неудобный вопрос, и задание построено именно на нём.

> WARNING — Отсутствующие записи о проверке ремней за шесть месяцев — реальная слабина гарантийной претензии. Поставщик вправе утверждать, что отказ стал следствием пропущенного обслуживания. Честных ответов три, и в отчёте должны быть все три:
>
> 1. **Доказать обслуживание, которое всё-таки было** — наработка с контроллера, имеющиеся записи, документы о закупке смазки и батарей, отметки о сервисных визитах. Пробел в одной графе не есть пробел во всей программе.
> 2. **Показать, что характер отказа не согласуется с пробелом** — ремень не теряет всё натяжение за шесть месяцев, если до этого был в норме; если измерение показывает дефектный характер (срезанный зуб, расслоение), а не постепенную потерю, пробел не влияет на причинность.
> 3. **Признать организационный дефект и отделить его от технического** — прямо написать, что режим осмотров был недостаточным, что он исправлен программой из части 3 и что наблюдаемый характер дефекта тем не менее относится к производству. Претензия, признающая и устраняющая собственную слабину, отклоняется намного труднее, чем та, что её прячет.

**В4 — Не прекращена ли гарантия?**

| Типичное основание прекращения | Что проверить для этой ячейки |
|---|---|
| Несанкционированный ремонт или доработка | вскрывал ли кисть кто-либо без авторизации FANUC или вне одобренного сервисного контракта |
| Неоригинальные запчасти или расходники | была ли смазка A98L-0040-0230? Соответствовал ли ремень указанной детали? |
| Эксплуатация вне спецификации | нагрузка ≤ 7 кг, моменты в кисти в пределах 16,6 Н·м, режим в номинальных границах |
| Отсутствие требуемого обслуживания | шестимесячный пробел — см. В3 |
| Повреждение от внешних причин | столкновение, затопление, перенапряжение, неверное питание |
| Изменения ПО третьей стороной | модифицированные системные переменные, сторонние постпроцессоры, записанные в контроллер |

**Если ответ — «не гарантийный случай»**

Акт всё равно пишется — как **внутренний акт о выявленных недостатках**, который становится входом для наряда на ремонт, закупки запчастей и записи о корректирующем действии. Тот же документ, другой адресат. Многие студенческие отчёты останавливаются на «гарантия кончилась, делать нечего»; это неверный вывод, потому что документооборот существует, чтобы двигать ремонт независимо от того, кто платит.
`,
      },
    },
    {
      id: 'claim-act',
      title: { en: '5.2 The claim act (акт-рекламация)', ru: '5.2 Акт-рекламация' },
      body: {
        en: `
Templates: [claim-act-template.en.md](assets/dl/claim-act-template.en.md) · [claim-act-template.ru.md](assets/dl/claim-act-template.ru.md)

A claim act is a formal document with a fixed skeleton. Below is a **filled example** for exactly the scenario in the task — a J5 belt that lost tension inside the warranty period. Replace the bracketed values with your own.

~~~text
                                      To: [Supplier / FANUC Russia service]
                                      From: [Plant name, address, contacts]
                                      Ref: contract No. [___] dated [___]

                    WARRANTY CLAIM ACT (АКТ-РЕКЛАМАЦИЯ) No. 07/2027
                    Place: [city]        Date: 16 November 2026

1. COMMISSION
   Chairman: [name], Chief Engineer, [plant]
   Members:  [name], Maintenance Engineer
             [name], Line Manager, Zone D
             [name], representative of [supplier] (invited, notified [date])

2. EQUIPMENT
   Machine:            FANUC LR Mate 200iD/7L 6-axis industrial robot
   Serial number:      [robot s/n]
   Controller:         FANUC R-30iB Plus, s/n [controller s/n], software V[9.40P]
   Date of manufacture:[___]     Date of delivery: [___]
   Commissioned:       [___]     Warranty expires: [___]
   Running hours:      13 480 h at the time of the claim
   Installation:       palletizing cell, zone D, decorative brick line 2

3. DESCRIPTION OF THE DEFECT
   Since [date] the cell has stopped periodically with alarm INTP-106
   "PAUSE.L ... Continue request failed", each stop lasting 30-40 minutes,
   approximately [n] times per week. On [date] visible play was found in the
   J5 axis of the wrist.

4. DIAGNOSIS PERFORMED
   4.1 Alarm history read: INTP-106 entries accompanied by SRVO-038
       (pulse mismatch) on axis 5.
   4.2 Belt tension measured with tensionmeter A97L-0218-0700
       (Mitsuboshi DOCTOR TENSION TYPE-III) at the pose J3 = 80 deg,
       J5 = +/-90 deg, settings: belt mass 0.02083 kg/m, width 4 mm,
       span 187 mm.
       J5 readings: 12.8 / 13.1 / 12.9 N  -> mean 12.9 N
       Specification (Maintenance Manual B-83495EN, section 6.1): 15.6-20.6 N
       RESULT: BELOW the lower limit by 2.7 N.
   4.3 J6 readings: 17.4 / 17.6 / 17.5 N -> mean 17.5 N (within specification).
   4.4 Backlash measured with a dial gauge (0.01 mm) at 180 mm from the
       J5 axis: 0.46 mm. Specification: max 0.18 mm. RESULT: EXCEEDED.
   4.5 Visual inspection: [tooth root cracks / cord exposure / glazing]
       on the J5 belt; pulleys undamaged; grease colour normal,
       no metallic particles; all fastener witness marks intact.
   4.6 Payload verified: 4.00 kg on the flange against a 7 kg rating;
       wrist moment 3.92 N.m against 16.6 N.m. No overload.
   4.7 Operating conditions: ambient temperature [__] deg C, dust level
       normal for the plant, no collisions recorded.

5. MAINTENANCE PERFORMED
   Periodic inspections performed on [list dates]. Belt condition entries
   are absent for the period [___] to [___]; the inspection regime has been
   corrected by PPM programme No. [___] effective [___]. All other items
   (connectors, dust removal, grease condition, battery) were performed
   and recorded.

6. CONCLUSION OF THE COMMISSION
   The observed defect mode - loss of belt tension to 12.9 N with tooth-root
   cracking at 13 480 running hours, against a normal service life of the
   item, together with normal grease condition, intact fasteners and no
   overload - indicates a MANUFACTURING DEFECT of the J5 timing belt
   (part A98L-0040-0286#004-157), not normal wear.
   Consequences: recurring INTP-106 stops, total unplanned downtime
   [__] h, lost output [__] bricks.

7. CLAIM
   7.1 Replace the J5 timing belt free of charge under warranty.
   7.2 Provide or perform single-axis mastering of J5 and J6 after
       replacement, as required by the maintenance manual.
   7.3 Compensate the documented downtime of [__] hours, or extend the
       warranty on the mechanical unit by the same period.
   7.4 Provide a written root-cause analysis of the belt defect.

8. ATTACHMENTS
   A. Belt tension measurement record, 3 sheets
   B. Backlash measurement record
   C. Photographs: witness marks, meter display, belt condition (12 photos)
   D. Alarm history export
   E. Extract from the maintenance log
   F. Controller running-hours screenshot
   G. Downtime record for the period

   Chairman  ______________ / [name] /
   Members   ______________ / [name] /
             ______________ / [name] /
             ______________ / [name] /  (supplier representative)
~~~

**Writing rules that make the act effective**

| Rule | Why |
|---|---|
| State measurements with the instrument, the settings and the pose | a number without a method can always be disputed |
| Quote the manual section for every specification value | it turns "we think" into "the manufacturer states" |
| Separate observation from conclusion | section 4 is facts, section 6 is judgement; never mix them |
| Admit the maintenance gap and show the corrective action | it removes the supplier's strongest counter-argument |
| Quantify the loss in hours and units, not in adjectives | "significant downtime" is ignored; "91 h and 54 600 bricks" is not |
| Make each demand specific and actionable | "replace", "provide", "compensate", with a quantity and a deadline |
| Attach everything and number the attachments | the pack, not the letter, wins the claim |
| Invite the supplier's representative and record that they were notified | a unilateral act is weaker than a joint one |
`,
        ru: `
Шаблоны: [claim-act-template.en.md](assets/dl/claim-act-template.en.md) · [claim-act-template.ru.md](assets/dl/claim-act-template.ru.md)

Акт-рекламация — формальный документ с фиксированным скелетом. Ниже **заполненный пример** ровно для сценария из задания: ремень J5 потерял натяжение в гарантийный период. Замените значения в скобках своими.

~~~text
                                      Кому: [Поставщик / сервис FANUC Россия]
                                      От кого: [наименование завода, адрес, контакты]
                                      Основание: договор № [___] от [___]

                    АКТ-РЕКЛАМАЦИЯ № 07/2027
                    Место составления: [город]     Дата: 16 ноября 2026 г.

1. КОМИССИЯ
   Председатель: [ФИО], главный инженер, [предприятие]
   Члены комиссии: [ФИО], инженер по обслуживанию
                   [ФИО], начальник линии, зона D
                   [ФИО], представитель [поставщик] (приглашён, уведомление от [дата])

2. ИЗДЕЛИЕ
   Машина:             промышленный робот FANUC LR Mate 200iD/7L, 6 осей
   Серийный номер:     [s/n робота]
   Контроллер:         FANUC R-30iB Plus, s/n [s/n контроллера], ПО V[9.40P]
   Дата изготовления:  [___]      Дата поставки: [___]
   Ввод в эксплуатацию:[___]      Гарантия действует до: [___]
   Наработка:          13 480 ч на момент составления акта
   Место установки:    ячейка паллетирования, зона D, линия декоративного кирпича № 2

3. ОПИСАНИЕ ДЕФЕКТА
   Начиная с [дата] ячейка периодически останавливается с аварией INTP-106
   "PAUSE.L ... Continue request failed"; каждый останов длится 30-40 минут,
   примерно [n] раз в неделю. [дата] обнаружена видимая игра (люфт) по оси J5
   кисти робота.

4. ВЫПОЛНЕННАЯ ДИАГНОСТИКА
   4.1 Прочитана история аварий: записи INTP-106 сопровождаются SRVO-038
       (рассогласование импульсов) по оси 5.
   4.2 Натяжение ремня измерено тензометром A97L-0218-0700
       (Mitsuboshi DOCTOR TENSION TYPE-III) в позе J3 = 80 град,
       J5 = +/-90 град; установки: масса ремня 0,02083 кг/м, ширина 4 мм,
       длина ветви 187 мм.
       Отсчёты J5: 12,8 / 13,1 / 12,9 Н  -> среднее 12,9 Н
       Норма (Maintenance Manual B-83495EN, раздел 6.1): 15,6-20,6 Н
       РЕЗУЛЬТАТ: НИЖЕ нижнего предела на 2,7 Н.
   4.3 Отсчёты J6: 17,4 / 17,6 / 17,5 Н -> среднее 17,5 Н (в пределах нормы).
   4.4 Люфт измерен индикатором часового типа (0,01 мм) на расстоянии
       180 мм от оси J5: 0,46 мм. Норма: не более 0,18 мм.
       РЕЗУЛЬТАТ: ПРЕВЫШЕН.
   4.5 Визуальный осмотр: [трещины у основания зубьев / обнажение корда /
       засаливание] ремня J5; шкивы без повреждений; цвет смазки нормальный,
       металлических частиц нет; контрольные метки крепежа не сорваны.
   4.6 Нагрузка проверена: на фланце 4,00 кг при номинале 7 кг;
       момент в кисти 3,92 Н.м при номинале 16,6 Н.м. Перегрузки нет.
   4.7 Условия эксплуатации: температура окружающей среды [__] град C,
       запылённость обычная для производства, столкновений не зафиксировано.

5. ВЫПОЛНЕННОЕ ОБСЛУЖИВАНИЕ
   Периодические осмотры выполнены [перечислить даты]. Записи о состоянии
   ремней отсутствуют за период с [___] по [___]; режим осмотров исправлен
   программой ППР № [___], действующей с [___]. Все остальные пункты
   (разъёмы, удаление пыли, состояние смазки, батареи) выполнены и записаны.

6. ЗАКЛЮЧЕНИЕ КОМИССИИ
   Наблюдаемый характер дефекта - потеря натяжения ремня до 12,9 Н с
   трещинами у основания зубьев при наработке 13 480 ч, на фоне нормального
   состояния смазки, целого крепежа и отсутствия перегрузки - указывает на
   ПРОИЗВОДСТВЕННЫЙ ДЕФЕКТ зубчатого ремня оси J5
   (деталь A98L-0040-0286#004-157), а не на нормальный износ.
   Последствия: повторяющиеся остановы INTP-106, суммарный внеплановый
   простой [__] ч, невыпущенная продукция [__] шт. кирпича.

7. ПРЕТЕНЗИЯ
   7.1 Безвозмездно заменить зубчатый ремень оси J5 по гарантии.
   7.2 Предоставить либо выполнить поосевое мастерение J5 и J6 после замены,
       как того требует руководство по обслуживанию.
   7.3 Возместить документированный простой в объёме [__] ч либо продлить
       гарантию на механический блок на тот же срок.
   7.4 Предоставить письменный анализ коренной причины дефекта ремня.

8. ПРИЛОЖЕНИЯ
   А. Бланк измерения натяжения ремня, 3 листа
   Б. Бланк измерения люфта
   В. Фотоматериалы: контрольные метки, дисплей прибора, состояние ремня (12 фото)
   Г. Экспорт истории аварий
   Д. Выписка из журнала обслуживания
   Е. Скриншот наработки контроллера
   Ж. Журнал простоев за период

   Председатель  ______________ / [ФИО] /
   Члены комиссии ______________ / [ФИО] /
                 ______________ / [ФИО] /
                 ______________ / [ФИО] /  (представитель поставщика)
~~~

**Правила, которые делают акт работающим**

| Правило | Почему |
|---|---|
| Указывать измерения вместе с прибором, установками и позой | число без метода всегда можно оспорить |
| Ссылаться на раздел руководства для каждого нормативного значения | превращает «мы полагаем» в «изготовитель утверждает» |
| Разделять наблюдение и вывод | раздел 4 — факты, раздел 6 — суждение; никогда их не смешивать |
| Признать пробел в обслуживании и показать корректирующее действие | снимает сильнейший контраргумент поставщика |
| Квантифицировать потери в часах и штуках, а не прилагательными | «значительный простой» игнорируют; «91 ч и 54 600 кирпичей» — нет |
| Формулировать каждое требование конкретно и исполнимо | «заменить», «предоставить», «возместить» — с объёмом и сроком |
| Приложить всё и пронумеровать приложения | претензию выигрывает пакет, а не письмо |
| Пригласить представителя поставщика и зафиксировать уведомление | односторонний акт слабее совместного |
`,
      },
    },
    {
      id: 'tools-report',
      title: { en: '5.3 The maintenance tool list, as the task asks for it', ru: '5.3 Перечень инструмента для ТО — так, как его просит задание' },
      body: {
        en: `
The assignment names three items explicitly — **tensionmeter, wrench set, LOCTITE for bolts** — and expects the list to be complete enough to actually do the work. The full technical list with specifications is in Part 3.8; this is the version that goes into the report, grouped by the task it enables.

| Task | Tools and consumables | Quantity |
|---|---|---|
| Belt tension measurement | tensionmeter **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III), steel rule, mirror, torch | 1 kit |
| Backlash measurement | dial gauge 0.01 mm with magnetic base, feeler gauges | 1 kit |
| Bolt torque check | calibrated torque wrenches 1–25 N·m and 5–60 N·m, hex key set 1.5–10 mm, open-end/ring set 8–19 mm | 1 set |
| Thread locking | **LOCTITE 243** (medium), **LOCTITE 263** (high strength), **LOCTITE 518** (flange sealant), **LOCTITE 638** (retaining) | 1 each |
| Opening the wrist | hex keys, screwdrivers (insulated), C-ring pliers, soft-face mallet, gasket picks | 1 set |
| Belt replacement | gear puller 50–150 mm, puller separator, torque wrench, new belt **A98L-0040-0286#004-157**, new gaskets | 1 kit + 1 spare belt |
| Reducer replacement | gear puller, separator, C-ring pliers, LOCTITE 518, grease kit **A05B-1142-K021**, catch trays | 1 kit |
| Greasing | grease **A98L-0040-0230** (Harmonic 4B No.2), syringe kit **A05B-1142-K021**, refill tube **A05B-1139-K022**, new seal bolts | per axis set |
| Battery work | new APC battery unit (4 × C 1.5 V) or external D-cell pack, controller battery **A05B-2650-K030**, multimeter, insulated gloves | 2 sets |
| Electrical checks | digital multimeter, infrared thermometer, insulated screwdrivers | 1 kit |
| Cleaning | lint-free cloths, isopropyl alcohol, low-pressure air, vacuum | consumable |
| Safety | lock-out/tag-out kit with personal padlocks, arm support stand or sling + hoist, barricade tape, safety glasses, nitrile gloves | per technician |
| Documentation | teach pendant, printed manuals B-83494EN and B-83495EN, USB sticks (FAT32), camera, printed checklists | 1 kit |
| Marking | paint marker (contrasting), label printer or adhesive labels | 1 |

**The minimum viable kit** — if the report has to justify a purchase request on a tight budget, this subset makes the quarterly check and the battery replacement possible:

| Item | Why it cannot be omitted |
|---|---|
| Tensionmeter A97L-0218-0700 | there is no accepted alternative method for belt tension |
| Dial gauge 0.01 mm + magnetic base | the only way to measure backlash against the 0.18 mm limit |
| Torque wrench 5–60 N·m, calibrated | the wrist cover is 5.6 N·m; "tight by feel" is how fasteners come loose again |
| LOCTITE 243 and 263 | re-torqued bolts without thread locker loosen again within a quarter |
| Hex key set + screwdrivers | nothing opens without them |
| Multimeter | battery verification, 3.1–3.3 VDC |
| LOTO kit | the legal basis for working with the power off |
| Arm support | the manual requires mechanical support before releasing any brake |

**A note on the tensionmeter specifically**

FANUC specifies its own part number, and it matters: the manual's tension values were established with that instrument's measurement principle (non-contact, vibration-frequency based, with belt mass/width/span as inputs). A contact-type spring tension gauge, or a "pluck it and listen" method, cannot reproduce the 15.6–20.6 N window with the confidence the specification implies. If your plant owns a different make of non-contact vibration tensionmeter, it can be used **provided** you enter the same belt mass, width and span values and you verify it against the FANUC instrument once — and you write that verification into the report.

> TIP — Add a calibration column to the tool list: torque wrenches and dial gauges need periodic calibration certificates. A claim act that quotes a torque value from an uncalibrated wrench is easy to dismiss; one that quotes it from wrench No. TW-014, calibrated 2026-09-02, is not.
`,
        ru: `
Задание называет прямо три позиции — **тензометр, набор ключей, LOCTITE для болтов** — и ожидает перечень, достаточный, чтобы реально выполнить работу. Полный технический список с характеристиками — в части 3.8; здесь версия для отчёта, сгруппированная по задачам, которые инструмент решает.

| Задача | Инструмент и расходники | Количество |
|---|---|---|
| Измерение натяжения ремня | тензометр **A97L-0218-0700** (Mitsuboshi DOCTOR TENSION TYPE-III), металлическая линейка, зеркальце, фонарик | 1 комплект |
| Измерение люфта | индикатор 0,01 мм с магнитной стойкой, набор щупов | 1 комплект |
| Контроль момента затяжки | калиброванные динамометрические ключи 1–25 Н·м и 5–60 Н·м, шестигранники 1,5–10 мм, рожковые/накидные 8–19 мм | 1 набор |
| Фиксация резьбы | **LOCTITE 243** (средний), **LOCTITE 263** (высокопрочный), **LOCTITE 518** (фланцевый герметик), **LOCTITE 638** (вал-втулка) | по 1 |
| Вскрытие кисти | шестигранники, отвёртки (изолированные), съёмник стопорных колец, киянка с мягким бойком, съёмник прокладок | 1 набор |
| Замена ремня | лапчатый съёмник 50–150 мм, сепаратор, динамометрический ключ, новый ремень **A98L-0040-0286#004-157**, новые прокладки | 1 комплект + 1 запасной ремень |
| Замена редуктора | съёмник, сепаратор, съёмник колец, LOCTITE 518, комплект смазки **A05B-1142-K021**, поддоны | 1 комплект |
| Смазка | смазка **A98L-0040-0230** (Harmonic 4B No.2), шприц-комплект **A05B-1142-K021**, туба **A05B-1139-K022**, новые уплотнительные болты | комплект на ось |
| Батарейные работы | новый блок APC (4 × C 1,5 В) или внешний блок D, батарея контроллера **A05B-2650-K030**, мультиметр, диэлектрические перчатки | 2 комплекта |
| Электрические проверки | цифровой мультиметр, инфракрасный термометр, изолированные отвёртки | 1 комплект |
| Очистка | безворсовые салфетки, изопропиловый спирт, воздух низкого давления, пылесос | расходные |
| Безопасность | комплект блокировки/бирок с личными замками, опорная стойка либо строп и таль, сигнальная лента, защитные очки, нитриловые перчатки | на техника |
| Документирование | пульт обучения, печатные руководства B-83494EN и B-83495EN, флешки (FAT32), фотоаппарат, печатные чек-листы | 1 комплект |
| Маркировка | красный маркер (контрастный), принтер этикеток либо самоклеящиеся этикетки | 1 |

**Минимально достаточный комплект** — если в отчёте надо обосновать закупку при ограниченном бюджете, этот поднабор делает возможными квартальную проверку и замену батареи:

| Позиция | Почему без неё нельзя |
|---|---|
| Тензометр A97L-0218-0700 | принятой альтернативы для измерения натяжения ремня нет |
| Индикатор 0,01 мм + магнитная стойка | единственный способ измерить люфт относительно предела 0,18 мм |
| Динамометрический ключ 5–60 Н·м, калиброванный | крышка кисти — 5,6 Н·м; «затянуть на чувство» — это причина повторного ослабления |
| LOCTITE 243 и 263 | подтянутые без фиксатора болты снова ослабнут в течение квартала |
| Набор шестигранников + отвёртки | без них ничего не открывается |
| Мультиметр | проверка батарей, 3,1–3,3 В |
| Комплект LOTO | правовая основа работы при снятом напряжении |
| Опора для руки | руководство требует механической опоры до снятия любого тормоза |

**Отдельно о тензометре**

FANUC указывает собственный номер детали, и это важно: значения натяжения в руководстве установлены для принципа измерения именно этого прибора (бесконтактный, на резонансной частоте, с входными параметрами массы, ширины ремня и длины ветви). Контактный пружинный динамометр или метод «щипнуть и послушать» не воспроизводит окно 15,6–20,6 Н с той достоверностью, которую подразумевает спецификация. Если у предприятия есть другой бесконтактный вибрационный тензометр, его можно применять **при условии**, что вводятся те же значения массы, ширины и длины ветви и что прибор однократно сверен с прибором FANUC — и эта сверка записана в отчёт.

> TIP — Добавьте в перечень колонку калибровки: динамометрическим ключам и индикаторам нужны периодические свидетельства о поверке. Акт-рекламация, цитирующая момент с неповеренного ключа, легко отклоняется; та, что цитирует его с ключа № TW-014, поверенного 02.09.2026, — нет.
`,
      },
    },
    {
      id: 'economics',
      title: { en: '5.4 The economics, so the report has a conclusion a manager can use', ru: '5.4 Экономика — чтобы у отчёта был вывод, пригодный руководителю' },
      body: {
        en: `
Everything below uses the cell's own numbers from Part 0: 600 bricks/h, 6.0 s takt, 192 bricks per pallet, 19.2 min per pallet with the two-position shuttle.

**Cost of the fault as found**

| Item | Value | Basis |
|---|---|---|
| Unplanned stop per INTP-106 | 35 min (30–40 given) | task statement |
| Bricks not produced per stop | 350 | 600 bricks/h × 0.583 h |
| Stops per month (observed) | 4 | 1 per week |
| Lost output per month | 1 400 bricks | 4 × 350 |
| Lost pallets per month | 7.3 | 1 400 ÷ 192 |
| Lost running time per year | 28 h | 4 × 35 min × 12 |
| Additional cost: technician call-out, overtime to recover the schedule | — | plant-specific; state your own rate |

**Cost of the programme**

| Item | Value | Basis |
|---|---|---|
| Planned downtime, 6 months | 12 h | Part 3.7 |
| Planned downtime, per year | 24 h | × 2 |
| Consumables per year | grease, batteries, LOCTITE, gaskets | plant purchase prices |
| Capital: tensionmeter + dial gauge + torque wrenches | one-time | the minimum viable kit from 5.3 |
| Training: one technician on FANUC maintenance | one-time | |

**Net effect**

| | Hours per year | Bricks per year |
|---|---|---|
| Before: unplanned stops | −28 h | −16 800 |
| After: planned downtime | −24 h | −14 400 |
| **Net** | **+4 h of availability** | **+2 400 bricks** |

> NOTE — The honest reading of that table is important: planned maintenance does **not** buy you 28 hours back, because the planned work still takes time. What it buys is (a) predictable timing — 12 hours you schedule into a weekend instead of 28 hours that land during the busiest week, (b) a much lower probability of the expensive failure modes (reducer replacement, lost mastering = 4 h plus a possible day of production), and (c) evidence for the warranty claim. State all three; a report that claims "maintenance saves 28 hours" will be torn apart by anyone who has run a plant.

**The failure modes the programme avoids**

| Event avoided | Typical cost | How the programme avoids it |
|---|---|---|
| Reducer replacement on J5 | 1 day of production + parts + specialist labour | quarterly backlash measurement catches wear before it destroys the reducer |
| Lost mastering after a power-off battery swap | 4 h recovery + re-verification of all taught points | the power-ON rule, printed on the cell (Part 4.7) |
| Dead controller battery → SRAM lost → no programs | days, if there is no backup | quarterly voltage check + monthly backups |
| Mechanical-unit cable failure at 4 years | 2 days planned | it is in the calendar before it becomes an emergency |
| Dropped bricks damaging product and the pallet | scrap + rework | vacuum-reached signal, quarterly cup inspection |

**One paragraph for the report's conclusion**

> QUOTE — The observed INTP-106 stops cost the cell 28 hours and about 16 800 bricks a year. The proposed six-month maintenance programme consumes 24 hours of planned downtime a year, but converts that time into scheduled weekend work, removes the two failure modes that cost days rather than hours, and produces the measurement records on which a warranty claim against the belt defect can be based. The programme is therefore justified on availability risk rather than on hours saved, and its main deliverable is not a saved hour but a documented one.
`,
        ru: `
Всё ниже использует собственные числа ячейки из части 0: 600 кирп/ч, такт 6,0 с, 192 кирпича на паллету, 19,2 мин на паллету при двухпозиционном челноке.

**Стоимость отказа в том виде, в каком он застал ячейку**

| Позиция | Значение | Основание |
|---|---|---|
| Внеплановый останов на один INTP-106 | 35 мин (в задании 30–40) | условие задачи |
| Не выпущено кирпича за останов | 350 | 600 кирп/ч × 0,583 ч |
| Остановов в месяц (наблюдаемо) | 4 | 1 в неделю |
| Потерянный выпуск в месяц | 1 400 кирпичей | 4 × 350 |
| Потеряно паллет в месяц | 7,3 | 1 400 ÷ 192 |
| Потерянное время работы в год | 28 ч | 4 × 35 мин × 12 |
| Дополнительно: вызов техника, сверхурочные для нагона плана | — | зависит от предприятия; подставьте свои ставки |

**Стоимость программы**

| Позиция | Значение | Основание |
|---|---|---|
| Плановый простой за 6 месяцев | 12 ч | часть 3.7 |
| Плановый простой за год | 24 ч | × 2 |
| Расходники в год | смазка, батареи, LOCTITE, прокладки | закупочные цены предприятия |
| Капитальные затраты: тензометр + индикатор + динамометрические ключи | разовые | минимально достаточный комплект из 5.3 |
| Обучение: один техник по обслуживанию FANUC | разовое | |

**Чистый эффект**

| | Часов в год | Кирпичей в год |
|---|---|---|
| До: внеплановые остановы | −28 ч | −16 800 |
| После: плановый простой | −24 ч | −14 400 |
| **Итого** | **+4 ч доступности** | **+2 400 кирпичей** |

> NOTE — Честное прочтение этой таблицы важно: плановое обслуживание **не** возвращает вам 28 часов, потому что плановые работы тоже занимают время. Оно даёт (а) предсказуемое время — 12 часов, которые вы ставите в выходные, вместо 28 часов, падающих на самую загруженную неделю, (б) намного меньшую вероятность дорогих отказов (замена редуктора, потеря мастерения = 4 ч плюс возможный день производства) и (в) доказательства для гарантийной претензии. Напишите все три; отчёт с утверждением «обслуживание экономит 28 часов» разнесёт любой, кто реально руководил заводом.

**Отказы, которых программа позволяет избежать**

| Предотвращённое событие | Типичная стоимость | Как программа его предотвращает |
|---|---|---|
| Замена редуктора J5 | день производства + запчасти + труд специалиста | квартальное измерение люфта ловит износ до разрушения редуктора |
| Потеря мастерения после замены батареи при выключенном питании | 4 ч восстановления + перепроверка всех обученных точек | правило «питание ВКЛ», напечатанное на ячейке (часть 4.7) |
| Мёртвая батарея контроллера → потеря SRAM → нет программ | дни, если нет копии | квартальная проверка напряжения + ежемесячные копии |
| Отказ кабеля механического блока на 4-м году | 2 дня планово | стоит в календаре до того, как станет аварийной |
| Падение кирпичей, порча продукции и паллеты | брак + переделка | сигнал «вакуум достигнут», квартальный осмотр присосок |

**Один абзац для выводов отчёта**

> QUOTE — Наблюдаемые остановы INTP-106 обходятся ячейке в 28 часов и около 16 800 кирпичей в год. Предложенная шестимесячная программа обслуживания потребляет 24 часа планового простоя в год, но переводит это время в запланированные работы в выходные, устраняет два вида отказа, стоящих дней, а не часов, и создаёт измерительные записи, на которых может основываться гарантийная претензия по дефекту ремня. Программа, следовательно, обоснована риском доступности, а не сэкономленными часами, и главный её результат — не сэкономленный час, а задокументированный.
`,
      },
    },
    {
      id: 'conclusions',
      title: { en: '5.5 Conclusions and recommendations', ru: '5.5 Выводы и рекомендации' },
      body: {
        en: `
Write the conclusions as a numbered list of findings followed by a numbered list of actions, each action with an owner and a date. Below is a worked example for this task — adapt the wording, keep the structure.

**Findings**

1. The palletizing cell modelled in Visual Components 4.8 with a FANUC LR Mate 200iD/7L achieves the target output of 600 bricks/h only with a two-position pallet shuttle; a single-position station gives 543 bricks/h (−9.5 %).
2. The robot's payload utilisation is 57 % (4.00 kg of 7 kg) and the wrist moment utilisation is 24 % (3.92 of 16.6 N·m), so the LR Mate 200iD/7L is correctly sized for the duty, and the 911 mm reach covers both the pick point and all pallet corners.
3. INTP-106 is not a root cause but a consequence alarm: it reports that a paused program could not be continued. The root cause must be read from the alarm history.
4. Measured J5 belt tension of 12.9 N is 2.7 N below the specified minimum of 15.6 N (Maintenance Manual B-83495EN §6.1), and measured backlash of 0.46 mm at 180 mm exceeds the 0.18 mm limit.
5. The absence of belt-condition entries in the service log for six months means at least two required quarterly inspections were not performed — an organisational fault that permitted the technical fault to develop unnoticed.
6. Replacing the robot's APC battery with the power off destroys the mastering data; the correct procedure is a power-on swap with the E-stop pressed, completed in under 10 seconds.
7. Mastering is recoverable in 15–20 minutes from a \`SYSMAST.SV\` backup (Quick Master), in 20–30 minutes per axis from witness marks (Single Axis Master), or in 1–2 hours for all axes (Zero Position Master) — but the last route requires re-verification of every taught point.

**Recommendations**

| # | Action | Owner | By |
|---|---|---|---|
| 1 | Replace the J5 belt and master J5 + J6 | maintenance technician | immediately |
| 2 | File the warranty claim act with the measurement pack | maintenance engineer | within 5 working days |
| 3 | Introduce the six-month PPM programme (Part 3.7) with signed checklists | maintenance engineer | this month |
| 4 | Print and post the daily checklist at the cell gate and the battery rule inside the cabinet door | line manager | this week |
| 5 | Purchase the minimum viable tool kit (5.3) | procurement | within 30 days |
| 6 | Establish monthly backups (ALL_OF_ABOVE + SYSMAST.SV) in two locations, with an annual restore test | controls engineer | this month |
| 7 | Run SET QUICK MASTER REF after every mastering event | technician | standing rule |
| 8 | Add the belt-tension trend to the monthly KPI report with a 16.5 N trigger | maintenance engineer | next reporting cycle |
| 9 | Build the two-position pallet shuttle into the real cell layout | process engineer | next project phase |
| 10 | Train one technician on FANUC maintenance (B-83495EN scope) | HR + maintenance | within 6 months |

**What the simulation proved and what it did not**

| Proved | Did not prove |
|---|---|
| The cell layout reaches 600 bricks/h with the stated takt | Real cycle times on a real robot with real dynamics |
| The robot's reach and payload are sufficient | The exact placement accuracy of a specific machine |
| The buffer and shuttle sizing are correct | The behaviour of the kiln and dryer (modelled at time scale) |
| The effect of a 0.3° J5 offset on the stack | The true offset of the actual faulty robot |
| The downtime economics of the three maintenance scenarios | Plant-specific labour and material costs |

Stating both columns is what makes a simulation report credible. A reviewer who sees the "did not prove" column trusts the "proved" column.
`,
        ru: `
Пишите выводы как нумерованный список установленных фактов, за которым идёт нумерованный список действий, у каждого — ответственный и срок. Ниже проработанный пример для этой задачи: адаптируйте формулировки, сохраните структуру.

**Установлено**

1. Ячейка паллетирования, смоделированная в Visual Components 4.8 с роботом FANUC LR Mate 200iD/7L, достигает целевой производительности 600 кирп/ч только при двухпозиционном челноке паллет; однопозиционная станция даёт 543 кирп/ч (−9,5 %).
2. Использование грузоподъёмности робота — 57 % (4,00 кг из 7 кг), использование момента в кисти — 24 % (3,92 из 16,6 Н·м), значит LR Mate 200iD/7L подобран по нагрузке верно, а вылет 911 мм покрывает и точку съёма, и все углы паллеты.
3. INTP-106 — не первопричина, а авария-следствие: она сообщает, что приостановленную программу не удалось продолжить. Первопричину надо читать в истории аварий.
4. Измеренное натяжение ремня J5 12,9 Н ниже нормативного минимума 15,6 Н на 2,7 Н (Maintenance Manual B-83495EN §6.1), а измеренный люфт 0,46 мм на 180 мм превышает предел 0,18 мм.
5. Отсутствие записей о состоянии ремней в журнале обслуживания за шесть месяцев означает, что минимум две обязательные квартальные проверки не выполнены, — организационный дефект, позволивший техническому развиться незамеченным.
6. Замена батареи APC робота при выключенном питании уничтожает данные мастерения; правильная процедура — замена при включённом питании с нажатым аварийным остановом, завершаемая менее чем за 10 секунд.
7. Мастерение восстанавливается за 15–20 минут из копии \`SYSMAST.SV\` (Quick Master), за 20–30 минут на ось по контрольным меткам (Single Axis Master) либо за 1–2 часа по всем осям (Zero Position Master), но последний путь требует перепроверки каждой обученной точки.

**Рекомендации**

| № | Действие | Ответственный | Срок |
|---|---|---|---|
| 1 | Заменить ремень J5 и отмастерить J5 + J6 | техник обслуживания | немедленно |
| 2 | Подать акт-рекламацию с пакетом измерений | инженер по обслуживанию | в течение 5 рабочих дней |
| 3 | Ввести шестимесячную программу ППР (часть 3.7) с подписываемыми чек-листами | инженер по обслуживанию | в этом месяце |
| 4 | Распечатать и повесить ежедневный чек-лист на калитке и правило о батарее на дверце шкафа | начальник линии | на этой неделе |
| 5 | Закупить минимально достаточный комплект инструмента (5.3) | снабжение | в течение 30 дней |
| 6 | Наладить ежемесячные копии (ALL_OF_ABOVE + SYSMAST.SV) в двух местах с ежегодным тестом восстановления | инженер АСУ | в этом месяце |
| 7 | Выполнять SET QUICK MASTER REF после каждого мастерения | техник | постоянно действующее правило |
| 8 | Внести тренд натяжения ремня в ежемесячный отчёт по показателям с порогом 16,5 Н | инженер по обслуживанию | следующий отчётный цикл |
| 9 | Заложить двухпозиционный челнок паллет в реальную планировку ячейки | технолог | следующая фаза проекта |
| 10 | Обучить одного техника обслуживанию FANUC (в объёме B-83495EN) | кадры + служба обслуживания | в течение 6 месяцев |

**Что симуляция доказала и чего не доказала**

| Доказано | Не доказано |
|---|---|
| Планировка ячейки достигает 600 кирп/ч при заявленном такте | Реальные времена цикла на реальном роботе с реальной динамикой |
| Вылета и грузоподъёмности робота достаточно | Точную повторяемость конкретной машины |
| Размеры буфера и челнока верны | Поведение печи и сушилки (смоделированы в масштабе времени) |
| Влияние смещения J5 на 0,3° на штабель | Истинное смещение конкретного неисправного робота |
| Экономику простоев для трёх сценариев обслуживания | Затраты труда и материалов конкретного предприятия |

Указание обеих колонок и делает отчёт о симуляции достоверным. Рецензент, видящий колонку «не доказано», начинает доверять колонке «доказано».
`,
      },
    },
    {
      id: 'checklist-final',
      title: { en: '5.6 Final submission checklist', ru: '5.6 Итоговый чек-лист к сдаче' },
      body: {
        en: `
Tick every line before you submit.

**The task's four sections**

- [ ] INTP-106 causes analysed, with the alarm text, the meaning of the arguments and the remedy from the error code manual
- [ ] J5 belt check with a tensionmeter: instrument part number, pose, settings (belt type, mass, width, span), sequence of operations, target values, three readings
- [ ] Action plan for J5 backlash covering fasteners, belt replacement and reducer replacement, with mastering consequences for each
- [ ] Six-month maintenance schedule with dates, owners and downtime
- [ ] Daily visual inspections: cables, dust cleaning, with a printable checklist
- [ ] Quarterly checks: bolt torque and belt condition, with a printable checklist
- [ ] Battery replacement procedure **with the safety rule stated explicitly** (robot APC: power ON; controller: 30 s on, then off, within 30 min)
- [ ] Emergency scenario: power lost during battery change → what was lost and why
- [ ] Restoration of the zero position explained
- [ ] Quick Master procedure using the \`SYSMAST.SV\` backup, step by step
- [ ] Single Axis Mastering by witness marks, step by step, for the no-backup case
- [ ] Warranty claim act, filled in, with the measurement pack attached
- [ ] Maintenance tool list including tensionmeter, wrench set and LOCTITE

**The modelling part**

- [ ] Layout file opens without missing components
- [ ] Simulation runs one full pallet at ×1 without collisions or dropped products
- [ ] Throughput measured and stated (600 bricks/h target, actual value reported)
- [ ] Video, 3D PDF, 2D layout drawing and BOM exported
- [ ] Post-processed \`.LS\` program included, with a note about UFRAME/UTOOL and the ASCII-upload requirement
- [ ] Screenshots of the Product Type Editor, the assembly slot list, LinkDefaults and the program tree

**Traceability**

- [ ] Every specification value cites a manual number and section
- [ ] Every measurement cites the instrument and the method
- [ ] Assumptions (duty cycle, brick mass, takt) written down
- [ ] The maintenance-log gap acknowledged, explained and corrected by a stated action
- [ ] Sources list complete (Part 6)

> TIP — Read your own report once aloud, from the conclusions backwards. Reading backwards catches unsupported claims, because you meet every assertion before you meet its evidence.
`,
        ru: `
Отметьте каждую строку до сдачи.

**Четыре раздела задания**

- [ ] Причины INTP-106 разобраны: текст аварии, смысл аргументов и remedy из справочника кодов ошибок
- [ ] Проверка ремня J5 тензометром: номер прибора, поза, установки (тип ремня, масса, ширина, ветвь), последовательность операций, целевые значения, три отсчёта
- [ ] План действий по люфту J5, покрывающий крепёж, замену ремня и замену редуктора, с последствиями для мастерения по каждому варианту
- [ ] График обслуживания на 6 месяцев с датами, ответственными и простоем
- [ ] Ежедневные визуальные осмотры: кабели, очистка от пыли, с печатным чек-листом
- [ ] Квартальные проверки: момент затяжки болтов и состояние ремней, с печатным чек-листом
- [ ] Процедура замены батареи **с явно сформулированным правилом безопасности** (APC робота: питание ВКЛ; контроллер: 30 с вкл, затем выкл, в пределах 30 мин)
- [ ] Аварийная ситуация: потеря питания при замене батареи → что потеряно и почему
- [ ] Объяснено восстановление нулевого положения
- [ ] Процедура Quick Master с копией \`SYSMAST.SV\`, пошагово
- [ ] Single Axis Mastering по контрольным меткам, пошагово, для случая без копии
- [ ] Акт-рекламация, заполненный, с приложенным пакетом измерений
- [ ] Перечень инструмента для ТО, включая тензометр, набор ключей и LOCTITE

**Модельная часть**

- [ ] Файл макета открывается без отсутствующих компонентов
- [ ] Симуляция проходит одну полную паллету на ×1 без коллизий и потерянных продуктов
- [ ] Производительность измерена и указана (цель 600 кирп/ч, фактическое значение сообщено)
- [ ] Экспортированы видео, 3D PDF, 2D-чертеж планировки и спецификация
- [ ] Постпроцессированная программа \`.LS\` приложена, с примечанием про UFRAME/UTOOL и требование опции ASCII upload
- [ ] Скриншоты Product Type Editor, списка слотов сборки, LinkDefaults и дерева программы

**Прослеживаемость**

- [ ] Каждое нормативное значение ссылается на номер руководства и раздел
- [ ] Каждое измерение ссылается на прибор и методику
- [ ] Допущения (режим работы, масса кирпича, такт) записаны
- [ ] Пробел в журнале обслуживания признан, объяснён и закрыт заявленным действием
- [ ] Список источников полон (часть 6)

> TIP — Прочитайте собственный отчёт один раз вслух, начиная с выводов и двигаясь назад. Чтение в обратном порядке ловит необоснованные утверждения, потому что вы встречаете каждый тезис раньше, чем его доказательство.
`,
      },
    },
  ],
};
