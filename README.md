# PredictOps — Enterprise Server Failure Prediction

A data science / AI internship project: a machine-learning pipeline that predicts
server failures across heterogeneous, multi-client data center environments,
paired with a live monitoring dashboard.

## What's in this repo

```
server-predictor/
├── index.html          # Marketing site + interactive dashboard (GitHub Pages entry point)
├── css/style.css        # Design system
├── js/
│   ├── data.js           # Client-side synthetic telemetry generator (powers the live demo)
│   ├── charts.js          # Chart.js visualizations
│   ├── dashboard.js       # Dashboard rendering & interactivity
│   └── main.js            # Site chrome: navbar, counters, scroll reveals
└── ml/                   # The actual, runnable data science pipeline
    ├── train_model.py      # Synthetic data generation, training, evaluation
    ├── features.py          # Feature engineering (rolling stats, imputation, encoding)
    └── requirements.txt
```

## Why two layers?

The **dashboard** (`index.html` + `js/`) is a static, zero-backend demo you can
deploy instantly to GitHub Pages — it runs entirely in the browser on generated
sample data so a reviewer can see the product idea without standing up
infrastructure.

The **`ml/` folder** is the real data science work behind the demo: a
reproducible training pipeline with honest, computed metrics (not hand-typed
numbers), so this project stands up to technical scrutiny in a DS/AI
internship context.

## Running the ML pipeline

```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

This generates a synthetic 300-server / 30-day telemetry dataset with injected
missing data (matching the assignment's up-to-25%-missing constraint),
engineers rolling-window features, trains an XGBoost classifier, and prints
precision / recall / F1 / ROC-AUC on a **time-based** holdout split (not a
random shuffle — that would leak future information).

To point this at real telemetry instead of synthetic data, replace
`generate_synthetic_telemetry()` in `train_model.py` with a loader for your
actual logs, keeping the same column schema.

## Deploying the dashboard to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo settings, go to **Pages** → set source to the `main` branch,
   root folder.
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

No build step is required — it's plain HTML/CSS/JS.

## Approach summary (for the assignment writeup)

- **Problem**: binary classification — will a server fail in the next 24h —
  using memory, disk I/O, network latency, error logs, crash logs, and
  maintenance history.
- **Missing data**: forward-fill under 10% missing, MICE imputation between
  10–25% missing, matching the stated constraint.
- **Model**: gradient-boosted trees (XGBoost), chosen for speed
  (sub-2-second inference), interpretability (feature importances / SHAP),
  and strong performance on tabular data — over a deep learning approach
  which would cost more to train and serve without a clear accuracy benefit
  here.
- **Validation**: time-based split to avoid leakage, plus per-client
  evaluation to check the model generalizes across environments rather than
  overfitting to one client's traffic patterns.
- **Cross-client generalization**: categorical encoding of client/data-center
  plus a warm-up/calibration period for new clients (documented on the
  dashboard's "Model info" section) is the proposed path to meeting the
  "works across different client environments" and "auto-adapts to new
  infrastructure" requirements from the brief.
