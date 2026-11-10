/* Part 7 — the machine-readable deliverable: one English prompt that lets an AI
   (or a human) rebuild the whole factory inside Visual Components 4.8.
   The raw prompt text is exported as FACTORY_PROMPT so tools/gen-prompt-dl.mjs
   can publish it as a standalone download without duplicating it. */

export const FACTORY_PROMPT = `ROLE AND RULES
You are an automation engineer operating Visual Components 4.8 on this machine. Rebuild the factory described below inside the actual application, section by section, in order. Do not summarise the plan back to me and do not stop after describing it: create the components, set the properties, wire the signals and run the simulation. Where a named component does not exist in your eCatalog, insert the closest substitute and record it in the substitutions list of the final report. Never silently change a dimension, mass, signal number, interval or process parameter: every number in this document is deliberate and traceable. After each section: reset the simulation, confirm it starts without errors, then save as the next version of BrickPlant.vcmx. If the application shows a value that conflicts with this document, follow this document and record the conflict in the report.

TARGET
A decorative brick factory. Zones A-E form the plant; the deliverable is zone D: a pick-and-place palletizing cell in which a FANUC LR Mate 200iD/7L on an R-30iB Plus controller picks terracotta bricks from an infeed belt and stacks them eight layers high onto EUR pallets standing on a 180 degree rotary indexer. Nominal output 600 bricks per hour (takt 6.0 s). One full pallet holds 192 bricks.

WORLD
Units millimetres and degrees, floor at Z = 0. Grid snap 100 mm while static equipment is placed. File name BrickPlant_v01.vcmx, version incremented after every completed section. Reset the simulation before every save so no stray bricks are baked into the initial state.

SECTION 1 - FLOOR AND ZONES
Floor 40000 x 16000 mm (eCatalog: Models by Type > Facilities - Factory > Visual Components > Floor). Zone footprints and X ranges: A forming 8000 x 6000 at X -18000 to -10000; B dryer and tunnel kiln 16000 x 4000 at X -8000 to +8000; C unloading and QC 4000 x 4000 at X +8000 to +12000; D palletizing cell 5000 x 4500 at X +12000 to +17000; E wrapping and dispatch 6000 x 6000 at X +17000 to +23000. Zones A, B, C and E may be represented by flow blocks and a few representative machines; zone D must be modelled in full detail.

SECTION 2 - PRODUCTS AND ASSEMBLIES
Brick_Deco: box 250 x 120 x 65 mm, mass 3.2 kg, terracotta colour. This is the product type created by the feeder.
Pallet_Full: an assembly consisting of one EUR pallet 1200 x 800 x 144 mm, tare 25 kg, and 192 empty slots arranged as 8 layers of 24. Each layer is 4 slots along X at 250 mm pitch by 6 slots along Y at 120 mm pitch. Layer pitch 65 mm in Z. Top of layer 1 bricks at 209 mm, top of layer 8 bricks at 664 mm above floor. OrderIndex 1 to 192 layer by layer, ascending within a layer, so the place process fills the bottom layer first. Do NOT set DefaultProductType on the slots: the place process must see free slots, or the robot will idle forever.
Full pallet check values: 192 x 3.2 = 614.4 kg of brick plus 25 kg tare = 639.4 kg; stack height 664 mm.

SECTION 3 - ZONE D INFEED
Feeder: eCatalog Models by Type > Flow Components > Visual Components > Feeder, placed at the start of zone D. Properties: Product = Brick_Deco; CreationInterval = 3.0 s (20 bricks per minute, twice the robot takt, so the buffer is real); Container = the infeed conveyor.
Conveyor: Models by Type > Conveyors > Visual Components > Conveyor, connected to the feeder by plug-and-play. Properties: ConveyorWidth 400; Speed 100 mm/s; Length 3000 mm edited in the 3D world; ProductSpacing 300 mm. Ten brick positions on the belt equal 60 s of buffer; state that number in the report.
Pick station: a Pick And Place Process segment (in-sensor green, out-sensor red) at the robot end of the belt. Alternative for the taught-program route: plain conveyor plus Conveyor Sensor plus Stopper.
Origin of material: a From Conveyor Process or a second conveyor at the end of zone C so bricks arrive from the kiln line instead of appearing from nothing.

SECTION 4 - ROBOT AND MOUNTING
Robot: FANUC LR Mate 200iD/7L, payload 7 kg, reach 911 mm, repeatability plus/minus 0.01 mm, IP67, controller R-30iB Plus. Floor mount, base plate 190 x 190 mm with 4 x diameter 11 holes; keep 500 mm clearance around the base and 705 mm above it.
Position: base on the centreline of a long side of the pallet station, 650 mm from the pallet turntable centre and about 1100 mm from the pick station, rotated so J1 sweeps between pick and place.
Mandatory reach check before fixing the base: farthest stack corner r = sqrt(600^2 + (400 + d)^2) where d is the base distance to the turntable centre. At d = 650 mm, r = 884 mm which is inside the 911 mm reach; nearest working point 250 mm. A fixed base at the pallet centre is impossible because d would have to be 285 mm or less, which is inside the pallet footprint - that is exactly why the indexer in section 6 exists. Wrist limits: J4/J5 16.6 N m and 0.47 kg m2, J6 9.4 N m and 0.15 kg m2; the tool in section 5 stays inside both.

SECTION 5 - END EFFECTOR
Two-cup vacuum gripper: cups diameter 63 mm, cup pitch 150 mm along the long axis of the brick. Tool mass 0.80 kg; with one brick the flange carries 4.00 kg. Load moment at flange 3.92 N m (24 percent of the J4/J5 allowance), inertia 0.090 kg m2.
Attach it to the J6 flange so Visual Components appends its predefined tool frame as index 17. Name the frame TOOL_Vacuum2Cup and the cell base frame BASE_PalletCell. Set TcpIndex = 17 on every motion, link and controller so bricks are placed at the cup face, not at the bare flange.

SECTION 6 - PALLET STATION
Rotary indexer: a turntable component with a revolute joint driven by signals: DO_Index rotates it 180 degrees in 8 s; the place routine waits for DI_IndexDone before the next layer. Eight indexes per pallet, 64 s total. Turntable centre 650 mm from the robot base (section 4).
Empty pallets in: second feeder with Product = Pallet_Full (the empty-slot assembly) and CreationInterval = 1200 s, or a Shape Feeder into a Pallet Filler if you prefer the component to generate the pattern.
Place target: a Pick And Place Process at the fill position with ProcessType = Place and ProductsOn = Assembly, ReverseSlotOrder unchecked.
Two-position shuttle: shuttle conveyor with a fill position and a swap position; flow PalletFeeder to SwapPosition to FillPosition to OutConveyor; signal PalletReady releases a new empty pallet only after the full one has left. A single-position station loses about 4 percent of the target output to pallet exchange; the shuttle removes that loss.
Full pallets out: transport link or short outbound conveyor to the zone E stretch wrapper. The full pallet is an assembly, so the conveyor moves it, not the robot.
Optional but recommended: a forklift, mobile robot or human resource that removes full pallets, so the statistics show whether the cell ever waits for transport.

SECTION 7 - PROCESSES AND TRANSPORT CONTROLLER
Pick process on the belt and place process on the pallet as above. Transport controller settings: TcpIndex 17; ApproachMotion LIN for both pick and place; PlaceApproach X 0, Y 0, Z 200 mm because layer 8 sits 585 mm above the pallet deck and the approach must clear the finished stack; pick approach along +Z above the belt; GripperSignalClose = 10 on pick after DI 11 confirms vacuum; GripperSignalOpen = 12 at release (blow-off).
Flow graph: Feeder to InConveyor to PickProcess to robot transport to PlaceProcess on the assembly; after each completed layer fire DO_Index and wait DI_IndexDone; when OrderIndex 192 is filled set DO 20 pallet full and release the shuttle.

SECTION 8 - SIGNALS AND I/O MAP
DO[10] vacuum on. DI[11] vacuum reached: the program must wait for it before lifting; this interlock is what separates an integrator model from a student model. DO[12] blow-off at release. DO[20] pallet full. DI[21] pallet in position at the fill station. DI[22] brick at pick position. DO[23] conveyor stop while picking. DO_Index and DI_IndexDone for the turntable. PalletReady from the fill position to the pallet feeder.
Safety I/O: SI_FenceGate, SI_LightCurtain, SO_CellRunning, SO_RobotFault. Behaviour: gate open or curtain interrupted pauses the robot with a hold, not a power-down; SO_CellRunning goes off; a fault sets SO_RobotFault and the stack light turns red.

SECTION 9 - SAFETY LAYOUT OF ZONE D
Perimeter fence around the 5000 x 4500 cell with one gated personnel opening carrying SI_FenceGate. Light curtain across the conveyor opening carrying SI_LightCurtain. R-30iB Plus cabinet outside the fence next to the gate. Signage: robot cell, keep out, wear PPE. Stack light with SO_CellRunning green and SO_RobotFault red. Lay out distances according to ISO 10218-2 and ISO/TS 15066 separating-device conventions.

SECTION 10 - ROBOT PROGRAM
Route B, taught program: registers R[10] layer, R[11] column, R[12] row; teach one corner place position and offset each brick by P_place + (col x 250, row x 120, layer x 65); wait DI[21] before the layer loop; per brick: move to pick, DO[10] on, wait DI[11], lift, move, place, DO[10] off, DO[12] pulse; after each layer wait DI_IndexDone.
Route C, Python: function place_position(col, row, layer) returning ORIGIN + (col x 250, row x 120, layer x 65); triple loop over 8 layers, 6 rows, 4 columns; robot.pick(part, TOOL_Vacuum2Cup) then place at the computed frame.
Double-gripper upgrade (restores the output margin): Capacity 2, TcpIndex "1,2" with the two frames spaced exactly like a paired slot, PlaceMultiple All-At-Once, GripperSignalOpen/Close "101,111" and "102,112". Expected effect: about 1075 bricks per hour instead of about 568.

SECTION 11 - RUN, MEASURE, TUNE
Run at least one complete pallet plus one pallet swap. Measure and record: pick-place cycle time (target 6.0 s or less per brick averaged over a layer); throughput in bricks per hour (single gripper with indexer expects about 568 per hour against the 600 target - report the gap and the double-gripper fix, do not fudge it); belt buffer in seconds (expect 60); index count per pallet (8); collision check in the envelope view; robot reach utilisation at the farthest place point (884 of 911 mm). Export the statistics table.

SECTION 12 - ACCEPTANCE CHECKLIST, ALL MUST PASS
1 The assembly has 192 slots, 8 layers of 24, OrderIndex ascending, bottom layer filled first.
2 Farthest working point 884 mm is inside the 911 mm reach with TOOL_Vacuum2Cup active.
3 Full pallet mass 639.4 kg and stack top 664 mm above floor.
4 Measured takt 6.0 s or less per brick over one full layer.
5 Turntable performs 8 indexes of 180 degrees at 8 s each and the place routine waits for DI_IndexDone.
6 No brick is lifted without DI[11]; every release pulses DO[12].
7 Gate or light curtain stops the robot; lamps follow SO_CellRunning and SO_RobotFault.
8 The substitutions list is empty, or every entry is justified in one sentence.

SECTION 13 - REPORT BACK
Return: the saved file name and version; screenshots of the whole plant top view, zone D in 3D, the reach envelope view, the transport controller graph and the statistics window; the measured-values table from section 11; the substitutions and deviations list; and, depending on the route, the exported FANUC .LS program or the final Python script. Then state in one paragraph whether the cell meets the 600 per hour target and what the single biggest loss is.`;

