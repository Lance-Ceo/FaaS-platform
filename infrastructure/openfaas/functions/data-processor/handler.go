// Package function implements a data processor OpenFaaS function.
// Endpoint: POST /function/data-processor
package function

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ProcessRequest is the expected input payload.
type ProcessRequest struct {
	Data      interface{} `json:"data"`
	Operation string      `json:"operation"`
}

// ProcessResponse is the output payload.
type ProcessResponse struct {
	Result    interface{} `json:"result"`
	Operation string      `json:"operation"`
	Timestamp string      `json:"timestamp"`
	Runtime   string      `json:"runtime"`
}

// Handle processes incoming HTTP requests.
func Handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var req ProcessRequest
	if r.Body != nil {
		defer r.Body.Close()
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			// Default operation if no body
			req.Operation = "echo"
			req.Data = map[string]string{"message": "Hello from Go!"}
		}
	}

	if req.Operation == "" {
		req.Operation = "echo"
	}

	var result interface{}
	switch strings.ToLower(req.Operation) {
	case "echo":
		result = req.Data
	case "uppercase":
		if s, ok := req.Data.(string); ok {
			result = strings.ToUpper(s)
		} else {
			result = req.Data
		}
	case "count":
		if s, ok := req.Data.(string); ok {
			result = map[string]int{"length": len(s), "words": len(strings.Fields(s))}
		} else {
			result = map[string]int{"length": 0}
		}
	default:
		result = req.Data
	}

	fmt.Printf("[data-processor] Operation: %s\n", req.Operation)

	resp := ProcessResponse{
		Result:    result,
		Operation: req.Operation,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Runtime:   "Go 1.19",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
