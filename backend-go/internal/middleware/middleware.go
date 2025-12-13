// Package middleware provides HTTP middleware for the Swiss Railway API.
package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

// Logging logs all HTTP requests.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

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

// responseWriter wraps http.ResponseWriter to capture status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// SecurityHeaders adds security headers to responses.
func SecurityHeaders(next http.Handler) http.Handler {
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

// Recovery recovers from panics and returns 500 error.
func Recovery(next http.Handler) http.Handler {
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

// RateLimiter provides simple in-memory rate limiting per IP.
// For production, use Redis-backed rate limiting.
type RateLimiter struct {
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// Limit is the middleware handler for rate limiting.
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		now := time.Now()
		windowStart := now.Add(-rl.window)

		// Clean old requests and count recent ones
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

// ContentType sets the Content-Type header for JSON responses.
func ContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

// Chain chains multiple middleware together.
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}
