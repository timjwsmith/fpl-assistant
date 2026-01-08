import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
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
  return new Octokit({ auth: accessToken });
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

export async function pushToGitHub(repoName: string, createIfNotExists: boolean = true, isPrivate: boolean = false) {
  const accessToken = await getAccessToken();
  const user = await getGitHubUser();
  const username = user.login;
  
  console.log(`[GitHub Sync] Authenticated as ${username}`);
  
  const repoUrl = `https://${username}:${accessToken}@github.com/${username}/${repoName}.git`;
  
  if (createIfNotExists) {
    try {
      const octokit = await getUncachableGitHubClient();
      await octokit.repos.get({ owner: username, repo: repoName });
      console.log(`[GitHub Sync] Repository ${username}/${repoName} already exists`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`[GitHub Sync] Creating repository ${username}/${repoName}...`);
        await createRepository(repoName, 'FPL Assistant - AI-powered Fantasy Premier League tool', isPrivate);
        console.log(`[GitHub Sync] Repository created`);
      } else {
        throw error;
      }
    }
  }
  
  try {
    execSync('git remote remove github 2>/dev/null || true', { cwd: process.cwd() });
    execSync(`git remote add github "${repoUrl}"`, { cwd: process.cwd() });
    
    execSync('git config user.email "fpl-assistant@replit.com"', { cwd: process.cwd() });
    execSync(`git config user.name "${username}"`, { cwd: process.cwd() });
    
    const status = execSync('git status --porcelain', { cwd: process.cwd() }).toString();
    if (status.trim()) {
      console.log(`[GitHub Sync] Committing uncommitted changes...`);
      execSync('git add -A', { cwd: process.cwd() });
      execSync('git commit -m "Sync from Replit FPL Assistant"', { cwd: process.cwd() });
    }
    
    console.log(`[GitHub Sync] Pushing to GitHub...`);
    execSync('git push -u github main --force', { cwd: process.cwd() });
    
    console.log(`[GitHub Sync] Successfully pushed to https://github.com/${username}/${repoName}`);
    
    return {
      success: true,
      repoUrl: `https://github.com/${username}/${repoName}`,
      message: `Successfully pushed to GitHub`
    };
  } catch (error: any) {
    console.error('[GitHub Sync] Push failed:', error.message);
    throw new Error(`Failed to push to GitHub: ${error.message}`);
  }
}
