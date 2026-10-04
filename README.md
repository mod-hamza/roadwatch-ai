# RoadWatch AI 🛣️

**Smart Road Hazard Detection and Reporting System** — a CBSE AI (Subject Code 843) project aligned with **SDG 11 (Sustainable Cities & Communities)** and **SDG 3 (Good Health & Well-being)**.

Users upload a photo of a road hazard (pothole, waterlogging, debris). A computer-vision model trained with **Google Teachable Machine** classifies it **in the browser** with a confidence score. The report (photo, map pin, prediction, verified status) is saved and shown as a pin on an interactive map, revealing areas with repeated hazards for prioritised inspection.

## Features
- 📷 Upload or drag-and-drop a hazard photo
- 🤖 In-browser AI classification (TensorFlow.js + Teachable Machine) with per-class confidence bars
- 🗺️ Interactive Leaflet/OpenStreetMap map — click to place a pin, drag to fine-tune, or use "my location"
- 📍 Unverified pins by default; reports can be marked verified (✔)
- 🗂️ Recent-reports gallery with verify/delete
- 💾 Reports persist via `localStorage`

## Quick start
Open `index.html` with any static server (e.g. `npx serve .`) or just deploy to Vercel — it's a fully static site.

## Making the AI live
The site ships in **demo mode**. To go live, follow [`model/README.md`](model/README.md): train a 4-class image model at [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com), export as TensorFlow.js, and drop the files into `model/`. Training images are in [`training-data/`](training-data/).

## Team
- Project roles & documentation: see the CBSE project documentation (9-section format).

## License
For educational use. Map data © OpenStreetMap contributors.
