// NPM Dependencies
const config = require('config');
const chalk = require('chalk');

// Local Dependencies
const helpers = require('./helpers');
const rules = require('./rules');

// Globals
const currentConfig = config.get('semantique');

// Initial Output
console.log();
console.log(currentConfig.outputBreak);
currentConfig.banner.map(x => console.log(chalk.bold(x)));
console.log(currentConfig.outputBreak);
console.log(' -> Checking workspace for uncommitted changes.');

helpers.getWorkspaceChanges(currentConfig)
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
  .then(() => helpers.getCommandOutput(currentConfig.commands.fetchTags))

  // Calculate next version
  .then(() => rules.determineNextVersion(currentConfig))

  // If we've got a new version, bump.
  .then((version) => {
    if (!version) {
      console.log(' -> No need to update package.json');
      return false;
    }

    if (currentConfig.applyNpmVersion) {
      console.log(' -> Running npm version command.');
      return helpers.getCommandOutput(`npm version ${version} -m "${currentConfig.commitMessage}"`)
              .then(() => console.log(' -> Completed succesfully. Enjoy your new version!\n\n'))
              .then(() => true)
              .catch(output => console.warn(' -> Warning from NPM version command.... %s', output));
    }
    console.log(' -> Skipped apply version due to applyNpmVersion not being set.');

    return false;
  })

  // If a version bump occured...
  .then((changed) => {
    if (changed) {
      if (currentConfig.pushUpstream) {
        console.log(' -> Running push commands to send changes back to upstream');
        return helpers.getCommandOutput(currentConfig.commands.push)
                  .then(x => console.log(x));
      }
      console.log(' -> Not pushing to upstream due to configuration (pushUpstream=false)');
      return null;
    }

    console.log(' -> No changes, not pushing to upstream');
    return null;
  })

  .catch((err) => {
    console.warn(err);
    process.exit(currentConfig.exitCodes.error);
  });
