# recalculatescores

With this tool you can apply correction for guessing in Canvas multiple choice quizzes. The tool uses Canvas OAuth2 with a scoped developer key. Once logged in, you will have a subset of the same permissions you have in Canvas. In a previous version I used the Canvas REST API, but this update uses the GraphQL API, which is much faster. You fill in an assignment ID, and you get an Excel file with the names of students and their recalculated scores.
