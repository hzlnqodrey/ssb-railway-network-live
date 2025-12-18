// Package middleware - Middleware Chaining
// This file provides utilities for chaining middleware.
package middleware

import "net/http"

// Chain chains multiple middleware together in order.
// The first middleware wraps the outermost layer.
//
// Example:
//
//	handler := Chain(myHandler, Logging, Security, Recovery)
//
// This creates: Logging -> Security -> Recovery -> myHandler
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

// ChainFunc is like Chain but accepts http.HandlerFunc.
func ChainFunc(f http.HandlerFunc, middlewares ...func(http.Handler) http.Handler) http.Handler {
	return Chain(f, middlewares...)
}
