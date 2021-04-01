import fs from 'fs-extra';
import decompress from 'decompress';
import decompressTargz from 'decompress-targz';
import path from 'path';
import { executeCommand, proxyFetch } from './utils';

type Repository = {
  name: string;
  owner: string;
};

export default class PackageFetcher {
  protected tmpFolderPath: string;

  protected repoArchivePath: string;

  constructor(private repo: Repository) {
    this.tmpFolderPath = path.resolve('.', 'node_modules', '.tmp');

    this.init();

    this.repoArchivePath = `${this.tmpFolderPath}/master.tar.gz`;
  }

  init() {
    try {
      // Folder node_modules does not exist by default inside docker in /cube/conf without sharing volume for it
      fs.mkdirpSync(this.tmpFolderPath);
    } catch (err) {
      if (err.code === 'EEXIST') {
        this.cleanup();
        fs.mkdirSync(this.tmpFolderPath);
      } else {
        throw err;
      }
    }
  }

  async manifestJSON() {
    const response = await proxyFetch(
      `https://api.github.com/repos/${this.repo.owner}/${this.repo.name}/contents/manifest.json`
    );

    return JSON.parse(Buffer.from((await response.json()).content, 'base64').toString());
  }

  async downloadRepo() {
    const url = `https://github.com/${this.repo.owner}/${this.repo.name}/archive/master.tar.gz`;
    const writer = fs.createWriteStream(this.repoArchivePath);

    (await proxyFetch(url)).body.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  async downloadPackages() {
    await this.downloadRepo();

    await decompress(this.repoArchivePath, this.tmpFolderPath, {
      plugins: [decompressTargz()],
    });

    const dir = fs.readdirSync(this.tmpFolderPath).find((name) => !name.endsWith('tar.gz'));

    if (!dir) {
      throw new Error('No directory found');
    }

    fs.removeSync(path.resolve(this.tmpFolderPath, dir, 'yarn.lock'));
    await executeCommand('npm', ['install'], { cwd: path.resolve(this.tmpFolderPath, dir) });

    return {
      packagesPath: path.join(this.tmpFolderPath, dir, 'packages'),
    };
  }

  cleanup() {
    fs.removeSync(this.tmpFolderPath);
  }
}
