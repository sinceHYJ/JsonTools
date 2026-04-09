!macro NSIS_HOOK_PREINSTALL
  ; Copy WebView2Loader.dll to the install directory
  File /oname=$INSTDIR\WebView2Loader.dll "D:\cp\project\json-tools\src-tauri\target\release\WebView2Loader.dll"
!macroend
