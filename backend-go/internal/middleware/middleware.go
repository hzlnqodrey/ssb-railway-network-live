// Package middleware provides HTTP middleware for the Swiss Railway API.
//
// ============================================================================
// MONOLITHIC VERSION - For Documentation & Comparison
// ============================================================================
// This file is kept for educational purposes to compare with the microservice
// approach where middleware is split into concern-based files:
//   - logging.go, security.go, ratelimit.go, recovery.go, chain.go
//
// COMPARISON:
// ┌─────────────────┬──────────────────────────────────────────────────────────┐
// │ MONOLITH        │ MICROSERVICE                                             │
// ├─────────────────┼──────────────────────────────────────────────────────────┤
// │ middleware.go   │ logging.go + security.go + ratelimit.go + recovery.go    │
// │ (all in one)    │ + chain.go (split by concern)                            │
// ├─────────────────┼──────────────────────────────────────────────────────────┤
// │ Pros:           │ Pros:                                                    │
// │ - Simple        │ - Clear separation of concerns                           │
// │ - Easy to find  │ - Easier to test individually                            │
// │ - Less files    │ - Teams can own different concerns                       │
// │                 │ - Smaller files, easier code review                      │
// ├─────────────────┼──────────────────────────────────────────────────────────┤
// │ Cons:           │ Cons:                                                    │
// │ - Can get large │ - More files to navigate                                 │
// │ - Mixed concerns│ - Need good documentation                                │
// │ - Hard to test  │ - Import paths can get complex                           │
// └─────────────────┴──────────────────────────────────────────────────────────┘
// ============================================================================
package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

// ============================================================================
// LOGGING CONCERN
// ============================================================================

// LoggingMonolith logs all HTTP requests.
func LoggingMonolith(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code
		wrapped := &responseWriterMonolith{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", wrapped.statusCode).
			Dur("duration", time.Since(start)).
			Str("ip", r.RemoteAddr).
			Msg("HTTP Request")
	})
}

// responseWriterMonolith wraps http.ResponseWriter to capture status code.
type responseWriterMonolith struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterMonolith) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ============================================================================
// SECURITY CONCERN
// ============================================================================

// SecurityHeadersMonolith adds security headers to responses.
func SecurityHeadersMonolith(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:")

		next.ServeHTTP(w, r)
	})
}

// ContentTypeMonolith sets the Content-Type header for JSON responses.
func ContentTypeMonolith(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

// CSRFProtectionMonolith provides CSRF protection for mutating HTTP methods.
func CSRFProtectionMonolith(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" || r.Method == "PUT" || r.Method == "DELETE" || r.Method == "PATCH" {
			xRequestedWith := r.Header.Get("X-Requested-With")
			contentType := r.Header.Get("Content-Type")

			isAjax := xRequestedWith == "XMLHttpRequest"
			isJSON := contentType != "" && (contentType == "application/json" ||
				len(contentType) > 16 && contentType[:16] == "application/json")

			if !isAjax && !isJSON {
				log.Warn().
					Str("method", r.Method).
					Str("path", r.URL.Path).
					Msg("CSRF protection: request blocked")

				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"Forbidden","message":"CSRF protection"}`))
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ============================================================================
// RECOVERY CONCERN
// ============================================================================

// RecoveryMonolith recovers from panics and returns 500 error.
func RecoveryMonolith(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Interface("panic", err).Str("path", r.URL.Path).Msg("Recovered from panic")
				http.Error(w, `{"error":"Internal Server Error","message":"An unexpected error occurred"}`, http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// ============================================================================
// RATE LIMITING CONCERN
// ============================================================================

// RateLimiterMonolith provides simple in-memory rate limiting per IP.
type RateLimiterMonolith struct {
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

// NewRateLimiterMonolith creates a new rate limiter.
func NewRateLimiterMonolith(limit int, window time.Duration) *RateLimiterMonolith {
	return &RateLimiterMonolith{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// Limit is the middleware handler for rate limiting.
func (rl *RateLimiterMonolith) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		now := time.Now()
		windowStart := now.Add(-rl.window)

		var recentRequests []time.Time
		for _, t := range rl.requests[ip] {
			if t.After(windowStart) {
				recentRequests = append(recentRequests, t)
			}
		}

		if len(recentRequests) >= rl.limit {
			log.Warn().Str("ip", ip).Int("requests", len(recentRequests)).Msg("Rate limit exceeded")
			w.Header().Set("Retry-After", "60")
			http.Error(w, `{"error":"Too Many Requests","message":"Rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		rl.requests[ip] = append(recentRequests, now)
		next.ServeHTTP(w, r)
	})
}

// ============================================================================
// CHAINING CONCERN
// ============================================================================

// ChainMonolith chains multiple middleware together.
func ChainMonolith(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

// ValidateRequestBodyMonolith validates that request body is within size limits.
func ValidateRequestBodyMonolith(maxSize int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH" {
				r.Body = http.MaxBytesReader(w, r.Body, maxSize)
			}
			next.ServeHTTP(w, r)
		})
	}
}
