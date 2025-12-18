// Package middleware provides HTTP middleware for the Swiss Railway API.
//
// This package is organized into concern-based microservices:
//
//   - logging.go:   Request logging with structured output
//   - security.go:  Security headers, CSRF protection, content validation
//   - ratelimit.go: In-memory rate limiting per IP
//   - recovery.go:  Panic recovery with stack traces
//   - chain.go:     Middleware chaining utilities
//
// Usage:
//
//	handler := middleware.Chain(
//	    router,
//	    middleware.Recovery,
//	    middleware.Logging,
//	    middleware.SecurityHeaders,
//	    middleware.ContentType,
//	)
//
// Each middleware can be used independently or chained together.
package middleware
