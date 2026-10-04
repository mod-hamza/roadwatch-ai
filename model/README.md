# Teachable Machine model files go here

To make the AI classification LIVE, replace demo mode:

1. Go to https://teachablemachine.withgoogle.com → Get Started → **Image Project** → Standard image model.
2. Create 4 classes exactly named: `Pothole`, `Waterlogging`, `Debris`, `Clear Road`.
   (Names must match app.js CLASSES — metadata labels are used directly.)
3. Upload training images from the `training-data/` folders in this repo
   (recommended: 80–150 images per class; webcam snapshots of local roads help too).
4. Click **Train Model** (default settings are fine).
5. Click **Export Model** → **TensorFlow.js** → **Upload (shareable link)** or **Download**.
   - If you downloaded: unzip it and copy `model.json`, `metadata.json` (and the
     `*.bin` weight shard files) into this `model/` folder.
   - If you got a shareable URL: instead edit `app.js`, replacing the local
     paths `"model/model.json"` and `"model/metadata.json"` with your URL + suffixes
     (e.g. `https://teachablemachine.withgoogle.com/models/XXXXX/model.json`).
6. Reload the site — the badge in the header should turn green and say **AI model: LIVE**.

Note: `metadata.json` missing is how the app detects demo mode, so don't commit
placeholder files here.
