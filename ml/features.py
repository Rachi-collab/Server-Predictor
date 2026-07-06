"""
features.py
Feature engineering for the server-failure-prediction model.

Input: a long-format telemetry DataFrame with columns
    ['server_id', 'client_id', 'dc', 'timestamp',
     'mem_pct', 'disk_io_pct', 'net_latency_ms', 'error_rate', 'crash_count']

Output: a feature matrix with one row per (server_id, timestamp) containing
rolling-window aggregates suitable for a gradient-boosted tree model.
"""

import numpy as np
import pandas as pd

ROLLING_WINDOWS_HOURS = [1, 6, 24]
RAW_METRICS = ["mem_pct", "disk_io_pct", "net_latency_ms", "error_rate", "crash_count"]


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling mean / std / slope features per server for each raw metric."""
    df = df.sort_values(["server_id", "timestamp"]).copy()
    grouped = df.groupby("server_id", group_keys=False)

    for window in ROLLING_WINDOWS_HOURS:
        for metric in RAW_METRICS:
            roll = grouped[metric].rolling(window, min_periods=1)
            df[f"{metric}_mean_{window}h"] = roll.mean().reset_index(drop=True)
            df[f"{metric}_std_{window}h"] = roll.std().fillna(0).reset_index(drop=True)

    # Rate of change (slope) over the last 6 hours, per metric
    for metric in RAW_METRICS:
        df[f"{metric}_slope_6h"] = (
            grouped[metric]
            .apply(lambda s: s.diff().rolling(6, min_periods=1).mean())
            .reset_index(drop=True)
            .fillna(0)
        )

    return df


def add_missingness_flags(df: pd.DataFrame) -> pd.DataFrame:
    """Track what fraction of each raw metric was missing before imputation."""
    df = df.copy()
    for metric in RAW_METRICS:
        df[f"{metric}_was_missing"] = df[metric].isna().astype(int)
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """One-hot encode client_id and data center — small cardinality, safe to expand."""
    return pd.get_dummies(df, columns=["client_id", "dc"], prefix=["client", "dc"])


def build_feature_matrix(raw_telemetry: pd.DataFrame) -> pd.DataFrame:
    """Full feature pipeline: missingness flags -> impute -> rolling stats -> encode."""
    df = add_missingness_flags(raw_telemetry)

    # Imputation strategy matches the site's documented policy:
    #   <10% missing  -> forward-fill
    #   10-25%        -> MICE (approximated here with iterative mean fallback
    #                     since a full MICE implementation lives in the training
    #                     notebook / requires `sklearn.experimental.enable_iterative_imputer`)
    missing_frac = df[RAW_METRICS].isna().mean()
    ffill_cols = missing_frac[missing_frac <= 0.10].index.tolist()
    mice_cols = missing_frac[(missing_frac > 0.10) & (missing_frac <= 0.25)].index.tolist()

    if ffill_cols:
        df[ffill_cols] = df.groupby("server_id")[ffill_cols].ffill().bfill()

    if mice_cols:
        try:
            from sklearn.experimental import enable_iterative_imputer  # noqa: F401
            from sklearn.impute import IterativeImputer

            imputer = IterativeImputer(random_state=42, max_iter=10)
            df[mice_cols] = imputer.fit_transform(df[mice_cols])
        except ImportError:
            df[mice_cols] = df[mice_cols].fillna(df[mice_cols].mean())

    df = add_rolling_features(df)
    df = encode_categoricals(df)
    return df


if __name__ == "__main__":
    print("features.py — run train_model.py to build and train the full pipeline.")
