#!/bin/bash

# Terminate background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM EXIT

echo "================================================="
echo "   TalentLens - Starting fullstack application   "
echo "================================================="

# Start backend
echo "🚀 Launching FastAPI backend server on port 8000..."
.venv/bin/python main.py &
BACKEND_PID=$!

# Start frontend
echo "💻 Launching Vite React frontend dev server..."
npm --prefix frontend run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo "================================================="
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to terminate both servers."
echo "================================================="

# Wait for background jobs to finish
wait
