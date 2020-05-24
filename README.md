# recalculatescores

With this tool you can apply correction for guessing in Canvas multiple choice quizzes. Since the tool uses the Canvas API, you need an access token, which you can obtain in Canvas through profile > settings > access token. It will provide you with the access rights according to your Canvas role. Pls note that the API is quite slow, so be patient with requests to courses with al lot of students.

For non-devs I create a desktopversion (see other branch) with Nexe:
- nexe index.js --target windows-x86-12.16.3 -r "index.html" for Windows
- nexe index.js --target macos-12.0.0 -r "index.html" for MacOS
In the desktopversion, the user has to paste the accesstoken in an input field, in the other version it has to be pasted in the creds.js file (rename the creds-sample file).
