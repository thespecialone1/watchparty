package utils

import (
	"fmt"
	"math/rand"
	"time"
)

var (
	adjectives = []string{
		"Happy", "Swift", "Bright", "Calm", "Cool", "Kind", "Wise", "Brave",
		"Lucky", "Eager", "Bold", "Fair", "Free", "Glad", "Keen", "Nice",
	}
	animals = []string{
		"Panda", "Eagle", "Tiger", "Lion", "Bear", "Wolf", "Fox", "Hawk",
		"Owl", "Cat", "Dog", "Duck", "Deer", "Swan", "Seal", "Crab",
	}
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GenerateRandomUsername generates a random username in the format AdjectiveAnimal
func GenerateRandomUsername() string {
	adj := adjectives[rand.Intn(len(adjectives))]
	animal := animals[rand.Intn(len(animals))]
	return fmt.Sprintf("%s%s", adj, animal)
}
