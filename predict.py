import argparse
import json
import joblib
import pandas as pd


def load_artifacts(model_path: str, features_path: str):
    model = joblib.load(model_path)
    features = joblib.load(features_path)
    return model, features


def predict_from_json(model, feature_names, json_input: str):
    data = json.loads(json_input)
    input_df = pd.DataFrame([data])
    return run_prediction(model, feature_names, input_df)


def predict_from_csv(model, feature_names, csv_path: str):
    input_df = pd.read_csv(csv_path)
    return run_prediction(model, feature_names, input_df)


def run_prediction(model, feature_names, input_df: pd.DataFrame):
    missing = [f for f in feature_names if f not in input_df.columns]
    if missing:
        raise ValueError(
            f"Missing required feature columns: {missing}. "
            f"Expected columns: {feature_names}"
        )

    ordered_df = input_df[feature_names].copy()
    probabilities = model.predict_proba(ordered_df)[:, 1]
    predicted_class = model.predict(ordered_df)

    output_df = input_df.copy()
    output_df["Predicted_Probability"] = probabilities
    output_df["Predicted_Class"] = predicted_class
    return output_df


def main():
    parser = argparse.ArgumentParser(
        description="Predict wildfire occurrence using saved pickle model."
    )
    parser.add_argument(
        "--model",
        default="wildfire_model.pkl",
        help="Path to trained model pickle file.",
    )
    parser.add_argument(
        "--features",
        default="model_features.pkl",
        help="Path to feature list pickle file.",
    )
    parser.add_argument(
        "--input-csv",
        help="Path to CSV containing feature columns.",
    )
    parser.add_argument(
        "--input-json",
        help="JSON object string with one sample of features.",
    )
    parser.add_argument(
        "--output",
        default="prediction_output.csv",
        help="Output CSV file for predictions.",
    )

    args = parser.parse_args()
    if not args.input_csv and not args.input_json:
        parser.error("Provide either --input-csv or --input-json.")

    model, feature_names = load_artifacts(args.model, args.features)

    if args.input_json:
        result_df = predict_from_json(model, feature_names, args.input_json)
    else:
        result_df = predict_from_csv(model, feature_names, args.input_csv)

    result_df.to_csv(args.output, index=False)
    print(f"Prediction saved to '{args.output}'.")
    print(result_df.head())


if __name__ == "__main__":
    main()
