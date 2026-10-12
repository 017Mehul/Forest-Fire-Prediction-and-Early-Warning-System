"""Train and evaluate the wildfire model using a chronological holdout.

The resulting scores are offline evaluation metrics, not a guarantee of live
operational performance. The training dataset must contain a reliable datetime
column and both target classes in the train/test periods.
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from xgboost import XGBClassifier

DATA_PATH = Path("final-datasets/Trihourly_Weather_Dataset.csv")
FEATURE_COLUMNS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "surface_pressure",
    "cloud_cover",
    "wind_speed_10m",
    "soil_temperature_0_to_7cm",
    "soil_temperature_7_to_28cm",
    "soil_moisture_0_to_7cm",
    "soil_moisture_7_to_28cm",
]


def main() -> None:
    data = pd.read_csv(DATA_PATH)
    required = {"date", "time", "Severity", *FEATURE_COLUMNS}
    missing = sorted(required.difference(data.columns))
    if missing:
        raise ValueError(f"Training dataset is missing required columns: {missing}")

    data["datetime"] = pd.to_datetime(
        data["date"].astype(str) + " " + data["time"].astype(str),
        format="%m/%d/%y %H:%M:%S",
        errors="raise",
    )
    data["Wildfire_Occurrence"] = (data["Severity"] > 0).astype(np.int32)
    data["Weight"] = np.where(
        data["Severity"] > 0,
        1.0 + data["Severity"].astype(float) / 50.0,
        1.0,
    )
    data = data.sort_values("datetime").reset_index(drop=True)

    rows_before_cleaning = len(data)
    missing_feature_rows = int(data[FEATURE_COLUMNS].isna().any(axis=1).sum())
    if missing_feature_rows:
        data = data.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
    if not np.isfinite(data[FEATURE_COLUMNS].to_numpy(dtype=float)).all():
        raise ValueError("Training features contain non-finite values.")

    split_index = int(len(data) * 0.8)
    if split_index <= 0 or split_index >= len(data):
        raise ValueError("Dataset is too small for a chronological 80/20 split.")

    train = data.iloc[:split_index].copy()
    test = data.iloc[split_index:].copy()
    if train["Wildfire_Occurrence"].nunique() < 2 or test["Wildfire_Occurrence"].nunique() < 2:
        raise ValueError(
            "Both chronological train and test partitions must contain both target classes."
        )

    X_train = train[FEATURE_COLUMNS]
    y_train = train["Wildfire_Occurrence"]
    weights_train = train["Weight"]
    X_test = test[FEATURE_COLUMNS]
    y_test = test["Wildfire_Occurrence"]

    model = XGBClassifier(
        eval_metric="logloss",
        scale_pos_weight=5,
        gamma=0.5,
        max_depth=6,
        min_child_weight=3,
        random_state=42,
    )
    calibrated_model = CalibratedClassifierCV(model, method="sigmoid", cv=3)
    calibrated_model.fit(X_train, y_train, sample_weight=weights_train)

    probabilities = calibrated_model.predict_proba(X_test)[:, 1]
    predicted_classes = calibrated_model.predict(X_test)

    metrics = {
        "evaluation_protocol": "chronological_holdout_80_20",
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "rows_before_cleaning": int(rows_before_cleaning),
        "rows_dropped_for_missing_features": int(missing_feature_rows),
        "train_end": train["datetime"].max().isoformat(),
        "test_start": test["datetime"].min().isoformat(),
        "accuracy": float(accuracy_score(y_test, predicted_classes)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "pr_auc_average_precision": float(average_precision_score(y_test, probabilities)),
        "precision": float(precision_score(y_test, predicted_classes, zero_division=0)),
        "recall": float(recall_score(y_test, predicted_classes, zero_division=0)),
        "f1": float(f1_score(y_test, predicted_classes, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, predicted_classes).tolist(),
        "positive_rate_test": float(y_test.mean()),
        "note": "Offline chronological evaluation; not a guarantee of live operational performance.",
    }

    results = X_test.reset_index(drop=True).copy()
    results["Actual_Wildfire_Occurrence"] = y_test.reset_index(drop=True)
    results["Predicted_Probability"] = probabilities
    results["Predicted_Class"] = predicted_classes
    results["Actual_Severity"] = test["Severity"].reset_index(drop=True)
    results["datetime"] = test["datetime"].reset_index(drop=True)
    results.to_csv("wildfire_predictions.csv", index=False)
    Path("training_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

    joblib.dump(calibrated_model, "wildfire_model.pkl")
    joblib.dump(FEATURE_COLUMNS, "model_features.pkl")
    model_dir = Path("backend/model")
    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated_model, model_dir / "fire_model.pkl")
    (model_dir / "features.json").write_text(
        json.dumps(FEATURE_COLUMNS, indent=2) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(metrics, indent=2))
    print("Model, feature metadata, test predictions, and training_metrics.json were written.")


if __name__ == "__main__":
    main()
