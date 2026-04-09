@echo off
set PATH=C:\msys64\mingw64\bin;%PATH%
echo === Building Rust (GNU toolchain) ===
cd /d "%~dp0..\src-tauri"
cargo build --release
if %errorlevel% neq 0 exit /b %errorlevel%

echo === Verifying WebView2Loader.dll ===
if exist "target\release\WebView2Loader.dll" (
    echo WebView2Loader.dll OK
) else (
    echo ERROR: WebView2Loader.dll missing
    exit /b 1
)
