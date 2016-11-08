// NPM Dependencies
const chalk = require('chalk');
const semver = require('semver');

// Local Dependencies
const helpers = require('./helpers');

/**
 * Classify a change subject line from git using the current
 * configuration.
 */
function classifyChange(subject, currentConfig) {
  const lowerCased = subject.toLowerCase();
  const matched = currentConfig
        .types
        .map(changeType =>
            (Array.isArray(changeType.prefix) ?
            {
              prefixes: changeType.prefix,
              change: changeType,
              priority: changeType.priority,
            } : {
              prefixes: [changeType.prefix],
              change: changeType,
              priority: changeType.priority,
            }))
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
function determineNextVersion(currentConfig) {
  console.log(currentConfig.outputBreak);

  console.log(' -> Extracting commit history from git');
  return helpers.extractCommitHistory(currentConfig)
        .then((historyEntries) => {
            // Previous checkpoint
          console.log(' -> Determining most recent tag from %s commits', historyEntries.length);
          const previous = helpers.extractMostRecentTag(historyEntries);

            // No history? Always start at 1.0.0
          if (!previous) {
            console.log(' -> Defaulting to %s since no tag was found', currentConfig.defaultVersion);
            return currentConfig.defaultVersion;
          }

          console.log(' -> Extracting changes since %s', previous.hash);
          const changes = helpers.extractChangesAfter(previous, historyEntries);
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
            changes
                    .forEach((change) => {
                      const changeType = classifyChange(change.subject, currentConfig);
                      console.log(`${chalk[changeType.background](changeType.type)}:${chalk[changeType.color](change.subject)}`);
                      if (changeType.priority > decider.priority) {
                        decider = changeType;
                      }
                    });
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

module.exports = {
  classifyChange,
  determineNextVersion,
};
