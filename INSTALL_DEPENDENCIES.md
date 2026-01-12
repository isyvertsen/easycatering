# Installere Backend Dependencies - Feilsøking

Det oppstod problemer med å installere dependencies automatisk med `uv`. Her er flere måter å fikse dette på:

## Metode 1: Bruk pip direkte (Anbefalt)

Installer dependencies i et vanlig Python venv:

```bash
cd LKCserver-backend

# Lag nytt virtuelt miljø med standard Python
python3 -m venv .venv

# Aktiver miljøet
source .venv/bin/activate

# Installer dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Metode 2: Installer manglende pakker enkeltvis

Hvis backend delvis fungerer men mangler noen pakker:

```bash
cd LKCserver-backend
source .venv/bin/activate

pip install "strawberry-graphql[fastapi]>=0.288.0"
pip install docxtpl
pip install openpyxl
pip install weasyprint
pip install jinja2
pip install python-multipart
```

## Metode 3: Bruk uv (eksperimentell)

Hvis du vil fortsette med uv:

```bash
cd LKCserver-backend

# Slett eksisterende uv.lock og start på nytt
rm uv.lock

# Installer dependencies
uv sync

# Eller prøv:
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

## Metode 4: Bruk Docker (avansert)

Lag en Dockerfile hvis dependencies fortsetter å være problematisk:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t lkc-backend .
docker run -p 8000:8000 lkc-backend
```

## Verifiser at alt fungerer

Når backend kjører, test at GraphQL fungerer:

```bash
# Test REST API
curl http://localhost:8000/api/docs

# Test GraphQL endpoint
curl -X POST http://localhost:8000/api/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

Du skal få tilbake et JSON svar hvis alt fungerer!

## Neste Steg

Når backend kjører på port 8000:

1. **Kjør GraphQL Code Generator** (fra frontend directory):
   ```bash
   cd LKCserver-frontend
   npm run codegen
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

3. **Åpne i nettleser**:
   - Frontend: http://localhost:3000
   - Reports: http://localhost:3000/reports
   - GraphQL Playground: http://localhost:8000/api/v1/graphql
   - API Docs: http://localhost:8000/api/docs

## Feilsøking

### "No module named 'strawberry'"
- Kjør: `pip install "strawberry-graphql[fastapi]"`

### "No module named 'docxtpl'"
- Kjør: `pip install docxtpl openpyxl weasyprint`

### "Port 8000 already in use"
- Finn prosess: `lsof -i :8000`
- Stopp prosess: `kill -9 <PID>`

### Backend starter men GraphQL fungerer ikke
- Sjekk at GraphQL endpoint er inkludert i `app/api/v1/__init__.py` (linje 9 og 22)
- Sjekk at alle dependencies er installert med `pip list | grep strawberry`

God luck! 🚀
