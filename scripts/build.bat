@echo off
echo === Building frontend ===
cd /d "%~dp0..\src"
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo === Building Rust (GNU toolchain) ===
cd /d "%~dp0..\src-tauri"
set PATH=C:\msys64\mingw64\bin;%PATH%
cargo build --release
if %errorlevel% neq 0 exit /b %errorlevel%

echo === Copying WebView2Loader.dll ===
copy /Y "%~dp0..\src-tauri\target\release\WebView2Loader.dll" "%~dp0..\src-tauri\target\release\app.exe\..\" 2>nul
rem Also ensure it's next to the exe
if exist "%~dp0..\src-tauri\target\release\WebView2Loader.dll" (
    echo WebView2Loader.dll found in release dir
) else (
    echo WARNING: WebView2Loader.dll not found
)

echo === Bundling with Tauri ===
cd /d "%~dp0\.."
set PATH=C:\msys64\mingw64\bin;%PATH%
npx tauri build --bundles nsis
if %errorlevel% neq 0 exit /b %errorlevel%

echo === Build complete ===
