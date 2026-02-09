import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken, request: { timeout: 30000 } });
}

export async function getGitHubUser() {
  const octokit = await getUncachableGitHubClient();
  const { data: user } = await octokit.users.getAuthenticated();
  return user;
}

export async function listRepositories() {
  const octokit = await getUncachableGitHubClient();
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50
  });
  return repos.map(repo => ({
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    private: repo.private,
    default_branch: repo.default_branch
  }));
}

export async function createRepository(name: string, description: string, isPrivate: boolean = false) {
  const octokit = await getUncachableGitHubClient();
  const { data: repo } = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: false
  });
  return repo;
}

const INCLUDE_DIRS = ['client', 'server', 'shared'];
const INCLUDE_ROOT_FILES = [
  'package.json', 'tsconfig.json', 'vite.config.ts', 'tailwind.config.ts',
  'postcss.config.js', 'drizzle.config.ts', 'theme.json',
  '.gitignore', 'replit.md', 'README.md',
];

function shouldIncludeFile(filePath: string): boolean {
  if (INCLUDE_ROOT_FILES.includes(filePath)) return true;
  const topDir = filePath.split('/')[0];
  if (INCLUDE_DIRS.includes(topDir)) {
    const ignorePatterns = ['node_modules/', '.cache/', 'dist/'];
    return !ignorePatterns.some(pattern => filePath.includes(pattern));
  }
  return false;
}

function getAllFiles(dirPath: string, basePath: string = ''): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (!shouldIncludeFile(relativePath)) continue;
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath);
          const isText = !content.some(byte => byte === 0);
          if (isText) {
            files.push({ path: relativePath, content: content.toString('base64') });
          }
        } catch {
        }
      }
    }
  } catch {
  }
  
  return files;
}

export async function pushToGitHub(repoName: string, createIfNotExists: boolean = true, isPrivate: boolean = false) {
  const octokit = await getUncachableGitHubClient();
  const user = await getGitHubUser();
  const owner = user.login;
  
  console.log(`[GitHub Sync] Authenticated as ${owner}`);

  if (createIfNotExists) {
    try {
      await octokit.repos.get({ owner, repo: repoName });
      console.log(`[GitHub Sync] Repository ${owner}/${repoName} already exists`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`[GitHub Sync] Creating repository ${owner}/${repoName}...`);
        await createRepository(repoName, 'FPL Assistant - AI-powered Fantasy Premier League tool', isPrivate);
        console.log(`[GitHub Sync] Repository created`);
      } else {
        throw error;
      }
    }
  }

  try {
    console.log(`[GitHub Sync] Collecting files...`);
    const projectDir = process.cwd();
    const files = getAllFiles(projectDir);
    console.log(`[GitHub Sync] Found ${files.length} files to push`);

    async function createBlobWithRetry(file: { path: string; content: string }, retries = 3): Promise<{ path: string; sha: string; mode: '100644'; type: 'blob' }> {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo: repoName,
            content: file.content,
            encoding: 'base64',
          });
          return { path: file.path, sha: blob.sha, mode: '100644' as const, type: 'blob' as const };
        } catch (err: any) {
          if (err.status === 403 && attempt < retries - 1) {
            const wait = (attempt + 1) * 30000;
            console.log(`[GitHub Sync] Rate limited, waiting ${wait / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, wait));
          } else {
            throw err;
          }
        }
      }
      throw new Error('Exhausted retries');
    }

    const batchSize = 5;
    const blobs: Array<{ path: string; sha: string; mode: '100644'; type: 'blob' }> = [];
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(f => createBlobWithRetry(f)));
      blobs.push(...batchResults);
      if ((i + batchSize) % 50 === 0 || i + batchSize >= files.length) {
        console.log(`[GitHub Sync] Uploaded ${blobs.length}/${files.length} files...`);
      }
    }

    console.log(`[GitHub Sync] Created ${blobs.length} blobs`);

    const { data: tree } = await octokit.git.createTree({
      owner,
      repo: repoName,
      tree: blobs,
    });

    let parentSha: string | undefined;
    try {
      const { data: ref } = await octokit.git.getRef({
        owner,
        repo: repoName,
        ref: 'heads/main',
      });
      parentSha = ref.object.sha;
    } catch {
    }

    const commitParams: any = {
      owner,
      repo: repoName,
      message: `Sync from Replit FPL Assistant - ${new Date().toISOString().split('T')[0]}`,
      tree: tree.sha,
    };
    if (parentSha) {
      commitParams.parents = [parentSha];
    }

    const { data: commit } = await octokit.git.createCommit(commitParams);

    try {
      await octokit.git.updateRef({
        owner,
        repo: repoName,
        ref: 'heads/main',
        sha: commit.sha,
        force: true,
      });
    } catch {
      await octokit.git.createRef({
        owner,
        repo: repoName,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
    }

    console.log(`[GitHub Sync] Successfully pushed to https://github.com/${owner}/${repoName}`);
    
    return {
      success: true,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      message: `Successfully pushed to GitHub`
    };
  } catch (error: any) {
    console.error('[GitHub Sync] Push failed:', error.message);
    throw new Error(`Failed to push to GitHub: ${error.message}`);
  }
}
