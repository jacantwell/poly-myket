.PHONY: backend frontend dev

backend:
	cd poly-myket-backend && uv run uvicorn app.main:app --reload --port 6767

frontend:
	cd poly-myket-frontend && npm run dev -- --port 6969

dev:
	$(MAKE) backend & $(MAKE) frontend & wait
