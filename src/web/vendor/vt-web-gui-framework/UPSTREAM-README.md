# VtWebGuiFramework
Eine ausführliche Dokumentation über dieses Framework finden Sie im VITRONIC-Intranet auf dem Server Chow unter [https://chow.vitronic.de/](https://chow.vitronic.de/).
## Build-Checkliste
Die folgende Checkliste beschreibt die Vorgehensweise beim Erstellen eines neuen Releases von VtWebGuiFramework. Wie ein Projekt erstellt wird, welches auf dem Framework basiert, ist hingegen auf dem oben genannten Server Chow unter "Für Entwickler" > "Neues Projekt..." beschrieben.
1. Dokumentation anpassen, vor allem unter /proj/contents/overview/start, /proj/contents/overview/releases, /proj/contents/secondSidebarContent und /proj/contents/forDevs/yourProject/step1.
2. Alle ausstehenden Änderungen auf dem develop-Branch einchecken.
3. Anschließend einen neuen Git-Flow "Release" beginnen und als Release-Name die neue Versionsnummer verwenden.
4. Die neue Versionsnummer in der Datei settings.js unter <code>settings.meta.version</code> und unter <code>settings.packages.vtWebGuiFramework</code> eintragen.
5. Die zu verwendende Versionsnummer von VtWebGuiIcons in der Datei settings.js unter <code>settings.packages.vtWebGuiIcons</code> eintragen.
6. Die zu verwendende Versionsnummer von Node.js in der Datei settings.js unter <code>settings.packages.nodeJs</code> eintragen.
7. Überprüfen, ob für die zu verwendenden Pakete electron, electron-builder und node-sass die zugehörigen Binaries auf dem Buildmachine-Repository zur Verfügung stehen.
8. Datei applySettings.js ausführen, Konsolenausgabe und BeyondCompare-Vergleiche überprüfen.
9. Die Distributionen und Electron-Releases lokal bauen und überprüfen.
10. Alle weiteren Änderungen im Release-Branch mit dem Commit "Version X.X.X vorbereitet" einchecken.
11. Den Release-Branch von VtWebGuiFramework auf dem Jenkins bauen und überprüfen.
12. Release-Branch schließen.
13. Den master-Branch von VtWebGuiFramework auf der Buildmachine bauen und überprüfen.
14. Erstelltes Demoprojekt auf dem Chow-Server aktualisieren.
