export const palletizeScript = (input: string, pallet: string) => `// Palletizer - picks boxes off the conveyor and stacks them on the pallet
const input = world.conveyor("${input}");
const pallet = world.pallet("${pallet}");

await robot.home();
while (true) {
  // wait until a box is waiting at the end of the conveyor
  const box = await robot.waitForPart(input.end());
  if (!(await robot.pick(box))) continue;
  await robot.place(pallet.nextSlot());
  if (pallet.isFull()) await pallet.swap();
}
`;

export const tendScript = (input: string, machine: string, output: string) => `// Machine tending - load the CNC, wait for the cycle, unload to the next conveyor
const input = world.conveyor("${input}");
const cnc = world.machine("${machine}");
const output = world.conveyor("${output}");

await robot.home();
while (true) {
  const part = await robot.waitForPart(input.end());
  if (!(await robot.pick(part))) continue;

  await robot.place(cnc.table());      // load the machine tray
  log("machining part...");
  await cnc.process();                 // door closes, spindle runs

  const done = cnc.part();             // the machined part is back on the tray
  if (done && (await robot.pick(done))) {
    await robot.place(output.at(0.45)); // set it down on the outgoing belt
  }
}
`;

export const blankScript = `// Larp robot program (JavaScript, every loop must \`await\`)
await robot.home();
while (true) {
  await robot.wait(1);
}
`;

export const API_DOC = `ROBOT API
  await robot.home()                      move to the home pose
  await robot.moveTo(x, y, z)             move the tool tip (world metres)
  box = await robot.waitForPart(zone)     wait for a box inside a zone
  box = await robot.waitForPalletPart(id) wait for occupied pallet stock
  await robot.inspectSensor(id)           present the held part to a color sensor
  id = await robot.waitForPallet(box, ids) choose a wired destination pallet
  ok  = await robot.pick(box)             approach, grip and lift a box
  ok  = await robot.place(target)         lower, release and retreat
  await robot.grip() / robot.release()    gripper only
  await robot.wait(seconds)               sim time
  await robot.waitForSignal(id?)           wait for a wired trigger/sensor signal
  robot.speed = 1.8                       tool speed (m/s)

WORLD API
  c = world.conveyor("name")   c.end(back, r)  c.at(distance)  c.startPoint()  c.setSpeed(v)  c.run(bool)
  p = world.pallet("name")     p.nextSlot()  p.isFull()  p.count  p.capacity  await p.swap()
  m = world.machine("name")    m.table()  await m.process(sec)  m.part()  m.hasPart()  m.busy
  await world.wait(sec)        await world.waitUntil(() => cond)       world.time
  log("text")                  write to the Output window
  world.signal(id)            true when a wired signal is active
  world.laser("name").blocked  true when the beam is interrupted
  world.press(id, on)          press a wired button`;

export const API_DOC_RU = `API РОБОТА
  await robot.home()                      вернуться в исходное положение
  await robot.moveTo(x, y, z)              переместить инструмент (мировые метры)
  part = await robot.waitForPart(zone)      ждать изделие в зоне
  part = await robot.waitForPalletPart(id)  ждать изделие на паллете
  await robot.inspectSensor(id)             поднести деталь к датчику цвета
  id = await robot.waitForPallet(part, ids) выбрать целевой паллет по сигналам
  ok = await robot.pick(part)              подойти, захватить, поднять
  ok = await robot.place(target)           опустить, отпустить, отойти
  await robot.grip() / robot.release()     управлять захватом
  await robot.wait(seconds)                ждать в симуляционном времени
  await robot.waitForSignal(id?)            ждать сигнал датчика/кнопки по проводу
  robot.speed = 1.8                        скорость инструмента (м/с)

API СЦЕНЫ (имя или постоянный ID компонента)
  c = world.conveyor("id")    c.end(back, r)  c.at(distance)  c.startPoint()  c.setSpeed(v)  c.run(bool)
  p = world.pallet("id")      p.nextSlot()  p.isFull()  p.count  p.capacity  await p.swap()
  m = world.machine("id")     m.table()  await m.process(sec)  m.part()  m.hasPart()  m.busy
  await world.wait(sec)       await world.waitUntil(() => condition)   world.time
  log("текст")               вывести сообщение

В каждом цикле используйте await. Компоненты связаны по ID:
перемещение и переименование не разрывают связи.
Станки принимают входное изделие и создают выходное по рецепту.
Магнитный захват работает только с металлическими изделиями.`;
