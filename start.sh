#!/bin/bash

echo "================================================"
echo "  Whisper Web - 语音转文字 | Speech to Text"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies... | 正在安装依赖..."
    npm install
    echo ""
fi

echo "🚀 Starting development server... | 正在启动开发服务器..."
echo "📱 The app will open at http://localhost:3000"
echo "🛑 Press Ctrl+C to stop the server | 按 Ctrl+C 停止服务器"
echo ""

npm run dev
