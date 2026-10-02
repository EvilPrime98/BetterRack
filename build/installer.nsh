!macro customUnInstall
  ${ifNot} ${isUpdated}
    ${ifNot} ${Silent}
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Do you also want to delete all ${PRODUCT_NAME} application data (library database, settings, cache and logs)?$\r$\n$\r$\nYour comic files will not be deleted." IDNO skipDeleteAppData
        SetShellVarContext current
        RMDir /r "$APPDATA\${PRODUCT_NAME}"
        RMDir /r "$LOCALAPPDATA\${PRODUCT_NAME}"
      skipDeleteAppData:
    ${endIf}
  ${endIf}
!macroend
