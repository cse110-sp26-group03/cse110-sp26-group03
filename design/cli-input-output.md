# Rough CLI I/O Design + Command Docs

## Important

Issues follow this format:
> ID | Title | Description | Status | Priority | Issue Type | Assignee | Created at | Created by | Updated at

Issue IDs take the form `manta-<suffix>` where `<suffix>` is a 5-character random Crockford base32 string, lowercased (e.g. `manta-h53kp`). The alphabet drops visually ambiguous characters (`i`, `l`, `o`, `u`), giving ~33M possible suffixes. IDs are generated randomly per issue with no coordination between teammates — see ADR-005.

### Possible flags:
> - --title
> - --desc
> - --status
> - --priority
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
>>>>> ex. - mt view --priority p1 will return a list of p1 issues.


# Sample I/O

```
mt create --title My new issue --desc Needs to be solved

   Created Issue manta-h53kp

   Title: My new issue
   Priority: p5
   Status: open
   Created at: ISO timestamp
```


```
mt update manta-h53kp --title Changed the title

   Updated Issue manta-h53kp

   Title: My new issue -> Changed the title
                              ^ colored green
   Updated at: ISO timestamp
```

```
mt view

   ID              TITLE                                   PRIORITY   STATUS        TYPE      ASSIGNEE
   --------------------------------------------------------------------------------------------------
   manta-h53kp     Changed the title                       p0         open          -         -


```

```
mt view manta-h53kp

Issue manta-h53kp     Changed the title

   > Needs to be solved

   Priority:    p5
   Status:      open
   Type:        -
   Assignee:    -
   Created by:  .. (name, email, whatever we decide to use)
   Created at:  ISO timestamp
   Updated at:  ISO timestamp

```


```
mt close manta-h53kp

   Closed Issue manta-h53kp

   Title: Changed the title
   Priority: p5
   Status: closed
              ^ colored red
   Closed at: ISO timestamp
```

```
mt delete manta-h53kp

   You are about to delete Issue manta-h53kp: Changed the title
      Confirm? y/n _y_

   Deleted Issue manta-h53kp
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
                  --priority        p0 | p1 | p2 | p3 | ... (default: p5)
                  --status          Issue state
                  --assignee <a>    Name of assignee
                  --type <t>        space separated list of issue type tags (ex. --type design frontend)
                                                                                         ^ tags: design, frontend
      ... etc


   EXAMPLES

      mt create --title My new issue --desc Needs to be solved
      mt update manta-h53kp --title Changed the title
      mt view manta-h53kp
      mt close manta-h53kp

```