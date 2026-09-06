#!/bin/bash

# Test Health Check
echo "=== Testing Health Check ==="
curl -X GET http://localhost:8080/health | jq .

echo -e "\n=== Testing Height Prediction (Male, 14.5 years) ==="
curl -X POST http://localhost:8080/api/v1/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 14.5,
    "sex": "M",
    "height_cm": 162.0,
    "weight_kg": 52.0,
    "father_height_cm": 178.0,
    "mother_height_cm": 164.0,
    "puberty_signs": {
      "pubic_hair": "2",
      "genitalia": "2",
      "breast_develop": "",
      "axillary_hair": "1",
      "menarche": false
    }
  }' | jq .

echo -e "\n=== Testing Height Prediction (Female, 13 years) ==="
curl -X POST http://localhost:8080/api/v1/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 13.0,
    "sex": "F",
    "height_cm": 155.0,
    "weight_kg": 48.0,
    "father_height_cm": 175.0,
    "mother_height_cm": 162.0,
    "puberty_signs": {
      "pubic_hair": "1",
      "breast_develop": "2",
      "genitalia": "",
      "axillary_hair": "0",
      "menarche": false
    }
  }' | jq .

echo -e "\n=== Testing Invalid Input (Age too young) ==="
curl -X POST http://localhost:8080/api/v1/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 7.0,
    "sex": "M",
    "height_cm": 120.0,
    "weight_kg": 25.0,
    "father_height_cm": 178.0,
    "mother_height_cm": 162.0,
    "puberty_signs": {
      "pubic_hair": "N"
    }
  }' | jq .

echo -e "\n\n=== V2 API TESTS (ML-Enhanced) ==="

echo -e "\n=== V2: High confidence data (Male, 14.5y, all factors) ==="
curl -X POST http://localhost:8080/api/v2/predict-height \
  -H "Content-Type: application/json" \
  -d @examples/v2_predict.json | jq .

echo -e "\n=== V2: Asian child with different ethnic coefficients ==="
curl -X POST http://localhost:8080/api/v2/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 15.0,
    "sex": "F",
    "height_cm": 158.0,
    "weight_kg": 48.0,
    "father_height_cm": 172.0,
    "mother_height_cm": 160.0,
    "bmi": 19.2,
    "height_velocity_cm": 4.0,
    "ethnic_background": "asian",
    "nutrition_level": "good",
    "sleep_hours_per_night": 8.0,
    "exercise_min_per_day": 45,
    "puberty_signs": {
      "pubic_hair": "2",
      "breast_develop": "2"
    }
  }' | jq .

echo -e "\n=== V2: Poor health factors (malnutrition, low sleep, illness) ==="
curl -X POST http://localhost:8080/api/v2/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 12.0,
    "sex": "M",
    "height_cm": 145.0,
    "weight_kg": 38.0,
    "father_height_cm": 175.0,
    "mother_height_cm": 162.0,
    "bmi": 18.0,
    "height_velocity_cm": 2.5,
    "ethnic_background": "caucasian",
    "nutrition_level": "poor",
    "sleep_hours_per_night": 6.0,
    "exercise_min_per_day": 15,
    "chronic_illness": true,
    "puberty_signs": {
      "pubic_hair": "1"
    }
  }' | jq .

echo -e "\n=== V2: Fast grower vs Slow grower comparison ==="
echo "Fast grower (7 cm/year):"
curl -X POST http://localhost:8080/api/v2/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 12.5,
    "sex": "M",
    "height_cm": 153.0,
    "weight_kg": 47.0,
    "father_height_cm": 178.0,
    "mother_height_cm": 164.0,
    "height_velocity_cm": 7.0,
    "ethnic_background": "caucasian",
    "nutrition_level": "excellent",
    "sleep_hours_per_night": 9.0,
    "exercise_min_per_day": 75,
    "puberty_signs": {
      "pubic_hair": "2"
    }
  }' | jq '.predicted_height_cm, .factors'

echo -e "\nSlow grower (2 cm/year):"
curl -X POST http://localhost:8080/api/v2/predict-height \
  -H "Content-Type: application/json" \
  -d '{
    "age": 12.5,
    "sex": "M",
    "height_cm": 153.0,
    "weight_kg": 47.0,
    "father_height_cm": 178.0,
    "mother_height_cm": 164.0,
    "height_velocity_cm": 2.0,
    "ethnic_background": "caucasian",
    "nutrition_level": "fair",
    "sleep_hours_per_night": 7.0,
    "exercise_min_per_day": 20,
    "puberty_signs": {
      "pubic_hair": "1"
    }
  }' | jq '.predicted_height_cm, .factors'
