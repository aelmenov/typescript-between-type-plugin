# CI and releases

`.github/workflows/ci.yml` checks pull requests targeting `master` and pushes to
`master`. Compilation, formatting, lint, configuration and test type checks,
and Jest run on Node.js 20.19, 22.13, and 24.

After all checks pass on the upstream repository, the release job increments
patch with `npm version patch --no-git-tag-version`, checks the versioned package,
and atomically pushes its release commit to `master` and a `v<version>` tag.
It then publishes `@elmenov-softworks/eslint-plugin-between` publicly using OIDC.
The `version` lifecycle script synchronizes ESLint plugin metadata.
For minor or major changes, use `npm version minor --no-git-tag-version` or
`npm version major --no-git-tag-version` locally and commit the manifest, lock file,
and plugin metadata together. The next automatic release still increments patch.

Master runs are serialized and never cancelled during release. A run superseded
by a newer master commit skips publication; the newer run checks and releases
all accumulated changes. A concurrent push during release causes the atomic Git
push to fail before publication. No force-push is used.

Release commits use `GITHUB_TOKEN`, so their pushes do not start another workflow.
If publishing fails after the release commit is pushed, select **Re-run failed
jobs** on the original run. While that release commit remains the head of master,
the job resumes the same version. Already published versions are skipped.
Once newer source changes reach master, their run takes over.

## One-time npm setup

In the settings for `@elmenov-softworks/eslint-plugin-between`, add a GitHub Actions
trusted publisher with these exact values:

| Field                | Value                   |
| -------------------- | ----------------------- |
| Organization or user | `elmenov-softworks`     |
| Repository           | `eslint-plugin-between` |
| Workflow filename    | `ci.yml`                |
| Environment          | Leave empty             |
| Allowed action       | Allow `npm publish`     |

The npm organization must own the package, and the person configuring trust must
have permission to manage it. Trust is configured in package settings. If the
package does not exist yet, bootstrap its first publication with an authorized
npm account before adding this relationship.

No `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret is used. The release job uses a
GitHub-hosted runner, Node.js 24, npm 11, and `id-token: write`. npm generates
provenance automatically for public packages from public repositories.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## GitHub settings

Allow the release job to write repository contents. Branch and tag protection
must permit the release bot to push version commits to master and create `v*`
tags. `contents: write` does not override protection rules. If master requires
pull requests for every change, configure an allowed release-bot bypass or
adjust that rule before enabling this workflow.

Require all three **Checks (Node ...)** jobs before merging pull requests.
See [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
for why `GITHUB_TOKEN` pushes do not trigger another release.
