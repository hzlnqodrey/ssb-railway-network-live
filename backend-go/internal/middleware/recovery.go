// Package middleware - Recovery Concern
// This file provides panic recovery middleware.
package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/rs/zerolog/log"
)

// Recovery recovers from panics and returns a 500 error.
// Prevents the server from crashing on unhandled panics.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Log with stack trace for debugging
				log.Error().
					Interface("panic", err).
					Str("path", r.URL.Path).
					Str("method", r.Method).
					Str("stack", string(debug.Stack())).
					Msg("Recovered from panic")

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"error":"Internal Server Error","message":"An unexpected error occurred"}`))
			}
		}()

		next.ServeHTTP(w, r)
	})
}
