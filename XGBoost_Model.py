import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.calibration import CalibratedClassifierCV
import joblib

# Load the dataset
data = pd.read_csv('final-datasets/Trihourly_Weather_Dataset.csv')

# Format the date + time into one datetime column to have a cleaner output CSV
data['datetime'] = pd.to_datetime(data['date'] + ' ' + data['time'], format='%m/%d/%y %H:%M:%S')

# Drop the original 'date' and 'time' columns as they are no longer needed
data.drop(['date', 'time'], axis=1, inplace=True)


# Map Severity to binary class with weights
def assign_class_and_weight(row):
    if row['Severity'] == 0:
        return 0, 1.0, row['Severity']  # No wildfire
    else:
        weight = 1.0 + row['Severity'] / 50.0
        return 1, weight, row['Severity']  # Yes wildfire


# Assign a binary class with weights to all the data points
data[['Wildfire_Occurrence', 'Weight', 'Actual_Severity']] = data.apply(assign_class_and_weight, axis=1, result_type="expand")

# Define the feature columns and get the feature data
features_columns = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'surface_pressure',
                    'cloud_cover', 'wind_speed_10m', 'soil_temperature_0_to_7cm', 'soil_temperature_7_to_28cm',
                    'soil_moisture_0_to_7cm', 'soil_moisture_7_to_28cm']
features = data[features_columns]

# Wildfire_Occurrence is our target variable
target = data['Wildfire_Occurrence'].astype(np.float32)
weights = data['Weight'].astype(np.float32)

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test, weights_train, weights_test = train_test_split(
    features, target, weights, test_size=0.2, random_state=42)

# Initialize the XGBClassifier model
model = XGBClassifier(use_label_encoder=False, eval_metric='logloss',
                      scale_pos_weight=5, gamma=0.5, max_depth=6, min_child_weight=3)

# Train the model
model.fit(X_train, y_train, sample_weight=weights_train)

# Apply calibration of our probabilities using CalibratedClassifierCV
calibrated_clf = CalibratedClassifierCV(model, method='sigmoid', cv=3)
calibrated_clf.fit(X_train, y_train, sample_weight=weights_train)

# Predict probabilities and classes for the test set
probabilities = calibrated_clf.predict_proba(X_test)[:, 1]
predicted_classes = calibrated_clf.predict(X_test)

# Creating a DataFrame to summarize and assemble the results
results_df = pd.DataFrame(X_test, columns=features_columns).reset_index(drop=True)
results_df['Actual_Wildfire_Occurrence'] = y_test.reset_index(drop=True)
results_df['Predicted_Probability'] = probabilities
results_df['Predicted_Class'] = predicted_classes
results_df['Actual_Severity'] = data['Actual_Severity'].iloc[y_test.index].values
results_df['datetime'] = data['datetime'].iloc[y_test.index].values

# Get the model metrics
accuracy = accuracy_score(y_test, predicted_classes)
roc_auc = roc_auc_score(y_test, probabilities)
conf_matrix = confusion_matrix(y_test, predicted_classes)
precision = precision_score(y_test, predicted_classes)
recall = recall_score(y_test, predicted_classes)
f1 = f1_score(y_test, predicted_classes)

# Output the results to CSV and print the model metrics
results_df.to_csv('wildfire_predictions.csv', index=False)
joblib.dump(calibrated_clf, 'wildfire_model.pkl')
joblib.dump(features_columns, 'model_features.pkl')
print(f"Accuracy: {accuracy}")
print(f"ROC AUC Score: {roc_auc}")
print(f"Precision: {precision}")
print(f"Recall: {recall}")
print(f"F1 Score: {f1}")
print("Confusion Matrix:\n", conf_matrix)
print("Predictions, actual occurrences, and severities have been saved to 'wildfire_predictions.csv'.")
print("Model saved as 'wildfire_model.pkl' and features saved as 'model_features.pkl'.")