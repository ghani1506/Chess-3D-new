# Footballer Face 3D Chess

A polished browser-based 3D chess game with stylized footballer-inspired face portraits mapped onto the pieces.

## Included

- `index.html` — app shell
- `styles.css` — full UI styling
- `js/main.js` — 3D scene, chess rules, simple AI, input handling
- `js/footballers.js` — SVG face art and player-to-piece mapping

## Features

- 3D board with orbit camera controls
- Fully playable chess game
- Legal move generation
- Castling, en passant, and promotion
- Check, checkmate, and stalemate detection
- Simple built-in AI opponent for black
- Footballer-themed portraits:
  - White: Messi, Ronaldo, Mbappé, Modrić, Haaland, Bellingham
  - Black: Neymar, Salah, De Bruyne, Vinícius, Lewandowski, Kane

## Run locally

Because the app uses ES modules, serve it with a local web server.

### Python

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Push the folder to a GitHub repository.
2. In repository settings, enable GitHub Pages from the main branch root.
3. Wait for deployment and open the provided Pages URL.

## Notes

- The face graphics are original stylized SVG portraits inspired by famous footballers, not photo assets.
- The project is intentionally lightweight and easy to customize.
- To swap players, edit `PLAYER_BY_PIECE` in `js/footballers.js`.
