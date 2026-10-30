# Changelog

All notable changes to this project are documented here. Versions follow the Larp Factory V2 release numbering.

## [Unreleased]

### Fixed
- Camera no longer snaps back to the default view when an object is selected. Only explicit camera actions (view buttons, Fit, or a new layout) re-frame the view.

### Changed
- Repository reorganized: the app is at the repository root; documentation moved to `docs/`; the sample project stays in `examples/`.
- Added `typecheck` and `test:unit` scripts, a CI workflow, `.nvmrc`, `.editorconfig` and `.gitattributes`.

## [2.0.0] - 2026-10-30

### Added
- Local 3D model import (GLB/glTF, FBX, OBJ+MTL, STL, PLY, DAE, 3MF, 3DS, USD, VRML, VTK, AMF, STEP/IGES/BREP).
- Material and texture editing for imported models.
- Rigged, animated workers with a bundled CC0 character and per-role clip uploads.
- Deterministic local AI Factory generator (English and Russian).
- Standalone single-file build.

### Notes
- Application branding remains "Larp Components 5.1"; V2 is the numbered release.
