// Package main is the entry point for the Swiss Railway Network Go backend.
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/swiss-railway/backend-go/internal/config"
	"github.com/swiss-railway/backend-go/internal/handlers"
	"github.com/swiss-railway/backend-go/internal/middleware"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
	"github.com/swiss-railway/backend-go/internal/websocket"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Setup logging
	setupLogging(cfg)

	log.Info().Msg("🚂 Starting Swiss Railway Network Go API Server...")

	// Initialize services
	gtfsService := services.NewGTFSService(cfg.GTFSDataPath)
	swissService := services.NewSwissTransportService(cfg.SwissTransportAPIURL)

	// Load GTFS data
	if err := gtfsService.LoadData(); err != nil {
		log.Fatal().Err(err).Msg("Failed to load GTFS data")
	}

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(gtfsService)
	stationsHandler := handlers.NewStationsHandler(gtfsService, swissService, cfg.EnableSwissAPI)
	trainsHandler := handlers.NewTrainsHandler(gtfsService, swissService, cfg.EnableSwissAPI)
	favoritesHandler := handlers.NewFavoritesHandler(gtfsService)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(gtfsService, cfg.WSUpdateInterval)
	go wsHub.Run()
	defer wsHub.Stop()

	// Create router
	router := setupRouter(cfg, healthHandler, stationsHandler, trainsHandler, favoritesHandler, wsHub)

	// Setup CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL, "http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300, // 5 minutes
	})

	// Apply middleware chain
	handler := middleware.Chain(
		router,
		middleware.Recovery,
		middleware.Logging,
		middleware.SecurityHeaders,
		middleware.ContentType,
	)

	handler = corsHandler.Handler(handler)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info().
			Str("environment", cfg.Environment).
			Str("port", cfg.Port).
			Msg("🌐 Server starting...")

		printStartupBanner(cfg, gtfsService.GetStats())

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("🛑 Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("✅ Server exited gracefully")
}

// setupLogging configures zerolog with JSON or console format.
func setupLogging(cfg *config.Config) {
	// Set timestamp format for JSON logs
	zerolog.TimeFieldFormat = time.RFC3339Nano

	// Configure log format based on LOG_FORMAT env var
	// Supports: "json" (default, structured), "console" (pretty, for development)
	switch cfg.LogFormat {
	case "console", "pretty":
		// Pretty console output for development
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
			NoColor:    false,
		})
	default:
		// JSON format (default) - structured logging for production/log aggregation
		log.Logger = zerolog.New(os.Stdout).With().
			Timestamp().
			Str("service", "swiss-railway-api").
			Str("environment", cfg.Environment).
			Logger()
	}

	// Set log level from config
	switch cfg.LogLevel {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	log.Debug().
		Str("format", cfg.LogFormat).
		Str("level", cfg.LogLevel).
		Msg("Logging configured")
}

