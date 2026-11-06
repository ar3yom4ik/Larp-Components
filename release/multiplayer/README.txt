Larp Components — Multiplayer LAN helper

1. Extract all files in this archive to the same folder.
2. Install Node.js LTS (20.19 or newer) on each computer.
3. Windows: run Larp_Multiplayer.bat. macOS/Linux: run
   sh Larp_Multiplayer.sh (or node Larp_Multiplayer.cjs).
4. Open http://localhost:4174/ on that computer. Do not open the HTML as a
   file:// URL for multiplayer; browsers cannot discover/host a LAN session.
5. Open CONNECTIVITY > Multiplayer, enter a nickname, and host or join.
   The host must approve each named player. Use Chat beside Statistics.

Each participant runs their own helper. Discovery uses UDP broadcast port
43749 and sessions use TCP 4174 on the same LAN/subnet. Allow these ports in
local firewalls; guest isolation and some managed Wi-Fi/VPNs block discovery.
The helper does not expose the editor interface to other machines: remote
peers can only request to join a session, and require the host's approval.
There is no encryption or authentication beyond that approval. Use only on a
trusted network with trusted participants: shared scenes may contain runnable
robot scripts and imported assets. Closing the host/helper ends the session.
Cameras and graphics/UI settings stay local. Scene edits and the simulation
are shared; the host runs the simulation. A disconnected guest keeps a local
copy of the current scene, with the simulation reset. Stop the helper with
Ctrl+C or close its terminal to release its TCP and UDP ports. If another
process owns a required port, the helper reports the conflict and exits; it
never kills that process.

The standalone HTML still works offline on its own, without the helper, for
single-player use. You can customize ports for special setups with
--port 4174 --discovery-port 43749 --html Larp_Factory_V3.html.
All participants must use the same discovery port.
