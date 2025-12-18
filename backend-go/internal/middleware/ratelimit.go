// Package middleware - Rate Limiting Concern
// This file provides rate limiting middleware.
package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// RateLimiter provides thread-safe in-memory rate limiting per IP.
// For production, consider using Redis-backed rate limiting.
type RateLimiter struct {
	requests map[string][]time.Time
	limit    int
	window   time.Duration
	mutex    sync.RWMutex
}

// NewRateLimiter creates a new rate limiter.
// limit: maximum requests per window
// window: time duration for the sliding window
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}

	// Start cleanup goroutine to prevent memory leaks
	go rl.cleanup()

	return rl
}

// cleanup periodically removes old entries to prevent memory leaks
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		windowStart := now.Add(-rl.window)

		for ip, times := range rl.requests {
			var valid []time.Time
			for _, t := range times {
				if t.After(windowStart) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = valid
			}
		}
		rl.mutex.Unlock()
	}
}

// Limit is the middleware handler for rate limiting.
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		rl.mutex.Lock()
		now := time.Now()
		windowStart := now.Add(-rl.window)

		// Filter to only recent requests
		var recentRequests []time.Time
		for _, t := range rl.requests[ip] {
			if t.After(windowStart) {
				recentRequests = append(recentRequests, t)
			}
		}

		if len(recentRequests) >= rl.limit {
			rl.mutex.Unlock()
			log.Warn().
				Str("ip", ip).
				Int("requests", len(recentRequests)).
				Int("limit", rl.limit).
				Msg("Rate limit exceeded")

			w.Header().Set("Retry-After", "60")
			w.Header().Set("X-RateLimit-Limit", string(rune(rl.limit)))
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, `{"error":"Too Many Requests","message":"Rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		rl.requests[ip] = append(recentRequests, now)
		remaining := rl.limit - len(rl.requests[ip])
		rl.mutex.Unlock()

		// Add rate limit headers
		w.Header().Set("X-RateLimit-Remaining", string(rune(remaining)))

		next.ServeHTTP(w, r)
	})
}
