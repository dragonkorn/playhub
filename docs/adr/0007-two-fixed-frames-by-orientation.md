# Screens use two fixed frames, picked by orientation

Every screen was laid out at one iPad landscape size, 1180×820, and scaled to fit, which keeps layouts pixel-exact against the mockups. ใบ้เรียง needs phones in portrait, so the stage now has a second fixed frame, 390×844, picked when the viewport is portrait and the screen supports it: platform screens support both, and a game lists its `orientations` (C5). We kept fixed frames over fluid responsive layouts, because two exact frames are far less to design and test than every screen size.

Consequence: a platform screen has two layouts, and a landscape-only game in a portrait viewport is shown small, with a notice to rotate.
