.PHONY: run test build docker-build docker-run clean

run:
	go run cmd/server/main.go

dev:
	GIN_MODE=debug go run cmd/server/main.go

test:
	go test -v ./...

test-coverage:
	go test -cover ./...

build:
	CGO_ENABLED=0 go build -o bin/server cmd/server/main.go

docker-build:
	docker build -t grandimi:latest .

docker-run:
	docker run -p 8080:8080 grandimi:latest

docker-dev:
	docker run -e GIN_MODE=debug -p 8080:8080 grandimi:latest

clean:
	rm -rf bin/
	go clean

lint:
	golangci-lint run ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

install-deps:
	go mod download
	go mod tidy

help:
	@echo "Available commands:"
	@echo "  make run           - Run the server"
	@echo "  make dev           - Run in debug mode"
	@echo "  make test          - Run tests"
	@echo "  make test-coverage - Run tests with coverage"
	@echo "  make build         - Build binary"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-run    - Run Docker container"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make lint          - Run linter"
	@echo "  make fmt           - Format code"
	@echo "  make vet           - Vet code"
