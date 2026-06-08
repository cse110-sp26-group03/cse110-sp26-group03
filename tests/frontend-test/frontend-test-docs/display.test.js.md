# Overview of event.test.js

The display.test.js file contains unit tests for the functionality of the public DISPLAY function. Depending on the type of `result` which is the output of FETCH, DISPLAY is capable of rendering a single issue or a list of issues.

## Test Cases

For this particular functionality, there are three main test cases to handle, since validation of the arguments wew already handled prior to being passed.

1. If there are no issues to display, FETCH returns an empty array, and a message should be displayed in console telling the user that there are no issues to show.
2. If the view command is called with list mode, all issues should be rendered. In this test case, since issues is an array, DISPLAY should correctly run in list mode
3. If the view command is called in detail mode, only a single issue should be rendered. DISPLAY will correctly use the detail mode case since an object is passed.
