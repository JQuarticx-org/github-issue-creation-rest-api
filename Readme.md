# github-issue-creation-rest-api

This repository is used to automatically create GitHub issues and assign them to users who have privileges on the specific repository.

# Environment variables

To start the container, the following variables are required.

```env
ENV GITHUB_REPO_OWNER="fourcodes-org"
ENV GITHUB_REPO_NAME="proof-of-concepts"
ENV GITHUB_TOKEN="<PAT_TOKEN>"
```

# Rest api details

```console
http://localhost:3000/postMessage
```

# Request body

```json
{
  "requestBody": {
    "attachments": [
      {
        "color": "good",
        "pretext": "WAZUH Alert",
        "title": "PAM: Login session opened.",
        "text": "Apr 26 12:18:08 ubuntu-bionic sudo: pam_unix(sudo:session): session opened for user root by vagrant(uid=0)",
        "fields": [
          {
            "title": "Agent",
            "value": "(000) - ubuntu-bionic"
          },
          {
            "title": "Location",
            "value": "/var/log/auth.log"
          },
          {
            "title": "Rule ID",
            "value": "5501 _(Level 3)_"
          }
        ]
      }
    ]
  }
}
```

