# Rough CLI I/O Design + Command Docs

## Important

Issues follow this format:
> ID | Title | Description | Status | Priority | Issue Type | Assignee | Created at | Created by | Updated at

### Possible flags:
> - --title
>  - --desc 
> - --status
>  - --priority
> - --type
> - --assignee

### Rough list of commands:

*required 

> - mt help
>>> - shows and defines list of all commands. takes no flags
> - mt create (flags)
>>> - creates an issue. 
>>>> - flags taken: *title, desc, status, priority, type, assignee

> - mt update (*id, flags)
>>> - updates fields of an issue based on flags passed in.
>>>> - takes: *id, title, desc, status, priority, type, assignee
>>>> - at least 1 flag required

> - mt delete (*id)
>>> - deletes issue mapped to (*id) from the DB

> - mt close (*id)
>>> - marks issue mapped to (*id) as closed

> - mt view (id, flags)
>>> - returns list of issues, or details of a specific issue
>>>> - if no id is provided, a list of all issues are returned. otherwise, details of corresponding issue are displayed
>>>> - if flags are provided and id isn't provided, you should be able to filter by flag by adding it:
>>>>> ex. - mt view --priority High will return a list of high priority issues.


# Sample I/O

```
mt create --title My new issue --desc Needs to be solved

   Created Issue #001 

   Title: My new issue
   Priority: -
   Status: open
   Created at: ISO timestamp
```


```
mt update 001 --title Changed the title

   Updated Issue #001

   Title: My new issue -> Changed the title
                              ^ colored green
   Updated at: ISO timestamp
```

```
mt view

   ID       TITLE                                   PRIORITY   STATUS        TYPE      ASSIGNEE
   ---------------------------------------------------------------------------------------------
   001      Changed the title                       -          open          -         -


```

```
mt view 001

Issue #001     Changed the title
   
   > Needs to be solved

   Priority:    -
   Status:      open
   Type:        -
   Assignee:    -
   Created by:  .. (name, email, whatever we decide to use)
   Created at:  ISO timestamp
   Updated at:  ISO timestamp

```


```
mt close 001 

   Closed Issue #001

   Title: Changed the title
   Priority: none
   Status: closed
              ^ colored red
   Closed at: ISO timestamp
```

```
mt delete 001 

   You are about to delete Issue #001: Changed the title
      Confirm? y/n _y_

   Deleted Issue #001
   Deleted at: ISO timestamp
```



```
mt help


   USAGE

      mt <command> [flags]


   COMMANDS

      create    Create a new issue
                  --title <t>       (required)
                  --desc  <d>       Description
                  --priority        low | medium | high (default: none)
                  --status          open | closed
                  --assignee <a>    Name of assignee
                  --type <t>        space separated list of issue type tags (ex. --type design frontend) 
                                                                                         ^ tags: design, frontend
      ... etc


   EXAMPLES
      
      mt create --title My new issue --desc Needs to be solved
      mt update 001 --title Changed the title
      mt view 001
      mt close 001

```