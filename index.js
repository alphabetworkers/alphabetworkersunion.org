const execa = require('execa');
const path = require('path');

const USAGE = `${path.basename(process.argv[0])} ` +
  `${path.basename(process.argv[1])} <npmScriptName> <project1> ` +
  `[<project2> ...]`;

async function runNPMScript(scriptName, ...projects) {
  if (!scriptName) {
    throw new Error(`Please provide an <npmScriptName>.\nUsage: ${USAGE}`);
  }

  if (projects.length === 0) {
    throw new Error(`Please provide at least one <project>.\nUsage: ${USAGE}`);
  }

  const promises = projects.map((project) => {
    console.log(`[${project}]: npm run ${scriptName}`);
    return execa('npm', ['run', scriptName], {
      cwd: path.resolve(__dirname, project),
      stdio: 'inherit',
    });
  });

  await Promise.all(promises);
}

runNPMScript(...process.argv.slice(2))
  .then(() => console.log('All scripts complete.'))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
