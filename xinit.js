const xinit = {
  name: 'xinit',
  factory: require => {
    const { inspect } = require('util')
    const {
      Command,
      UsageError,
    } = require(`clipanion`)
    const {
      xfs,
      ppath,
      Filename,
    } = require(`@yarnpkg/fslib`)
    const {
      Configuration,
      Manifest,
      Project,
      structUtils,
    } = require(`@yarnpkg/core`)

    class XinitCommand extends Command {
      async execute() {
        if (xfs.existsSync(ppath.join(this.context.cwd, Manifest.fileName)))
          throw new UsageError(`A package.json already exists in the specified directory`)

        const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

        let existingProject = null;
        if (!this.assumeFreshProject) {
          try {
            existingProject = await Project.find(configuration, this.context.cwd)
          } catch {
            existingProject = null
          }
        }

        if (!xfs.existsSync(this.context.cwd)) {
          await xfs.mkdirPromise(this.context.cwd, {recursive: true});
        }

        const manifest = new Manifest();

        const fields = Object.fromEntries(configuration.get(`initFields`).entries());
        manifest.load(fields);

        manifest.name = structUtils.makeIdent(configuration.get(`initScope`), ppath.basename(this.context.cwd));
        manifest.private = this.private || this.workspace;

        if (this.workspace) {
          await xfs.mkdirPromise(ppath.join(this.context.cwd, `packages`), {recursive: true});
          manifest.workspaceDefinitions = [{
            pattern: `packages/*`,
          }];
        }

        const serialized = {};
        manifest.exportTo(serialized);

        // @ts-expect-error: The Node typings forgot one field
        inspect.styles.name = `cyan`;

        this.context.stdout.write(`${inspect(serialized, {
          depth: Infinity,
          colors: true,
          compact: false,
        })}\n`);

        const manifestPath = ppath.join(this.context.cwd, Manifest.fileName);
        await xfs.changeFilePromise(manifestPath, `${JSON.stringify(serialized, null, 2)}\n`);

        if (!existingProject) {
          const lockfilePath = ppath.join(this.context.cwd, Filename.lockfile);
          await xfs.writeFilePromise(lockfilePath, ``);
        }
      }
    }

    XinitCommand.addPath(`xinit`)

    return {
      commands: [
        XinitCommand,
      ]
    }
  }
}

module.exports = xinit
