@echo off
chcp 65001 >nul
echo ================================================
echo   Whisper Web - 语音转文字 ^| Speech to Text
echo ================================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies... ^| 正在安装依赖...
    call npm install
    echo.
)

echo 🚀 Starting development server... ^| 正在启动开发服务器...
echo 📱 The app will open at http://localhost:3000
echo 🛑 Press Ctrl+C to stop the server ^| 按 Ctrl+C 停止服务器
echo.

call npm run dev
