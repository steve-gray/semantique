# semantique
#### Semver, the old fashioned way
Semantic versioning based purely on current Git workspace without dependencies on
package registries or CI systems (though you can integrate one if you want).

| Current Version | Latest Build | Dependencies | Dev Dependencies |
| --------------- | ------------ | ----------- | ---------------- |
| [![npm version](https://badge.fury.io/js/semantique.svg)](https://badge.fury.io/js/semantique) | [![Build Status](http://drone.eventualconsistency.net/api/badges/steve-gray/semantique/status.svg)](http://drone.eventualconsistency.net/steve-gray/semantique) | [![Prod Dependencies](https://david-dm.org/steve-gray/semantique/status.svg)](https://david-dm.org/steve-gray/semantique) | [![Dev Dependencies](https://david-dm.org/steve-gray/semantique/dev-status.svg)](https://david-dm.org/steve-gray/semantique#info=devDependencies) |

## How It Works
The _semantique_ package checks the current working directory to determine any
changes that have been made since the last tag on the branch. Commits use
semver like directives to indicate the nature of the change.

The following prefixes are recognised by default:

| Prefixes | Semver Meaning | Notes | Examples |
| -------- | -------------- | ----- | -------- |
| break | Major | When a breaking change has occured. | <ul><li>break(module): No longer default X to Y</li><li>Breaks all of the stuff.</li></ul> |
| feat | Minor | A new feature or widening change to an operational contract/API. | <ul><li>feat(something): Added widget frobber.</li><li>Feature: Something else.</li></ul> | 
| patch / bugfix / fix | Patch | A fix to correct a deviation from specified behaviours. | <ul><li>fix(something): Shouldn't do that.</li><li>PATCH: Urgently prevent disaster.</li></ul> |

Any other commits that are not prefixed with the above are assumed
to be non-consequential and not trigger a new version.

In short:

  1. Run `npm install -g semantique`
  2. Commit your changes to your projects.
  3. Run `semantique`

The package will then read the commits and tags, determine the
next tag (defaulting to 1.0.0 for the first hit)

## Running with CI Systems (Drone, GoCD)
To run with a CI system, I publish a convienient docker image. This image can 
be used with your pipeline such as:


        pipeline:
           install_npm_packages:
                image: node:4
                commands:
                    - npm install
                    - npm test

            run_semantique_self:
                image: eventualconsistency/semantique
                pull: true
                when:
                    branch: master
                    event: push

It is assumed that the upstream origin URL is already set on your git workspace for the purposes of publishing. You need to set the following environment variables (as secrets in Drone/GoCD):

| Environment Variable | Used For |
| - | - |
| GIT_USER | Username for publishing changes back to the upstream Git repository. |
| GIT_PASS | Password or personal access token (recommended) for publishing changes back to upstream. |

The following environment variables are used to configure other aspects of the behaviour of
_semantique_:

| Environment Variable | Default | Notes |
| -------------------- | ------- | ----- |
| SQ\_CMD_FETCH | git fetch --tags | The command to fetch the tags for the current repo. Runs before processing. |
| SQ\_CMD_LOGS | git log --date=iso --pretty=format:\"%H \|\|\| %an \|\|\| %s \|\|\| %d\" | Command to extract the logs from SCM for parsing. |
| SQ\_CMD_LOGDELIMITER | \|\|\| | Log delimiter for output. |
| SQ\_CMD_LINEEND | \\n | Line ending for parsing output |
| SQ\_CMD_WORKSPACEPENDING | git diff --name-only | Command for checking if the workspace is clean. |
| SQ\_CMD_PUSH | git push origin master --tags | Command for pushing back to upstream branch. |
| SQ\_COMMIT_MESSAGE | Updated to version %s for release. | Default message for commits |
| SQ\_DEFAULT_VERSION | 1.0.0 | Initial version when no previous tags found on repo. |
| SQ\_OPT_CHECKCLEAN | true | Check if the workspace is clean. Set to 0/false to allow dirty workspaces. |
| SQ\_OPT_APPLYVERSION | true | Apply the versioning command to the package type. Set to 0/false to skip the version bump command |
| SQ\_OPT_PUSH | true | Push to upstream repository after success? |

## Contributing
Feature suggestions and improvements welcome. Early days.
