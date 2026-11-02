# Third-party notices and source information

- Quaternius Animated Human, CC0 1.0: `Quaternius-Animated-Human-CC0.txt`, with full text in `CC0-1.0-legalcode.txt`. The source FBX, customized palette, and derivative animated GLB are in `../source/src/assets/`; the GLB changes clothing colors and foot UVs and uses a subset of clips. Source: https://opengameart.org/content/animated-human-low-poly
- `occt-import-js` 0.0.23 and its Open CASCADE library: `occt-import-js-LGPL-2.1.txt` and `OpenCASCADE-LGPL-2.1.txt`. Exact importer source: https://github.com/kovacsv/occt-import-js/tree/c2148e54b456b571238d35cac037d304053d64b2 ; exact OCCT submodule source: https://github.com/Open-Cascade-SAS/OCCT/tree/d2abb6d844231cb8f29be6894440874a4700e4a5 . The unmodified npm package is https://registry.npmjs.org/occt-import-js/-/occt-import-js-0.0.23.tgz . Source, lockfile and instructions to rebuild/replace the library are included in this release; distributors must review applicable license obligations themselves.
- Embedded Draco and Basis Universal transcoders: Apache License 2.0 texts in `Draco-Apache-2.0.txt` and `Basis-Universal-Apache-2.0.txt` respectively. They are supplied through the pinned Three.js package.
- Other npm dependency notices and license files: `DEPENDENCIES.md` and `npm/`. The inventory is inclusive of some dependencies that may be tree-shaken.
- The Khronos test assets in `../source/tests/fixtures/draco` and `../source/tests/fixtures/ktx` carry their own CC BY 4.0 / CC0 license and attribution files.

No Adobe Mixamo files are bundled. Users must check the terms of any models or animations they import or redistribute, including original assets embedded in exported project files.