const FENCE = '~~~text\n' + FACTORY_PROMPT + '\n~~~';

export const part7 = {
  id: 'prompt',
  num: 7,
  title: { en: 'Prompt', ru: 'Промпт' },
  sub: {
    en: 'One English prompt that rebuilds this factory inside Visual Components 4.8',
    ru: 'Один английский промпт, который пересобирает этот завод в Visual Components 4.8',
  },
  sections: [
    {
      id: 'how',
      title: { en: '7.0 How to feed this prompt', ru: '7.0 Как скармливать этот промпт' },
      body: {
        en: `
This last page is the deliverable in machine-readable form: a single English prompt that contains the whole factory build plan — zones, products, coordinates, robot and tool data, signals, processes, run-and-measure instructions and an acceptance checklist. Hand it to anything that can act: an AI agent that drives Visual Components itself, an AI asked to write the Python script for the VC Python console, or a human builder working from a spec.

**Three ways to use it**

1. **An agent with the application open.** Paste the whole prompt as one task. It is written as ordered sections with save points, so the agent can checkpoint: build section, reset, verify, save, next section.
2. **An AI that cannot touch the application.** Ask it to turn the prompt into a Visual Components Python script (\`python\` route C of Part 1.12) plus a property sheet for everything the API cannot create; then run the script in **Tools › Python** inside VC.
3. **A human.** The prompt doubles as a commissioning spec: every number a builder needs is in it, and section 12 is the hand-over checklist.

> HINT — The copy button at the top right of the block copies the prompt without the page chrome; the download link below gives you the same text as a file (\`visualcomponents-factory-prompt.md\`) to attach to a task or a ticket.

> NOTE — The prompt is intentionally English even in the Russian version of this guide: model names, property names and signal names in Visual Components are English, and an English spec avoids a translation step between the document and the application.

[Download the prompt as a file](assets/dl/visualcomponents-factory-prompt.md) · [PDF version](assets/dl/visualcomponents-factory-prompt.pdf)
`,
        ru: `
Последняя страница — результат в машиночитаемом виде: один английский промпт, в котором лежит весь план сборки завода: зоны, продукты, координаты, данные робота и инструмента, сигналы, процессы, инструкции «запустить и измерить» и приёмный чек-лист. Отдайте его любому исполнителю: ИИ-агенту, который сам управляет Visual Components, ИИ, которого просят написать Python-скрипт для консоли VC, или человеку, работающему по спецификации.

**Три способа применения**

1. **Агент с открытым приложением.** Вставьте промпт целиком одной задачей. Он разбит на нумерованные секции с точками сохранения, поэтому агент может работать с контрольными точками: собрал секцию, сброс, проверка, сохранение, следующая секция.
2. **ИИ без доступа к приложению.** Попросите превратить промпт в Python-скрипт для Visual Components (маршрут C из части 1.12) плюс таблицу свойств для всего, что API создать не может; затем выполните скрипт в **Tools › Python** внутри VC.
3. **Человек.** Промпт работает как пусковая спецификация: в нём есть каждое число, нужное сборщику, а секция 12 — это приёмный чек-лист.

> HINT — Кнопка копирования в правом верхнем углу блока копирует промпт без оформления страницы; ссылка ниже отдаёт тот же текст файлом (\`visualcomponents-factory-prompt.md\`), который можно приложить к задаче или тикету.

> NOTE — Промпт намеренно английский и в русской версии руководства: имена моделей, свойств и сигналов в Visual Components английские, и английский текст убирает лишний перевод между документом и приложением.

[Скачать промпт файлом](assets/dl/visualcomponents-factory-prompt.md) · [версия PDF](assets/dl/visualcomponents-factory-prompt.pdf)
`,
      },
    },
    {
      id: 'master',
      title: { en: '7.1 The prompt — complete factory build plan', ru: '7.1 Промпт — полный план сборки завода' },
      body: {
        en: `
Copy everything inside the block below as one message. It is self-contained: it repeats the values from Parts 0–1 so the receiver never needs this guide open.

${FENCE}
`,
        ru: `
Скопируйте всё содержимое блока ниже одним сообщением. Промпт самодостаточен: он повторяет значения из частей 0–1, поэтому получателю не нужно держать это руководство открытым.

${FENCE}
`,
      },
    },
    {
      id: 'chunks',
      title: { en: '7.2 Small context window? Feed it in four passes', ru: '7.2 Мало контекста? Скармливайте за четыре прохода' },
      body: {
        en: `
If the receiver cannot hold the whole prompt at once, split it at the section boundaries and keep one rule across passes: *later passes never change values set by earlier passes; they append.*

| Pass | Sections of the prompt | What exists afterwards |
|---|---|---|
| 1 | Role, target, world, 1–3 | floor, zones, Brick_Deco, Pallet_Full, feeder, belt, pick station |
| 2 | 4–6 | robot mounted and reach-checked, TOOL_Vacuum2Cup, indexer, shuttle |
| 3 | 7–10 | processes, controller, I/O, fence and curtain, robot program |
| 4 | 11–13 | measured run, acceptance checklist, final report |

Between passes ask for a one-line confirmation per acceptance item of section 12 that already applies, and paste that confirmation into the next pass. That keeps the builder honest about what actually exists in the layout versus what was only planned.
`,
        ru: `
Если получатель не вмещает промпт целиком, разрежьте его по границам секций и держите одно правило между проходами: *поздний проход не меняет значения, установленные ранними, он только добавляет.*

| Проход | Секции промпта | Что существует после |
|---|---|---|
| 1 | Роль, цель, мир, 1–3 | пол, зоны, Brick_Deco, Pallet_Full, фидер, лента, позиция съёма |
| 2 | 4–6 | робот установлен и проверен по досягаемости, TOOL_Vacuum2Cup, индексатор, челнок |
| 3 | 7–10 | процессы, контроллер, I/O, ограждение и завеса, программа робота |
| 4 | 11–13 | измеренный прогон, приёмный чек-лист, итоговый отчёт |

Между проходами просите однострочное подтверждение по тем пунктам секции 12, которые уже применимы, и вставляйте эти подтверждения в следующий проход. Так видно, что реально существует в макете, а что только запланировано.
`,
      },
    },
  ],
};
