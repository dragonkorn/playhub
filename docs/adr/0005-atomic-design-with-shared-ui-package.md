# Atomic design, with a shared UI package

All UI follows atomic design, with shared atoms, molecules, organisms and templates in `packages/ui`, while each game keeps its own components. A test enforces the layer rules, because folder conventions alone drift. Games stay plug-ins: they depend on `@playhub/ui`, never on the platform.
