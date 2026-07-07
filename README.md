# Server Predictor

A compact project combining a browser-based dashboard and a simple ML pipeline
for predicting server issues. This repository contains a static demo (HTML/CSS/JS)
and a reproducible `ml/` pipeline used for synthetic data generation,
feature engineering, and model training.

Features

- Zero-backend demo dashboard that runs in the browser on generated data.
- A small, reproducible training pipeline in `ml/` that trains an XGBoost model.
- Example feature engineering and evaluation scripts suitable for extension.

Quickstart

1. Install Python dependencies and run the training pipeline (optional):

```
cd ml
pip install -r requirements.txt
python train_model.py
```

1. Open the demo dashboard locally (no server required):

```
open index.html   # or double-click index.html in your file explorer
```

Repository layout

```
index.html          # Demo dashboard (GitHub Pages entry)
css/style.css       # Styles for the demo
js/                 # Frontend scripts (data generation + charts)
ml/                 # ML pipeline: training, features, requirements
```

Contributing

- Feel free to open issues or pull requests. For code changes, follow the
  existing style and add tests where appropriate.

