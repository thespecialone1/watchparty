.PHONY: all dev backend frontend install redis clean

# Default target
all: install

# Install all dependencies
install: install-backend install-frontend

install-backend:
	cd backend && go mod download

install-frontend:
	cd frontend && npm install

# Start Redis
redis:
	docker-compose up -d redis

# Start development servers
dev: redis
	@echo "Starting development servers..."
	@make -j2 backend frontend

backend:
	cd backend && go run cmd/server/main.go

frontend:
	cd frontend && npm run dev

# Build for production
build: build-backend build-frontend

build-backend:
	cd backend && go build -o bin/server cmd/server/main.go

build-frontend:
	cd frontend && npm run build

# Clean build artifacts
clean:
	rm -rf backend/bin
	rm -rf frontend/dist
	docker-compose down -v

# Format code
fmt:
	cd backend && gofmt -w .
	cd frontend && npm run lint --fix

# Run tests
test: test-backend test-frontend

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm run test

# Stop all services
stop:
	docker-compose down
