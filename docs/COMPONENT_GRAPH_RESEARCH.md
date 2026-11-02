# Component graph redesign research

The existing factory graph is a settings/data graph: its output compiles to a fixed
`GenOptions` layout. It does **not** model the factory topology requested for the next
version. It must not be presented as the completed component graph.

References consulted:

- [FactorySimPy model description](https://factorysimpy.github.io/FactorySimPy/):
  source, machine and sink are independent processing elements, with explicitly
  connected transport edges. Each node holds incoming and outgoing connections.
- [Visual Components Connect Signals](https://help.visualcomponents.com/4.9/Premium/en/English/Layout%20Configuration/Connect_Signals.htm):
  selected component and compatible components show signal editors in the 3D world;
  robot inputs and outputs are separate and numbered; wires show connections.
- [Visual Components Component Graph](https://help.visualcomponents.com/4.8/Premium/en/English/Component%20Modeling/Component_Graph_panel.htm):
  physical interfaces and abstract signal interfaces are distinct; flow ports connect
  paths while abstract interfaces carry remote data.
- [Processing networks](https://sim4edu.com/explain/what-is-process-oriented-simulation):
  source → processing nodes → sink models actual order of product flow.

Implementation implications: component nodes must instantiate and configure actual
scene components; graph edges must determine placement and bindings, not just parameter
precedence. Transport connections and Boolean signal connections are different types.
Unsupported topologies must be diagnosed rather than drawn as working. Existing projects
and graphs need an explicit migration or a separate legacy mode. 3D I/O wiring needs
persisted connections and simulation semantics, not just decorative lines. Robot
programs currently bind components via `sourceId`, `targetId` and `machineId`; any
I/O implementation must specify how its signals affect the engine rather than conflating
those bindings with Boolean signals.
