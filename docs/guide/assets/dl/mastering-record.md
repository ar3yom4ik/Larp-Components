# Mastering record / Бланк мастерения

Cell: ____________  Date: ____________  Running hours: ____________
Robot: FANUC LR Mate 200iD/7L, s/n ____________  Controller: R-30iB Plus, SW V______

## Reason
- [ ] APC battery lost with power OFF (SRVO-062 BZAL)
- [ ] Belt / motor / reducer work on axis: ______
- [ ] SRVO-038 pulse mismatch on axis: ______
- [ ] Other: ______________________

## Method used
- [ ] Quick Master from SYSMAST.SV (backup present, coder not replaced)
- [ ] Quick Master for a single axis
- [ ] Single Axis Master by witness marks — axes: ______
- [ ] Zero Position Master (all axes, no backup)
- [ ] Fixture Position Master

## Procedure checkpoints
- [ ] `$MASTER_ENB = 1` set
- [ ] Arm mechanically supported before any brake release
- [ ] Brake-release variables used: `$PARAM_GROUP.$SV_OFF_ALL`, `$SV_OFF_ENB[*]`; power cycled
- [ ] Witness marks aligned (photograph attached)
- [ ] MSTR POS entered: ______ per axis
- [ ] EXEC performed, ST shows 2 for every mastered axis
- [ ] CALIBRATE performed; power cycle where required
- [ ] Brake variables restored to TRUE; power cycled

## Verification
| Check | Result |
|---|---|
| Master/Cal status all axes done | |
| `$DMR_GRP[1].$MASTER_DONE = TRUE` | |
| Zero position: all six marks aligned | |
| No SRVO/MOTN alarms after restart | |
| Position display matches physical pose | |
| TOOL[17] moves along its own axis | |
| Taught point repeatability spot check | |
| Empty cycle, no MOTN alarms | |
| Loaded pallet at 10 % override | |
| Production speed for one pallet | |

## Closing
- [ ] SET QUICK MASTER REF performed
- [ ] Full backup incl. SYSMAST.SV taken, stored in two locations
- [ ] PPM log updated (next battery date, next quarterly date)
- [ ] Power-ON battery rule posted on the cell wall

Performed by: ______________  Verified by: ______________
Downtime taken: ______ h
