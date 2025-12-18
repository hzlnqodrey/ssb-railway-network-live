// Package middleware - Security Concern
// This file provides security-related middleware (headers, CSRF, XSS protection).
package middleware

import (
	"net/http"

	"github.com/rs/zerolog/log"
)

// SecurityHeaders adds essential security headers to all responses.
// These headers protect against common web vulnerabilities.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable browser XSS filter
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Control referrer information
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https:; connect-src 'self' ws: wss:")

		next.ServeHTTP(w, r)
	})
}

// CSRFProtection provides CSRF protection for mutating HTTP methods.
//
// LEARNING NOTES - CSRF (Cross-Site Request Forgery):
//   - Attack: Malicious site tricks user's browser to make unwanted request
//   - Example: Hidden form on evil.com that POSTs to yourbank.com
//   - Browser automatically includes cookies, so bank thinks it's legit
//
// PROTECTION STRATEGIES:
//  1. Custom Header: X-Requested-With header can't be set cross-origin
//  2. Content-Type: Only accept application/json (forms can't send this)
//  3. SameSite Cookies: Cookies won't be sent from cross-origin requests
func CSRFProtection(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only check mutating methods
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
					Str("content_type", contentType).
					Msg("CSRF protection: request blocked")

				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"Forbidden","message":"CSRF protection: Use application/json or X-Requested-With header"}`))
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// ContentType sets the Content-Type header for JSON API responses.
func ContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

// ValidateRequestBody limits request body size to prevent DoS attacks.
func ValidateRequestBody(maxSize int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH" {
				r.Body = http.MaxBytesReader(w, r.Body, maxSize)
			}
			next.ServeHTTP(w, r)
		})
	}
}
