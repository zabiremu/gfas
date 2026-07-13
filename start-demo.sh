#!/bin/bash
echo "🚀 Starting Amovix Demo..."
echo ""
echo "Step 1: Starting Docker services (PostgreSQL, Redis, MailHog, MinIO)..."
docker-compose up -d
echo "Waiting 5 seconds for services to be ready..."
sleep 5

echo ""
echo "Step 2: Installing backend dependencies..."
cd backend && npm install

echo ""
echo "Step 3: Running database seed..."
npm run seed:demo

echo ""
echo "Step 4: Starting backend in background..."
npm run start:dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 5

echo ""
echo "Step 5: Installing frontend dependencies..."
cd ../frontend && npm install

echo ""
echo "Step 6: Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Amovix Demo is running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend:    http://localhost:3000"
echo "⚡ Backend API: http://localhost:3001/api"
echo "📚 API Docs:    http://localhost:3001/api/docs"
echo "📧 MailHog:     http://localhost:8025"
echo "🗄️  MinIO:       http://localhost:9001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Demo Login: admin@gtp.com / Admin@123"
echo ""
echo "Press Ctrl+C to stop all services"

wait
