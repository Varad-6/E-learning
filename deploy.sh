#!/bin/bash
set -e

echo "================================================================"
echo "  Kaizen Enterprise LMS - Automated Redeploy Script (Linux/Mac)"
echo "================================================================"
echo ""

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] Copying .env.example to .env..."
        cp .env.example .env
    fi
fi

echo "[1/3] Stopping and removing existing containers..."
docker compose down

echo ""
echo "[2/3] Building and starting all containers (Postgres, Backend, Frontend)..."
docker compose up -d --build

echo ""
echo "[3/3] Waiting for containers to become healthy (15 seconds)..."
sleep 15

echo ""
echo "================================================================"
echo "  DEPLOYMENT SUCCESSFUL!"
echo "================================================================"
echo ""
echo "  * Web Frontend      : http://localhost:5173"
echo "  * User Admin Studio : http://localhost:5173/admin/users"
echo "  * Backend API / Docs: http://localhost:8000/docs"
echo ""
echo "  ADMIN CREDENTIALS (for http://localhost:5173/admin/users):"
echo "  * Email   : systemadmin@abhiyantatech.com"
echo "  * Password: Password123!"
echo ""
echo "  (Alternative Admin: akanksha.k@abhiyantatech.com / Password123!)"
echo "  (HR Admin         : sayali.s@abhiyantatech.com / Password123!)"
echo "================================================================"
echo ""
