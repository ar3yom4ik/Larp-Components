import type { RobotProgram } from "../types";

export function programToCode(program: RobotProgram) {
  const targets = program.mode === "palletize" && program.targetIds?.length ? [...new Set(program.targetIds)] : [];
  const input = program.sourceKind === 'pallet' ? '' : `const input = world.conveyor(${JSON.stringify(program.sourceId)});\n`;
  const find = program.sourceKind === 'pallet'
    ? `await robot.waitForPalletPart(${JSON.stringify(program.sourceId)})`
    : `await robot.waitForPart(input.end(${program.pickupBack === undefined ? '' : Number(program.pickupBack)}))`;
  const inspect = program.inspectSensorId ? `  await robot.inspectSensor(${JSON.stringify(program.inspectSensorId)});\n` : '';
  if (targets.length > 1) {
    const before = program.inspectSensorId ? '' : '  const destination = await robot.waitForPallet(part, targets);\n';
    const after = program.inspectSensorId ? '  const destination = await robot.waitForPallet(part, targets);\n' : '';
    return `// Larp Components 5.1 - generated visual workflow\n// Pallets fill in order; color-sensor wires route the detected part.\n${input}const targets = ${JSON.stringify(targets)};\nawait robot.home();\ndo {\n  const part = ${find};\n${before}  if (!(await robot.pick(part))) continue;\n${inspect}${after}  const output = world.pallet(destination);\n  await robot.place(output.nextSlot());\n  if (output.isFull()) robot.advancePallet(destination, targets);\n  await robot.wait(${program.delay});\n} while (${program.repeat});\n`;
  }
  return `// Larp Components 5.1 - generated visual workflow\n// References use stable component IDs; targets follow layout edits.\n${input}const output = world.${program.mode === "palletize" ? "pallet" : "conveyor"}(${JSON.stringify(program.targetId)});\n${["tend", "paint", "assemble"].includes(program.mode) ? `const machine = world.machine(${JSON.stringify(program.machineId)});\n` : ""}\nawait robot.home();\ndo {\n  const part = ${find};\n  if (!(await robot.pick(part))) continue;\n${inspect}${["tend", "paint", "assemble"].includes(program.mode) ? "  await robot.place(machine.table());\n  await machine.process();\n  await robot.pick(machine.part());\n" : ""}  await robot.place(output.${program.mode === "palletize" ? "nextSlot()" : "at(0.48)"});\n${program.mode === "palletize" ? "  if (output.isFull()) await output.swap();\n" : ""}  await robot.wait(${program.delay});\n} while (${program.repeat});\n`;
}
