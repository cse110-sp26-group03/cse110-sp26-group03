# Rough CLI I/O Design + Command Docs

## Important

Issues follow this format:
> ID | Title | Description | Status | Priority | Issue Type | Assignee | Created at | Created by | Updated at

Issue IDs take the form `manta-<suffix>` where `<suffix>` is a 4-character random Crockford base32 string, lowercased (e.g. `manta-h3kp`). The alphabet drops visually ambiguous characters (`i`, `l`, `o`, `u`), giving ~1M possible suffixes. IDs are generated randomly per issue with no coordination between teammates — see ADR-005.

### Possible flags:
> - --title
> - --desc
> - --status
> - --priority
> - --type
> - --assignee
> - --createdBy (alias `--cb`) — **`mt view` only**; filters the list by issue creator. Using it with any other command (create/update/close/delete) is rejected by the parser.

### Rough list of commands:

*required

> - mt version
>>> - prints the Manta SemVer from `package.json` (see versioning ADR-001). Subcommand only — `mt --version` is not supported. Takes no positional arguments and no flags. **Implemented.**

> - mt help
>>> - shows and defines list of all commands. takes no flags
> - mt create (*title, flags)
>>> - creates an issue.
>>>> - title is passed as a positional argument (required). `--title` is also accepted.
>>>> - flags taken: desc, status, priority, type, assignee

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
>>>> - `--createdBy <name>` (alias `--cb`) filters the list by who created the issue (ex. `mt view --createdBy alice`). This flag is **exclusive to `mt view`** — it cannot be used with create, update, close, or delete.

> - mt sync
>>> - refreshes the local SQLite cache from the JSONL event log (`.manta/manta.jsonl`). Takes no positional arguments and no flags. Cheap when nothing changed (the log hash matches the stored checkpoint, so replay is skipped); does a full rebuild when teammates' events have arrived via `git pull` (see ADR-007). Useful for refreshing the cache after a pull so `mt view` is up to date without having to run a write command. **Implemented.**


# Sample I/O

```
mt version

0.0.1
```


```
mt create "My new issue" --desc Needs to be solved

   Created Issue manta-h3kp

   Title: My new issue
   Priority: p5
   Status: open
   Created at: ISO timestamp
```


```
mt update manta-h3kp --title Changed the title

   Updated Issue manta-h3kp

   Title: My new issue -> Changed the title
                              ^ colored green
   Updated at: ISO timestamp
```

```
mt view

   (interactive table in alternate terminal buffer — 5 issues per page)
   ID        TITLE              PRIORITY    STATUS          TYPE        CREATED BY
   --------------------------------------------------------------------------------
   h3kp      Changed the title  p5          open            task        ikey
   ...

   < prev.    next >
   Page 1 of 3

   Press ESC to exit
```

```
mt view manta-h3kp

   Changed the title                                              manta-h3kp
   -------------------------------------------------------------------------
   Needs to be solved

   -------------------------------------------------------------------------
   p5          -                   task                open
   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   ikey        2026-05-21T02:56:04.612Z     ikey        2026-05-21T02:56:04.612Z

   Press ESC to exit
```

Both list and detail views use the alternate screen when run in a TTY; **ESC**
returns to the normal shell. See ADR-009 for the full pipeline.

`mt view` reads the SQLite cache only; it does not run `syncFromLog`. After a
`git pull` that changes `.manta/manta.jsonl`, run `mt sync` (or any write
command) first if the cache may be stale — both call `syncFromLog` per ADR-007.


```
mt sync

   Synced successfully.
```

`mt sync` rebuilds the SQLite cache from the JSONL log without writing a new
event. It is the lightweight way to pick up teammates' changes after a
`git pull` so `mt view` reflects the latest issues.


```
mt close manta-h3kp

   Closed Issue manta-h3kp

   Title: Changed the title
   Priority: p5
   Status: closed
              ^ colored red
   Closed at: ISO timestamp
```

```
mt delete manta-h3kp

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
                  <title>           (required) positional, or pass as --title <t>
                  --desc  <d>       Description
                  --priority        p0 | p1 | p2 | p3 | ... (default: p5)
                  --status          Issue state
                  --assignee <a>    Name of assignee
                  --type <t>        space separated list of issue type tags (ex. --type design frontend)
                                                                                         ^ tags: design, frontend
      ... etc


   EXAMPLES

      mt version
      mt create "My new issue" --desc Needs to be solved
      mt update manta-h3kp --title Changed the title
      mt view manta-h3kp
      mt close manta-h3kp

```