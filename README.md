# Learning Styles Questionnaire (Honey & Mumford) – GitHub Pages

Static web page that:
- renders 80 items as checkboxes
- computes scores for Activist / Reflector / Theorist / Pragmatist
- draws the Honey & Mumford cross (SVG)
- supports entering "Your Name"
- downloads an outcome PNG with name + scores + cross

## Run locally
Use a local server (recommended):
- VS Code "Live Server", or
- `python -m http.server` then open http://localhost:8000

## Deploy on GitHub Pages
1. Put these files in the repo root:
   - `index.html`, `styles.css`, `script.js`, `questions.json`
2. GitHub: **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **main**, Folder: **/(root)**
5. Save.

## Copyright
- Honey & Mumford Questions are copyrighted by Honey & Mumford
- Code copyrighted by Dr Somdip Dey, Regent European University
