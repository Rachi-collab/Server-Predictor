# Server Predictor

Server Predictor is a small project that brings together a polished front-end demo and a practical machine learning workflow for spotting likely server failures before they become serious issues. The goal is to make the idea feel approachable: a browser-based dashboard for exploration, paired with a reproducible training pipeline that can be extended with real telemetry later.

## What this project includes

- A clean, interactive dashboard built with HTML, CSS, and JavaScript
- A lightweight ML pipeline in the `ml/` folder for synthetic data generation, feature engineering, and model training
- A simple structure that makes it easy to swap in real infrastructure data later

## Why it exists

The project is meant to show how predictive monitoring could work in a realistic environment without requiring a full backend setup. It focuses on the experience of presenting risk signals clearly and making the model workflow understandable.

## Quick start

### 1. Run the ML training pipeline (optional)

```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

### 2. Open the dashboard locally

You do not need a server to view the demo. Open the project folder and launch `index.html` in your browser.

## Project structure

```text
index.html          # Main landing page and dashboard UI
css/style.css       # Styling for the experience
js/                 # Frontend logic, data, and chart rendering
ml/                 # Training workflow and feature engineering code
```

## Notes

The dashboard uses generated sample data so it works instantly and remains easy to test. The machine learning portion is there to show a realistic training flow that can later be connected to real operational data.

## Contributing

If you want to improve the visuals, refine the model workflow, or add new examples, feel free to open an issue or submit a pull request.
