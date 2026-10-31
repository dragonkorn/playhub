# Pointer Events for ship dragging, not a drag library

Open source first would suggest `@dnd-kit/react`, but it is pre-1.0 and its iPad touch behavior is unverified. Placing a ship only needs a snap to a grid cell, a validity check and a finger offset, so dragging uses browser Pointer Events directly, in about 40 lines with no dependency.
