# EAZYstores design reference (source of truth)

These files are the approved mockups. **Match them exactly.**

- `reference/*.png`  one PNG per screen at 2x: phone screens are 390 x 798 CSS px (the content area, without the device frame and fake status bar); `buyer-home-desktop.png` is 1280 wide; `studio-desktop.png` is the 1180 px studio window.
- `sheets/*.html`  the self-contained mockup pages (CSS inline). Open them in a browser for exact colours, sizes and copy. `sheets/*.png` are overview images.
- `source/`  the Python that generated the mockups: `lib.py` (design tokens, icons, base CSS and components), `art.py` (the illustrated product placeholders), `build.py` (the phone and studio screens), `render.py` (the desktop home and sheet assembly), `shoot.js` and `ref.js` (screenshots).

The phone frame, notch and "9:41" status bar are mockup dressing only. Do not build them.
Product images are drawn placeholders (`art.py`); real seller photos replace them, and the same art is kept as the empty-state and demo-seed imagery.
