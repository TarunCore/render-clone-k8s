postgresinit:
	docker run --name postgres15 -p 5433:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=password -d postgres:15-alpine

postgres:
	docker exec -it postgres15 psql

createdb:
	docker exec -it postgres15 createdb --username=root --owner=root render

dropdb:
	docker exec -it postgres15 dropdb render

migrateup:
	migrate -path migrations -database "postgresql://root:password@localhost:5433/render?sslmode=disable" -verbose up

migratedown:
	migrate -path migrations -database "postgresql://root:password@localhost:5433/render?sslmode=disable" -verbose down

migratecreate:
	migrate create -ext sql -dir migrations -seq users
	migrate create -ext sql -dir migrations -seq projects
reset:
	make dropdb createdb migrateup

.PHONY: postgresinit postgres createdb dropdb migrateup migratedown