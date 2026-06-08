# Overview of event.test.js

The event.test.js file contains unit tests for the functionality of the public create_event function. Since calling an event builder depends on the command passed to the create_event function the unit tests are focused on ensuring that the create_event function correctly builds the intended event.

## issue.created

There are 6 tests relating to issue creation events which accomplish the following checks:

1. Checks the case where the user enters an invalid command
2. Checks that a create event is properly defined when just a title is provided
3. Checks that a newly created event has the expected fields
4. Checks that a newly created event stores the timestamp (time that the event was called) and the actor (creator of the issue)
5. Checks that fields that were optional on created are properly filled with default values, and that all of the fields exist.
6. Checks that all flags are correctly assigned

## issue.updated

There are 2 tests relating to the updating event for an issue which do the following:

1. Checks that an update event can update the correct fields
2. Checks that all fields that should be updatable are updateable

## issue.deleted

There is one test for for creating an issue deletion event：

1. Checks that a delete event is properly created. There should be no changes occuring.
