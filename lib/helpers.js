const exec = require('child_process').exec;
const semver = require('semver');

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
function getWorkspaceChanges(currentConfig) {
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
function extractCommitHistory(currentConfig) {
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
  const previousIndex = historyEntries.findIndex(item => item.hash === previous.hash);
  return historyEntries.slice(0, previousIndex - 1);
}

module.exports = {
  extractChangesAfter,
  extractCommitHistory,
  extractMostRecentTag,
  getCommandOutput,
  getWorkspaceChanges,
  getDecorationTags,
};
