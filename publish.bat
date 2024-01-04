
robocopy C:\Users\Jim\Documents\webcontent\root-50webs  C:\Users\Jim\Documents\webcontent\github-website\springsandpucks ^
            /XD .git ^
            /XF .gitignore .htaccess publish.bat copyutilities.bat README.md socketio-chat* Box2D-* youTube* session* aoc* ^
            /MIR /R:3 /W:5

git add .
git commit -am "another update"
git push origin main