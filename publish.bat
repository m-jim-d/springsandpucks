@ECHO off

:: Script for copying and publishing (deploying) files to Github Hosting 
:: The nocopy option allows you to use the filemanager to hand copy a single file and then deploy without updating the whole site.

SET help=off
SET copy=on

IF "%1"=="help" (
	SET help=on   
) ELSE IF "%1"=="nocopy" (
   SET copy=off
)

IF %help%==on (
	ECHO Parameters
	ECHO ---help
   ECHO ---nocopy //publish without copying
)

IF %copy%==on (
   robocopy C:\Users\Jim\Documents\webcontent\root-50webs  C:\Users\Jim\Documents\webcontent\github-website\springsandpucks ^
               /XD .git ^
               /XF .gitignore .htaccess publish.bat copyutilities.bat README.md LICENSE.txt socketio-chat* Box2D-* youTube* session* aoc* ^
               /MIR /R:3 /W:5
)

git add .
git commit -am "another update"
git push origin main