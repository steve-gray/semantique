# semantique

Semantic versioning without dependencies on CI systems or using the official NPM registry. Determines the versioning
of a project based on the current commits in the workspace.

| Latest Build |
| ------------- |
| [![Build Status](http://drone.eventualconsistency.net/api/badges/steve-gray/semantique/status.svg)](http://drone.eventualconsistency.net/steve-gray/semantique) |

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

You need to set the following environment variables (as secrets in Drone/GoCD):

| Environment Variable | Used For |
| - | - |
| GIT_USER | Username for publishing changes back to the upstream Git repository. |
| GIT_PASS | Password or personal access token (recommended) for publishing changes back to upstream. |


