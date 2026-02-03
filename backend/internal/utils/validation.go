package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	// UUIDRegex validates UUID v4 format
	UUIDRegex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
)

// IsValidUUID checks if a string is a valid UUID v4
func IsValidUUID(uuid string) bool {
	return UUIDRegex.MatchString(strings.ToLower(uuid))
}

// SanitizeString removes potentially harmful characters from a string
func SanitizeString(s string) string {
	// Remove control characters and trim whitespace
	var result strings.Builder
	for _, r := range s {
		if !unicode.IsControl(r) {
			result.WriteRune(r)
		}
	}
	return strings.TrimSpace(result.String())
}

// IsValidSessionName checks if a session name is valid
func IsValidSessionName(name string) bool {
	sanitized := SanitizeString(name)
	return len(sanitized) >= 3 && len(sanitized) <= 50
}

// IsValidPassword checks if a password meets minimum requirements
func IsValidPassword(password string) bool {
	return len(password) >= 6
}
