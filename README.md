# recalculatescores

With this tool you can apply correction for guessing in Canvas multiple choice quizzes. The tool uses Canvas OAuth2 with a scoped developer key. Once logged in, you will have the same permissions you have in Canvas. Pls note that the API is quite slow, so be patient with requests to courses with al lot of students, it can take some time before the tool kicks in. It is built on NodeJS/Express and uses workers to handle the API calls.
