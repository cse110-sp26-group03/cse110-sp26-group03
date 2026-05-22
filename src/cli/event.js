/* global process */

// `event.js` is responsible for constructing event objects.

// get the current user from OS username
// falls back to "local-user" if $USER/$USERNAME not set.
function get_actor() {
  return process.env.USER || process.env.USERNAME || "local-user";
}

export function create_event(data){
    const {cmd, flags} = data; 
    switch(cmd){
        case "create":
            return create_issue_event(flags);
        case "update":
            return update_issue_event(flags, false);
        case "close":
            return update_issue_event(flags, true);
        case "delete":
            return delete_issue_event(flags);
        default:
            throw new Error(`event creation error: '${cmd}' is not a recognized command`);
    }
}

function create_issue_event(flags){
    const timestamp = new Date().toISOString();
    const actor = get_actor();
    const event = {
        type: "issue.created",
        timestamp: timestamp,
        actor: actor,
        issueId: null,
        issue: {
            title: flags.title,
            description: flags.desc ?? "",
            status: flags.status,
            priority: flags.priority,
            issueType: flags.type ?? "task",
            assignee: flags.assignee ?? null,
            createdAt: timestamp,
            createdBy: actor,
            updatedAt: timestamp,
            updatedBy: actor
        }
    };
    return event;
}


function update_issue_event(flags, close){
    const timestamp = new Date().toISOString();
    const actor = get_actor();
    let changes;
    if(close){
        changes = {
            status: "closed",
            updatedAt: timestamp,
            updatedBy: actor
            }
    }
    else{
        // constructs changes object from the fields that are defined
        changes = {
            ...(flags.title    !== undefined && { title:     flags.title }),
            ...(flags.desc     !== undefined && { description:      flags.desc }),
            ...(flags.priority !== undefined && { priority:  flags.priority }),
            ...(flags.status   !== undefined && { status:    flags.status }),
            ...(flags.type     !== undefined && { issueType: flags.type }),
            ...(flags.assignee !== undefined && { assignee:  flags.assignee }),
            updatedAt: timestamp,
            updatedBy: actor
        };
    }

    const event = {
        type: "issue.updated",
        timestamp: timestamp,
        actor: actor,
        issueId: flags.id,
        changes: changes
    };
    return event;
}

function delete_issue_event(flags){
    const timestamp = new Date().toISOString();
    const event = {
        type: "issue.deleted",
        timestamp: timestamp,
        actor: get_actor(),
        issueId: flags.id,
    };
    return event;
}