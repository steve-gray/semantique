const config = require('config');
const chalk = require('chalk');
const exec = require('child_process').exec;
const semver = require('semver');


const currentConfig = config.get('semantique');

/**
 * Get the output of the specified command
 */
function getCommandOutput(commandText) {
  return new Promise((resolve, reject) => {
    exec(commandText, null, (err, stdout, stderr) => {
      if (err) {
        console.warn(stderr.toString());
        reject(err);
        return;
      }
      resolve(stdout.toString());
    });
  });
}

/**
 * Get commands pending on the current workspace.
 */
function getWorkspaceChanges() {
  return getCommandOutput(currentConfig.commands.pending)
        .then((changeList) => {
          const changes = changeList.split(currentConfig.commands.outputTerminator)
                .filter(x => x && x.trim().length > 0)
                .map(x => x.trim());
          return changes;
        });
}

/**
 * Extract the decoration string and find any tag references.
 */
function getDecorationTags(decoration) {
  let text = decoration;
  if (decoration.startsWith('(') && decoration.endsWith(')')) {
    text = decoration.substring(1, decoration.length - 1);
  }

  const tags = text
    .trim()
    .split(',')
    .map(segment => segment.trim())
    .filter(item => item.startsWith('tag:'))
    .map(item => item.split('tag:')[1].trim())
    .filter(tagValue => semver.valid(tagValue))
    .map(tagValue => semver.clean(tagValue));
  return tags;
}

/**
 * Extract a structured history of the git commits
 */
function extractCommitHistory() {
  const results = [];
  return getCommandOutput(currentConfig.commands.log)
        .then(text =>
            text
                .split(currentConfig.commands.outputTerminator)
                .map(line => line.split(currentConfig.commands.logDelimiter))
                .map(segments => results.push({
                    hash: segments[0],
                    author: segments[1],
                    subject: segments[2],
                    tags: getDecorationTags(segments[3].trim()).sort(semver.rcompare),
                  })))
        .then(() => results);
}

/**
 * Extract a tuple of tag / hash from the history entires for the most recent (first).
 */
function extractMostRecentTag(historyEntries) {
  const first = historyEntries.find(entry => entry.tags.length > 0);
  if (first) {
    return {
      hash: first.hash,
      tag: first.tags[0],
    };
  }
  return null;
}

/**
 * Extract changes in the history subsequent to the previous tag
 */
function extractChangesAfter(previous, historyEntries) {
  const candidates = [];
  for (const candidate of historyEntries) {
    if (candidate.hash == previous.hash) {
      break;
    }
    candidates.push(candidate);
  }
  return candidates;
}

function classifyChange(subject) {
  const lowerCased = subject.toLowerCase();

  const matched = currentConfig
    .types
    .map(changeType =>
      Array.isArray(changeType.prefix) ?
        {
          prefixes: changeType.prefix,
          change: changeType,
          priority: changeType.priority,
        } : {
          prefixes: [ changeType.prefix ],
          change: changeType,
          priority: changeType.priority,
        })
    .filter(changeType =>
      changeType
        .prefixes
        .filter(prefix => lowerCased.startsWith(prefix))
        .length > 0)
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.change);
  return matched[0] || currentConfig.defaultType;
}

/**
 * Determine the next version of the current repository by looking at the previous
 * commits and working backward.
 */
function determineNextVersion() {
  console.log(currentConfig.outputBreak);

  console.log(' -> Extracting commit history from git');
  return extractCommitHistory()
        .then((historyEntries) => {
            // Previous checkpoint
          console.log(' -> Determining most recent tag from %s commits', historyEntries.length);
          const previous = extractMostRecentTag(historyEntries);

            // No history? Always start at 1.0.0
          if (!previous) {
            console.log(' -> Defaulting to %s since no tag was found', currentConfig.defaultVersion);
            return currentConfig.defaultVersion;
          }

          console.log(' -> Extracting changes since %s', previous.hash);
          const changes = extractChangesAfter(previous, historyEntries);
          console.log(' -> There are %s changes since the last release tag at %s (#%s)',
                chalk.bold.underline(changes.length),
                previous.tag,
                previous.hash);

          let decider = {
            type: 'none',
            priority: Number.NEGATIVE_INFINITY,
          };

            // Print the log
          if (changes.length > 0) {
            console.log(currentConfig.outputBreak);
            for (const change of changes) {
              const changeType = classifyChange(change.subject);
              console.log(`${chalk[changeType.background](changeType.type)}:${chalk[changeType.color](change.subject)}`);
              if (changeType.priority > decider.priority) {
                decider = changeType;
              }
            }
            console.log(currentConfig.outputBreak);
          }


            // No new version?
          if (decider.priority < 0) {
            console.log(`${chalk.bold('No Release')} - No change in the history requires a release`);
            return null;
          }

          const newVersion = semver.inc(previous.tag, decider.type);
          console.log(` -> ${chalk.bold('NEW RELEASE')}: ${chalk.strikethrough(previous.tag)} --> ${chalk.underline(newVersion)}`);

          console.log(currentConfig.outputBreak);
          return newVersion;
        });
}

// Initial Output
console.log();
console.log(currentConfig.outputBreak);
currentConfig.banner.map(x => console.log(chalk.bold(x)));
console.log(currentConfig.outputBreak);
console.log(' -> Checking workspace for uncommitted changes.');

getWorkspaceChanges()
    .then((changes) => {
        // Notify about changes
      if (changes.length === 0) {
        return;
      }

      console.log(chalk.bgRed.white(`The workspace contains ${changes.length} non-committed changes.`));
      changes.map(x => console.log(` -> CHANGED: ${x}`));

        // Exit if invalid workspace?
      if (currentConfig.requireCleanWorkspace) {
        process.exit(currentConfig.exitCodes.dirtyWorkspace);
      }
    })
    // Fetch tags
    .then(() => getCommandOutput(currentConfig.commands.fetchTags))

    // Calculate next version
    .then(() => determineNextVersion())

    // If we've got a new version, bump.
    .then((version) => {
      if (!version) {
        console.log(' -> No need to update package.json');
        return false;
      }

      if (currentConfig.applyNpmVersion) {
        console.log(' -> Running npm version command.');
        return getCommandOutput(`npm version ${version} -m \"${currentConfig.commitMessage}\"`)
                .then(() => console.log(' -> Completed succesfully. Enjoy your new version!\n\n'))
                .then(() => true)
                .catch(output => console.warn(' -> Warning from NPM version command.... %s', output));
      } else {
        console.log(' -> Skipped apply version due to applyNpmVersion not being set.');
      }

      return false;
    })

    // If a version bump occured...
    .then((changed) => {
      if (changed) {
        if (currentConfig.pushUpstream) {
          console.log(' -> Running push commands to send changes back to upstream');
          return getCommandOutput(currentConfig.commands.push)
                    .then(x => console.log(x));
        }
        console.log(' -> Not pushing to upstream due to configuration (pushUpstream=false)');
        return;
      }

      console.log(' -> No changes, not pushing to upstream');
    })

    .catch((err) => {
      console.warn(err);
      process.exit(currentConfig.exitCodes.error);
    });
