# buhoi-migrator

PostgreSQL migration tool.

## How to use

Having migrations (*.sql) in certain folder, put following Dockerfile inside it.

```dockerfile
FROM titarenko/buhoi-migrator
COPY . .
```

Then build and run it, providing `PG` environment variable with connection string to database where migrations should be applied.

## License

MIT