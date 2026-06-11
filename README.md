# cse110-sp26-group03

**Manta** (mt) is a local SQLite-powered issue tracker for AI assisted SWE workflows.

# Why Manta?

Traditional issue trackers (GitHub Issues, Linear, Jira) weren't designed for developers who work with agents. Manta was built with the following features:

* it is built as an edge software to eliminate privacy and security vulnerabilities as well as maximize performance
* Manta generates issue IDs based on a Crockford base-32 alphabet to eliminate confusion for users and agents
* 0 dependencies that the user needs to install
* it is migrateable from issue trackers like beads

# Quick Start

Manta is available on npm: [npmjs.com/package/manta-it](https://www.npmjs.com/package/manta-it)

```bash
# Install Manta
bun install -g manta-it

# Initialize in your project
cd your-project
mt init

# Create your first issue
mt create "My First Issue" --p p2 --assignee "Steve"

# View issues
mt view

# If you are working in a repository, remember to add the .db files to the .gitignore
echo ".manta/*.db
.manta/*.db-journal
.manta/*.db-wal
.manta/*.db-shm" >> .gitignore
```
Click to view all manta commands [here](https://github.com/cse110-sp26-group03/cse110-sp26-group03/wiki/User-Guide)

## Quick Links

[full setup guide](Installation-&-Setup)

[github repository](https://github.com/cse110-sp26-group03/cse110-sp26-group03)

[npm: manta-it](https://www.npmjs.com/package/manta-it)

## Manta Demo Videos

### Public Demo

[![Manta Public Demo](https://img.youtube.com/vi/cGJDMzNs6F0/hqdefault.jpg)](https://www.youtube.com/watch?v=cGJDMzNs6F0)

### Private Overview 

[![Manta Private Repo Overview](https://img.youtube.com/vi/ilkPzk-KoYw/hqdefault.jpg)](https://www.youtube.com/watch?v=ilkPzk-KoYw)

## Team

Manta is developed by StringRays, a group of student software developers passionate about building community and robust, well-engineered code. More about our members can be found [here](https://github.com/cse110-sp26-group03/cse110-sp26-group03/wiki/Team). Thank you for checking out our work!


![logo](https://github.com/user-attachments/assets/1f5387e0-d624-4380-acbf-9f1e63b1a89e)
