.PHONY: backend frontend dev migrate reset-db lint-frontend

backend:
	cd poly-myket-backend && uv run uvicorn app.main:app --reload --port 6767

frontend:
	cd poly-myket-frontend && npm run dev -- --port 6969

dev:
	$(MAKE) backend & $(MAKE) frontend & wait

migrate:
	cd poly-myket-backend && uv run alembic upgrade head

reset-db:
	rm -f poly-myket-backend/dev.db
	cd poly-myket-backend && uv run alembic upgrade head

lint-frontend:
	cd poly-myket-frontend && npm run typecheck && npm run lint
