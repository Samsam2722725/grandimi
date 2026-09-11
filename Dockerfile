# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY . .

# `go mod download` et non `go mod tidy`.
#
# `tidy` RESOUT les dependances au moment du build : sans go.sum versionne — ce
# qui etait le cas — chaque image pouvait embarquer des versions differentes,
# sans verification d integrite, sur un service qui traite des paiements.
# `download` s appuie sur go.sum et echoue si une somme ne correspond pas.
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
