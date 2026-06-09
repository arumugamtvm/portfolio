#!/usr/bin/env node
/**
 * Portfolio MCP server.
 *
 * Exposes read-only tools that an AI agent (Claude Desktop / Claude Code) can
 * call over stdio:
 *   - get_profile        full profile object from ./profile.json
 *   - get_skills         skills array
 *   - get_projects       projects array
 *   - get_resume_text    plain-text resume
 *   - get_github_repos   live repos from the public GitHub API (no key)
 *
 * Built against @modelcontextprotocol/sdk v1.x. In that release `inputSchema`
 * is a *raw Zod shape* (a plain object whose values are Zod schemas), NOT a
 * `z.object(...)`. The handler then receives the parsed args object.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Resolve paths relative to THIS file, never process.cwd(), so the server
// works no matter where the agent spawns it from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Single source of truth: the profile.json at the repo ROOT (one level up),
// which is also what the website serves at /profile.json.
const PROFILE_PATH = join(__dirname, '..', 'profile.json');

const GITHUB_USER = 'arumugamtvm';

/** Read and parse the root profile.json fresh on each call. */
function loadProfile() {
  const raw = readFileSync(PROFILE_PATH, 'utf8');
  return JSON.parse(raw);
}

/** Wrap any JS value as a single JSON text content block. */
function jsonBlock(value) {
  return {
    content: [
      { type: 'text', text: JSON.stringify(value, null, 2) },
    ],
  };
}

/** Wrap a plain string as a single text content block. */
function textBlock(text) {
  return { content: [{ type: 'text', text }] };
}

const server = new McpServer({
  name: 'arumugam-portfolio',
  version: '1.0.0',
});

server.registerTool(
  'get_profile',
  {
    title: 'Get Profile',
    description:
      'Return the full profile (name, title, location, contact links, summary) from profile.json.',
    inputSchema: {}, // no parameters
  },
  async () => jsonBlock(loadProfile()),
);

server.registerTool(
  'get_skills',
  {
    title: 'Get Skills',
    description: 'Return the list of technical skills.',
    inputSchema: {},
  },
  async () => jsonBlock(loadProfile().skills ?? []),
);

server.registerTool(
  'get_projects',
  {
    title: 'Get Projects',
    description: 'Return the list of projects with descriptions, URLs and tech stacks.',
    inputSchema: {},
  },
  async () => jsonBlock(loadProfile().projects ?? []),
);

server.registerTool(
  'get_resume_text',
  {
    title: 'Get Resume Text',
    description: 'Return the resume as plain text suitable for reading or summarizing.',
    inputSchema: {},
  },
  async () => textBlock(loadProfile().resume_text ?? ''),
);

server.registerTool(
  'get_github_repos',
  {
    title: 'Get GitHub Repos',
    description:
      'Fetch public repositories for the GitHub user from the live GitHub REST API. ' +
      'Optionally limit how many repos are returned (most recently pushed first).',
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of repositories to return (default 30).'),
    },
  },
  async ({ limit }) => {
    const url =
      `https://api.github.com/users/${GITHUB_USER}/repos` +
      `?sort=pushed&direction=desc&per_page=100`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'arumugam-portfolio-mcp',
      },
    });

    if (!res.ok) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `GitHub API request failed: ${res.status} ${res.statusText}`,
          },
        ],
      };
    }

    const repos = await res.json();
    const slimmed = (Array.isArray(repos) ? repos : [])
      .slice(0, limit ?? 30)
      .map((r) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        language: r.language,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        pushed_at: r.pushed_at,
        topics: r.topics ?? [],
      }));

    return jsonBlock(slimmed);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Do NOT write to stdout — stdio transport uses it for JSON-RPC framing.
  // Diagnostics must go to stderr.
  console.error('arumugam-portfolio MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
