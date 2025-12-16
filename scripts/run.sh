#!/bin/bash
# Run the backend with uv

# Since we're using requirements.txt, we need to use the venv directly
echo "Starting Catering System Backend..."

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    uv venv --python 3.12
    echo "Installing dependencies..."
    uv pip install -r requirements.txt
fi

echo ""
echo "🚀 Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Available endpoints:"
echo "   • Root:        http://localhost:8000/"
echo "   • API Docs:    http://localhost:8000/api/docs"
echo "   • ReDoc:       http://localhost:8000/api/redoc"
echo "   • Health:      http://localhost:8000/api/health/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run with the venv's python
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000