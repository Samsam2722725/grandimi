package estimator

import (
	"testing"
)

func TestPredictHeight_ValidInput(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            12.5,
		Sex:            MALE,
		HeightCM:       150.0,
		WeightKG:       45.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
		PubertySigns: PubertySigns{
			PubicHair: "1",
		},
	}

	resp := PredictHeight(req)

	if resp.ConfidenceLevel == "" {
		t.Error("Expected confidence level, got empty")
	}

	if resp.PredictedHeightCM < 160 || resp.PredictedHeightCM > 190 {
		t.Errorf("Predicted height out of reasonable range: %f", resp.PredictedHeightCM)
	}

	if resp.ConfidenceRange[0] >= resp.ConfidenceRange[1] {
		t.Error("Invalid confidence range")
	}
}

func TestPredictHeight_AgeValidation(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            7.0, // Too young
		Sex:            MALE,
		HeightCM:       150.0,
		WeightKG:       45.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
	}

	resp := PredictHeight(req)

	if resp.ConfidenceLevel != "low" {
		t.Error("Expected low confidence for invalid age")
	}
}

func TestPredictHeight_Female(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            14.0,
		Sex:            FEMALE,
		HeightCM:       155.0,
		WeightKG:       48.0,
		FatherHeightCM: 175.0,
		MotherHeightCM: 162.0,
		PubertySigns: PubertySigns{
			PubicHair:      "2",
			MenstrualCycle: true,
		},
	}

	resp := PredictHeight(req)

	if resp.PredictedHeightCM == 0 {
		t.Error("Expected non-zero prediction")
	}

	if resp.ConfidenceLevel == "low" {
		t.Error("Expected medium or high confidence for female with puberty signs")
	}
}

func TestPredictHeight_HighConfidence(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            14.5,
		Sex:            MALE,
		HeightCM:       162.0,
		WeightKG:       52.0,
		FatherHeightCM: 178.0,
		MotherHeightCM: 164.0,
		PubertySigns: PubertySigns{
			PubicHair: "3",
			Genitalia: "3",
		},
	}

	resp := PredictHeight(req)

	if resp.ConfidenceLevel != "high" {
		t.Errorf("Expected high confidence, got %s", resp.ConfidenceLevel)
	}
}

func TestPredictHeight_PubertySeniorStage(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            17.0,
		Sex:            MALE,
		HeightCM:       178.0,
		WeightKG:       70.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
		PubertySigns: PubertySigns{
			PubicHair: "5",
		},
	}

	resp := PredictHeight(req)

	if resp.PubertyStage != "Fully developed" {
		t.Errorf("Expected 'Fully developed', got %s", resp.PubertyStage)
	}
}
