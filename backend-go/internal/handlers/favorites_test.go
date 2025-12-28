package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

func newTestHandler() *FavoritesHandler {
	gtfsService := services.NewGTFSService("")

	return &FavoritesHandler{
		gtfsService:    gtfsService,
		favorites:      make(map[string]*models.Favorite),
		favoriteTrains: make(map[string]*models.FavoriteTrain),
	}
}

func TestCreateFavorite(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 400 when stationId is missing", func(t *testing.T) {
		body := `{"nickname": "My Station"}`
		req := httptest.NewRequest("POST", "/api/favorites", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateFavorite(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("should return 415 when Content-Type is not JSON", func(t *testing.T) {
		body := `{"stationId": "8507000"}`
		req := httptest.NewRequest("POST", "/api/favorites", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "text/plain")
		w := httptest.NewRecorder()

		handler.CreateFavorite(w, req)

		if w.Code != http.StatusUnsupportedMediaType {
			t.Errorf("Expected status 415, got %d", w.Code)
		}
	})

	t.Run("should return 400 for invalid JSON", func(t *testing.T) {
		body := `invalid json`
		req := httptest.NewRequest("POST", "/api/favorites", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateFavorite(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("should return 400 when station does not exist", func(t *testing.T) {
		body := `{"stationId": "9999999"}`
		req := httptest.NewRequest("POST", "/api/favorites", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateFavorite(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})
}

func TestGetFavorites(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return empty array when no favorites exist", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/favorites", nil)
		w := httptest.NewRecorder()

		handler.GetFavorites(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response models.APIResponse
		if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		favorites, ok := response.Data.([]interface{})
		if !ok {
			t.Fatal("Expected data to be an array")
		}

		if len(favorites) != 0 {
			t.Errorf("Expected 0 favorites, got %d", len(favorites))
		}
	})
}

func TestGetFavorite(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 404 when favorite not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/favorites/non-existent", nil)
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "non-existent"})

		handler.GetFavorite(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", w.Code)
		}
	})
}

func TestUpdateFavorite(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 404 when favorite not found", func(t *testing.T) {
		body := `{"nickname": "Updated Name"}`
		req := httptest.NewRequest("PUT", "/api/favorites/non-existent", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "non-existent"})

		handler.UpdateFavorite(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", w.Code)
		}
	})

	t.Run("should return 415 when Content-Type is not JSON", func(t *testing.T) {
		body := `{"nickname": "Updated Name"}`
		req := httptest.NewRequest("PUT", "/api/favorites/test-id", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "text/plain")
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "test-id"})

		handler.UpdateFavorite(w, req)

		if w.Code != http.StatusUnsupportedMediaType {
			t.Errorf("Expected status 415, got %d", w.Code)
		}
	})
}

func TestDeleteFavorite(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 404 when favorite not found", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/favorites/non-existent", nil)
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "non-existent"})

		handler.DeleteFavorite(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", w.Code)
		}
	})
}

func TestCreateFavoriteTrain(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 400 when trainId is missing", func(t *testing.T) {
		body := `{"nickname": "My Train"}`
		req := httptest.NewRequest("POST", "/api/favorites/trains", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateFavoriteTrain(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("should create favorite train successfully", func(t *testing.T) {
		body := `{"trainId": "IC-123", "nickname": "My Train", "autoFollow": true}`
		req := httptest.NewRequest("POST", "/api/favorites/trains", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateFavoriteTrain(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response models.APIResponse
		if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		favoriteData, ok := response.Data.(map[string]interface{})
		if !ok {
			t.Fatal("Expected data to be a map")
		}

		if trainId, ok := favoriteData["trainId"].(string); !ok || trainId != "IC-123" {
			t.Error("Expected trainId to be IC-123")
		}

		if autoFollow, ok := favoriteData["autoFollow"].(bool); !ok || !autoFollow {
			t.Error("Expected autoFollow to be true")
		}
	})

	t.Run("should return 409 on duplicate", func(t *testing.T) {
		handler := newTestHandler()

		body := `{"trainId": "IC-123"}`
		req1 := httptest.NewRequest("POST", "/api/favorites/trains", bytes.NewBufferString(body))
		req1.Header.Set("Content-Type", "application/json")
		w1 := httptest.NewRecorder()

		handler.CreateFavoriteTrain(w1, req1)

		if w1.Code != http.StatusCreated {
			t.Fatalf("First request should succeed, got status %d", w1.Code)
		}

		// Try to create the same favorite again
		req2 := httptest.NewRequest("POST", "/api/favorites/trains", bytes.NewBufferString(body))
		req2.Header.Set("Content-Type", "application/json")
		w2 := httptest.NewRecorder()

		handler.CreateFavoriteTrain(w2, req2)

		if w2.Code != http.StatusConflict {
			t.Errorf("Expected status 409 for duplicate, got %d", w2.Code)
		}
	})
}

func TestGetFavoriteTrains(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return empty array when no favorites exist", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/favorites/trains", nil)
		w := httptest.NewRecorder()

		handler.GetFavoriteTrains(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response models.APIResponse
		if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		trains, ok := response.Data.([]interface{})
		if !ok {
			t.Fatal("Expected data to be an array")
		}

		if len(trains) != 0 {
			t.Errorf("Expected 0 trains, got %d", len(trains))
		}
	})
}

func TestDeleteFavoriteTrain(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 404 when favorite train not found", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/favorites/trains/non-existent", nil)
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "non-existent"})

		handler.DeleteFavoriteTrain(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", w.Code)
		}
	})
}

func TestUpdateFavoriteTrain(t *testing.T) {
	handler := newTestHandler()

	t.Run("should return 404 when favorite train not found", func(t *testing.T) {
		body := `{"nickname": "Updated"}`
		req := httptest.NewRequest("PUT", "/api/favorites/trains/non-existent", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		req = mux.SetURLVars(req, map[string]string{"id": "non-existent"})

		handler.UpdateFavoriteTrain(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", w.Code)
		}
	})
}
