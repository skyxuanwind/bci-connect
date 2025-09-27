' GBC NFC Gateway - Windows One-Click Launcher (VBS single-file)
Dim fso, shell, scriptDir, ps1Path, url, http, stream, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1Path = scriptDir & "\GBC-NFC-Gateway-Launcher-Windows.ps1"
url = "https://raw.githubusercontent.com/skyxuanwind/bci-connect/main/client/public/GBC-NFC-Gateway-Launcher-Windows.ps1"

If Not fso.FileExists(ps1Path) Then
  On Error Resume Next
  Set http = CreateObject("MSXML2.XMLHTTP")
  http.open "GET", url, False
  http.send
  If http.Status = 200 Then
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 1 'binary
    stream.Open
    stream.Write http.responseBody
    stream.SaveToFile ps1Path, 2 'adSaveCreateOverWrite
    stream.Close
    Set stream = Nothing
  Else
    MsgBox "無法下載啟動器腳本 (HTTP " & http.Status & ")。請稍後再試。", 16, "BCI NFC Gateway"
    WScript.Quit 1
  End If
  Set http = Nothing
  On Error GoTo 0
End If

cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & ps1Path & """"
' Run hidden (0), do not wait (False)
shell.Run cmd, 0, False