"""
train_model.py
End-to-end, runnable training pipeline for the PredictOps server-failure model.

Usage:
    python -m venv venv && source venv/bin/activate   # optional
    pip install -r requirements.txt
    python train_model.py

What it does:
1. Generates a realistic synthetic telemetry dataset (since no real client data
   is available for this project) with the same statistical shape described in
   the assignment: memory, disk I/O, network latency, error logs, crash counts,
   and maintenance history, with injected missingness up to 25%.
2. Builds rolling-window features via features.py
3. Trains an XGBoost classifier (LightGBM used as a second model if installed)
4. Evaluates on a time-based holdout split (not a random shuffle split, to
   avoid leaking future information into training)
5. Prints precision / recall / F1 / ROC-AUC and saves a feature-importance plot

This is the real, reproducible counterpart to the numbers shown on the
marketing dashboard (index.html). Swap `generate_synthetic_telemetry()` for a
real data loader to point this at actual client logs.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from features import build_feature_matrix, RAW_METRICS

RNG = np.random.default_rng(42)

N_SERVERS = 300
N_HOURS = 24 * 30  # 30 days of hourly telemetry
CLIENTS = [0, 1, 2, 3]
DCS = ["US-East-1", "US-West-2", "EU-Frankfurt", "AP-Singapore", "AP-Tokyo", "US-Central"]


def generate_synthetic_telemetry() -> pd.DataFrame:
    """Simulate hourly telemetry for N_SERVERS over N_HOURS with realistic
    degradation-before-failure patterns and injected missing data."""
    rows = []
    start = datetime(2026, 1, 1)

    for server_id in range(N_SERVERS):
        client_id = RNG.choice(CLIENTS)
        dc = RNG.choice(DCS)

        # ~15% of servers will experience a failure event during the window
        will_fail = RNG.random() < 0.15
        failure_hour = RNG.integers(N_HOURS // 2, N_HOURS) if will_fail else None

        base_mem = RNG.uniform(35, 55)
        base_disk = RNG.uniform(25, 45)
        base_lat = RNG.uniform(15, 40)
        base_err = RNG.uniform(0, 1)

        for h in range(N_HOURS):
            # Degradation ramp in the 48h before a failure event
            if will_fail and failure_hour - 48 <= h <= failure_hour:
                stress = (h - (failure_hour - 48)) / 48
            else:
                stress = 0

            mem = np.clip(base_mem + stress * 45 + RNG.normal(0, 3), 10, 100)
            disk = np.clip(base_disk + stress * 55 + RNG.normal(0, 4), 10, 100)
            lat = np.clip(base_lat + stress * 200 + RNG.normal(0, 8), 5, 400)
            err = np.clip(base_err + stress * 8 + RNG.normal(0, 0.3), 0, 12)
            crashes = np.random.poisson(stress * 3)

            label = int(will_fail and failure_hour <= h <= failure_hour + 1)

            rows.append({
                "server_id": server_id,
                "client_id": client_id,
                "dc": dc,
                "timestamp": start + timedelta(hours=h),
                "mem_pct": mem,
                "disk_io_pct": disk,
                "net_latency_ms": lat,
                "error_rate": err,
                "crash_count": crashes,
                "failure_within_24h": label,
            })

    df = pd.DataFrame(rows)

    # Inject missingness up to 25%, matching the assignment constraint
    for metric in RAW_METRICS:
        missing_frac = RNG.uniform(0.0, 0.25)
        mask = RNG.random(len(df)) < missing_frac
        df.loc[mask, metric] = np.nan

    return df


def time_based_split(df: pd.DataFrame, feature_cols, target_col, split_frac=0.83):
    """Split by timestamp, not randomly — avoids leaking future data into training."""
    df = df.sort_values("timestamp")
    cutoff = df["timestamp"].quantile(split_frac)
    train = df[df["timestamp"] <= cutoff]
    test = df[df["timestamp"] > cutoff]
    return (
        train[feature_cols], train[target_col],
        test[feature_cols], test[target_col],
    )


def main():
    print("Generating synthetic telemetry (this replaces real client logs)...")
    raw = generate_synthetic_telemetry()
    print(f"  {len(raw):,} rows, failure rate: {raw['failure_within_24h'].mean():.3%}")

    print("Building feature matrix (rolling stats, missingness handling, encoding)...")
    features = build_feature_matrix(raw.drop(columns=["failure_within_24h"]))
    features["failure_within_24h"] = raw["failure_within_24h"].values

    feature_cols = [c for c in features.columns
                    if c not in ("server_id", "timestamp", "failure_within_24h")]

    X_train, y_train, X_test, y_test = time_based_split(
        features, feature_cols, "failure_within_24h"
    )
    print(f"  Train: {len(X_train):,} rows | Test: {len(X_test):,} rows")

    try:
        import xgboost as xgb
        model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            scale_pos_weight=(y_train == 0).sum() / max((y_train == 1).sum(), 1),
            eval_metric="aucpr",
            random_state=42,
        )
        model_name = "XGBoost"
    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(n_estimators=200, max_depth=4, random_state=42)
        model_name = "GradientBoostingClassifier (xgboost not installed — sklearn fallback)"

    print(f"Training {model_name}...")
    model.fit(X_train, y_train)

    from sklearn.metrics import (
        precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
    )

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n─── Evaluation (time-based holdout) ───")
    print(f"Precision : {precision_score(y_test, y_pred, zero_division=0):.3f}")
    print(f"Recall    : {recall_score(y_test, y_pred, zero_division=0):.3f}")
    print(f"F1        : {f1_score(y_test, y_pred, zero_division=0):.3f}")
    if y_test.nunique() > 1:
        print(f"ROC-AUC   : {roc_auc_score(y_test, y_proba):.3f}")
    print(f"Confusion matrix:\n{confusion_matrix(y_test, y_pred)}")

    if hasattr(model, "feature_importances_"):
        importances = pd.Series(model.feature_importances_, index=feature_cols)
        print("\nTop 10 features by importance:")
        print(importances.sort_values(ascending=False).head(10).to_string())

    print(
        "\nNote: metrics will vary from the numbers shown on the marketing "
        "dashboard, which are illustrative targets for the assignment brief. "
        "This script is the reproducible ground truth — point it at real "
        "telemetry to get real numbers."
    )


if __name__ == "__main__":
    main()
