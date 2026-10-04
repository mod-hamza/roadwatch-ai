# Teachable Machine — step by step (15 minutes)

Use **Standard** image model (NOT "Embedded" — that one is only for mobile apps / TensorFlow Lite).

## 1. Open the project
1. Go to https://teachablemachine.withgoogle.com
2. Click **Get Started** → **Image Project** → **Standard image model**.

## 2. Create the 4 classes
Rename the default classes to exactly these names (spelling matters, the site reads them from the exported `metadata.json`):

- `Pothole`
- `Waterlogging`
- `Debris`
- `Clear Road`

(Use + Add class if you need a 4th one.)

## 3. Upload the training images
The images are in this repo, folder `training-data/`:

| Class | Folder | Images |
|---|---|---|
| Pothole | `training-data/pothole/` | ~86 |
| Waterlogging | `training-data/waterlogging/` | ~38 |
| Debris | `training-data/debris/` | ~50 |
| Clear Road | `training-data/clear_road/` | ~60 |

For each class: click **Upload** (in the class box) → select all files in the matching folder.
Optional but recommended: add 10–20 of your own webcam/phone photos of local roads per class to reduce bias (the CBSE brief likes this).

## 4. Train
Click **Train Model** → keep default settings (Epochs 50, Batch 16, Learning rate 0.001). Takes 1–2 minutes.

## 5. Test quickly
Use the **Import / webcam preview** panel: drag one image you did NOT train on (e.g. a phone photo) and check the prediction + confidence looks sane.

## 6. Export
1. Click **Export Model**.
2. Choose **TensorFlow.js** → **Download**.
3. You get a ZIP containing: `model.json`, `metadata.json`, and one or more `weights.bin` / `group1-shard*.bin` files.

## 7. Put it in the site
1. Unzip the download.
2. Copy ALL of those files into this repo's `model/` folder (replace nothing — the folder is empty apart from the README).
3. Commit and push **to the connected repo**:
   ```
   git add model/
   git commit -m "Add trained Teachable Machine model"
   git push site main
   ```
4. Wait ~1 minute for Vercel to redeploy, then open https://roadwatch-ai-site.vercel.app — the badge in the top-right should turn green and say **AI model: LIVE**.

## 8. Test on the live site
Upload a hazard photo, confirm the prediction card shows your class names, then submit a report and check the pin appears on the map. Screenshot this for your documentation — graders love seeing the confidence score.
