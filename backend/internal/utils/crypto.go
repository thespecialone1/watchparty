package utils

import (
	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the cost factor for bcrypt hashing
	BcryptCost = 12
)

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword compares a password with a hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
