echo "m-jim-d" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
::git remote add origin https://github.com/jim-miller-gac/jim-miller-gac.git
::git remote add origin https://github.com/m-jim-d/testing.git
git remote add origin2 https://github.com/m-jim-d/m-jim-d.git
git push -u origin2 main