// setupRouter creates and configures the HTTP router.
func setupRouter(
	cfg *config.Config,
	healthHandler *handlers.HealthHandler,
	stationsHandler *handlers.StationsHandler,
	trainsHandler *handlers.TrainsHandler,
	favoritesHandler *handlers.FavoritesHandler,
	wsHub *websocket.Hub,
) *mux.Router {
	router := mux.NewRouter()

	// Root endpoint
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{
			"message": "Swiss Railway Network API (Go)",
			"version": "1.0.0",
			"environment": "%s",
			"timestamp": "%s",
			"endpoints": {
				"health": "/health",
				"trains": "/api/trains",
				"stations": "/api/stations",
				"favorites": "/api/favorites",
				"websocket": "ws://localhost:%s/ws"
			}
		}`, cfg.Environment, time.Now().Format(time.RFC3339), cfg.Port)
	}).Methods("GET")

	// Health routes
	router.HandleFunc("/health", healthHandler.Health).Methods("GET")
	router.HandleFunc("/health/ready", healthHandler.Ready).Methods("GET")
	router.HandleFunc("/health/live", healthHandler.Live).Methods("GET")

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Stations routes
	api.HandleFunc("/stations", stationsHandler.GetStations).Methods("GET")
	api.HandleFunc("/stations/search/{query}", stationsHandler.SearchStations).Methods("GET")
	api.HandleFunc("/stations/nearby/{lat}/{lng}", stationsHandler.GetNearbyStations).Methods("GET")
	api.HandleFunc("/stations/{id}", stationsHandler.GetStation).Methods("GET")
	api.HandleFunc("/stations/{id}/departures", stationsHandler.GetStationDepartures).Methods("GET")

	// Trains routes - Note: specific routes before parametric routes
	api.HandleFunc("/trains", trainsHandler.GetTrains).Methods("GET")
	api.HandleFunc("/trains/live", trainsHandler.GetLiveTrains).Methods("GET")
	api.HandleFunc("/trains/stats/summary", trainsHandler.GetTrainStats).Methods("GET")
	api.HandleFunc("/trains/{id}", trainsHandler.GetTrain).Methods("GET")

	// ========================================================================
	// FAVORITES ROUTES - Learning HTTP POST/PUT/DELETE methods
	// ========================================================================
	// STATIONS:
	// GET    /api/favorites/stations      - List all favorite stations
	// POST   /api/favorites/stations      - Add station to favorites
	// GET    /api/favorites/stations/{id} - Get a favorite station
	// PUT    /api/favorites/stations/{id} - Update favorite station
	// DELETE /api/favorites/stations/{id} - Remove favorite station
	//
	// TRAINS (with auto-follow):
	// GET    /api/favorites/trains        - List all favorite trains
	// POST   /api/favorites/trains        - Add train to favorites
	// GET    /api/favorites/trains/{id}   - Get a favorite train
	// PUT    /api/favorites/trains/{id}   - Update favorite train
	// DELETE /api/favorites/trains/{id}   - Remove favorite train
	// ========================================================================

	// Legacy routes (backwards compatibility)
	api.HandleFunc("/favorites", favoritesHandler.GetFavorites).Methods("GET")
	api.HandleFunc("/favorites", favoritesHandler.CreateFavorite).Methods("POST")
	api.HandleFunc("/favorites/{id}", favoritesHandler.GetFavorite).Methods("GET")
	api.HandleFunc("/favorites/{id}", favoritesHandler.UpdateFavorite).Methods("PUT")
	api.HandleFunc("/favorites/{id}", favoritesHandler.DeleteFavorite).Methods("DELETE")

	// Station favorites (explicit path)
	api.HandleFunc("/favorites/stations", favoritesHandler.GetFavorites).Methods("GET")
	api.HandleFunc("/favorites/stations", favoritesHandler.CreateFavorite).Methods("POST")
	api.HandleFunc("/favorites/stations/{id}", favoritesHandler.GetFavorite).Methods("GET")
	api.HandleFunc("/favorites/stations/{id}", favoritesHandler.UpdateFavorite).Methods("PUT")
	api.HandleFunc("/favorites/stations/{id}", favoritesHandler.DeleteFavorite).Methods("DELETE")

	// Train favorites (with auto-follow feature)
	api.HandleFunc("/favorites/trains", favoritesHandler.GetFavoriteTrains).Methods("GET")
	api.HandleFunc("/favorites/trains", favoritesHandler.CreateFavoriteTrain).Methods("POST")
	api.HandleFunc("/favorites/trains/{id}", favoritesHandler.GetFavoriteTrain).Methods("GET")
	api.HandleFunc("/favorites/trains/{id}", favoritesHandler.UpdateFavoriteTrain).Methods("PUT")
	api.HandleFunc("/favorites/trains/{id}", favoritesHandler.DeleteFavoriteTrain).Methods("DELETE")

	// WebSocket endpoint
	router.HandleFunc("/ws", wsHub.HandleWebSocket)

	return router
}

// printStartupBanner prints the startup information.
func printStartupBanner(cfg *config.Config, stats models.GTFSStats) {
	fmt.Println()
	fmt.Println("╔═══════════════════════════════════════════════════════════════╗")
	fmt.Println("║        🚂 Swiss Railway Network API Server (Go)               ║")
	fmt.Println("╠═══════════════════════════════════════════════════════════════╣")
	fmt.Printf("║  📍 Environment: %-44s ║\n", cfg.Environment)
	fmt.Printf("║  🌐 Port: %-51s ║\n", cfg.Port)
	fmt.Printf("║  🔗 Health: http://localhost:%s/health                       ║\n", cfg.Port)
	fmt.Printf("║  🚀 API: http://localhost:%s/api                             ║\n", cfg.Port)
	fmt.Printf("║  ⚡ WebSocket: ws://localhost:%s/ws                           ║\n", cfg.Port)
	fmt.Println("╠═══════════════════════════════════════════════════════════════╣")
	fmt.Printf("║  📊 Stations: %-49d ║\n", stats.Stops)
	fmt.Printf("║  🛤️  Routes: %-50d ║\n", stats.Routes)
	fmt.Printf("║  🎫 Trips: %-52d ║\n", stats.Trips)
	fmt.Printf("║  ⏰ Stop Times: %-47d ║\n", stats.StopTimes)
	fmt.Println("║  📈 GTFS Status: LOADED ✅                                    ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════════╝")
	fmt.Println()
}
