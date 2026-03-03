.PHONY: backend frontend dev migrate reset-db build-shared lint-shared lint-frontend app app-ios app-android lint-app dev-mobile build-app test-backend

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

build-shared:
	cd poly-myket-shared && npm run build

lint-shared:
	cd poly-myket-shared && npx tsc --noEmit

lint-frontend:
	cd poly-myket-frontend && npm run typecheck && npm run lint

app:
	cd poly-myket-app && npx expo start

app-ios:
	cd poly-myket-app && npx expo run:ios

app-android:
	cd poly-myket-app && npx expo run:android

lint-app:
	cd poly-myket-app && npx tsc --noEmit

dev-mobile:
	$(MAKE) backend & $(MAKE) app & wait

test-backend:
	cd poly-myket-backend && uv run pytest -v

build-app:
	cd poly-myket-app && npx eas build --platform all --profile preview
