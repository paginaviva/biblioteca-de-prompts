# Developer and Installer Manual — biblioteca-de-prompts

> **Application**: biblioteca-de-prompts (formerly "Prompt Database")
> **Fork developed by**: PáginaVIVA (original repository: `YellowBerry007/prompt-database`, author Berry @ Yellowgrape)
> **Current repository**: <https://github.com/omagallanes/p-database>
> **Deployment**: production on Vercel + Neon.tech PostgreSQL
> **Manual version**: 1.0 — written and verified against the repository code on 7 August 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Prerequisites](#2-prerequisites)
3. [Getting the code](#3-getting-the-code)
4. [Installing dependencies](#4-installing-dependencies)
5. [Environment configuration](#5-environment-configuration)
6. [Database](#6-database)
7. [Running in development](#7-running-in-development)
8. [Testing](#8-testing)
9. [Production deployment](#9-production-deployment)
10. [Known errors and solutions](#10-known-errors-and-solutions)
11. [Quick reference guide](#11-quick-reference-guide)

**Appendices**

- [Appendix A. Application routes and API endpoints](#appendix-a-application-routes-and-api-endpoints)
- [Appendix B. Data models of Prisma](#appendix-b-data-models-of-prisma)

---

## 1. Introduction

### 1.1 What the application is

**biblioteca-de-prompts** is a full-stack web application for managing and organizing messages addressed to artificial intelligences, known as *prompts*. The application lets you create, edit, delete, duplicate, mark as favourite, share, export and import prompts, as well as organize them by hierarchical categories, tags, platforms, use cases, clients or projects, suggested models and languages. It also records the usage count of each prompt and the date it was last used.

The current application is a **fork** of the repository `YellowBerry007/prompt-database`, whose original author is Berry (@ Yellowgrape). The fork is developed by **PáginaVIVA** and is hosted in the repository <https://github.com/omagallanes/p-database>. The Vercel project keeps the historical name `prompt-database`.

### 1.2 Important warning about the development model

This project **has no local development environment**. All development runs directly in production. This statement is not an opinion: it is written in the header of the repository's `.env.example` file (verbatim: "NO HAY ENTORNO LOCAL DE DESARROLLO. Todo el desarrollo se ejecuta directamente en PRODUCTION (Vercel + Neon.tech PostgreSQL)"). The production environment variables are configured in the Vercel Dashboard, under Project → Settings → Environment Variables.

This means that, although the chapters of this manual also explain how to run the application on a local machine (because the codebase allows it), the official and verified workflow of the project is the following:

1. Files are modified on the workstation.
2. The test suite is run locally (`npm test`).
3. Changes are committed with `git commit` and pushed with `git push origin main`.
4. The release is deployed manually with the Vercel command-line interface (`vercel deploy --prod`).
5. Functional verification is performed against the production URL.

**Practical advice**: any change tested only locally is considered unverified until it is deployed to production and checked there.

### 1.3 General architecture

The application follows the Next.js App Router server-rendering model:

- **Interface**: React components with TailwindCSS and the shadcn/ui component set.
- **Server routes**: the `app/` directory contains the pages (Server Components) and the API endpoints (Route Handlers) under `app/api/`.
- **Data layer**: the Prisma ORM connects to PostgreSQL. The production database is hosted on Neon.tech.
- **Authentication**: NextAuth.js (version 5, in beta) with a credentials provider (email and password), JWT session strategy and Prisma adapter. It includes its own security hardening: lockout after failed attempts (five failures produce a fifteen-minute lockout), per-IP lockout, session revocation through `tokenVersion` and control of active or inactive users.
- **Internationalization**: next-intl, with two active languages: British English (`en-GB`) and Spanish from Spain (`es-ES`).
- **Validation**: Zod for the validation schemas of the forms and the API endpoints.

### 1.4 Technology stack (versions verified in `package.json`)

| Category | Technology | Version in the repository |
|---|---|---|
| Framework | Next.js (App Router) | `^14.2.35` |
| Language | TypeScript | `^5.5.4` |
| Interface | React / React DOM | `^18.3.1` |
| Styling | TailwindCSS | `^3.4.7` |
| UI components | shadcn/ui on @radix-ui (dialog, dropdown-menu, label, select, slot, tabs) | Radix `^1.1.x` per `package.json` |
| Icons | lucide-react | `^0.427.0` |
| ORM | Prisma (client and CLI) | `^5.19.1` |
| Database | PostgreSQL (production: Neon.tech) | Not applicable in the code |
| Authentication | next-auth | `^5.0.0-beta.31` |
| Authentication adapter | @auth/prisma-adapter | `^2.11.2` |
| Internationalization | next-intl | `^4.13.5` |
| Validation | zod | `^3.23.8` |
| Passwords | bcryptjs | `^3.0.3` |
| Notifications | sonner | `^1.7.0` |
| Testing | Jest, @testing-library/react, jest-environment-jsdom | `^29.7.0`, `^16.0.0`, `^29.7.0` |
| Linter | ESLint and eslint-config-next | `^8.57.1`, `^14.2.5` |
| TypeScript runner for scripts | tsx | `^4.16.2` |
| Styling utilities | class-variance-authority, tailwind-merge, clsx, tailwindcss-animate | `^0.7.0`, `^2.5.2`, `^2.1.1`, `^1.0.7` |

Verified notes:

- `package.json` does not declare the `engines` field. The Node.js requirement comes from the `README.md` file, which states "Node.js 20 or higher".
- The verified development environment in which this manual was written runs Node.js `v24.14.0` and npm `11.9.0`. The repository's deployment guide (`docs/guide/deployment.md`) recommends selecting Node.js 24.x (or the latest stable version) in the Vercel project configuration.
- `next.config.js` declares `output: "standalone"`, `reactStrictMode: true` and a 2 MB body size limit for Server Actions (`experimental.serverActions.bodySizeLimit: "2mb"`).

### 1.5 Directory structure (verified in the repository)

```
p-database/
├── app/                    # Application routes (App Router)
│   ├── (app)/              #   Protected sections: prompts, categories, tags,
│   │                       #   taxonomy (seven pages), shared, auth/profile
│   ├── (auth)/             #   Public authentication pages: signin, signup, error
│   └── api/                #   API endpoints (Route Handlers)
├── components/             # Interface components
│   ├── auth/               #   Session and authentication forms
│   ├── layout/             #   Top bar and sidebar
│   ├── profile/            #   User profile (tabs)
│   ├── prompt/             #   Prompt form, list and filters
│   ├── shared/             #   Shared prompts
│   ├── taxonomy/           #   Catalog management (taxonomy)
│   └── ui/                 #   shadcn/ui components
├── contexts/               # React contexts (UIContext: theme, columns, preferences)
├── i18n/                   # Locale configuration (locales.ts, request.ts)
├── lib/                    # Prisma, authentication, utilities
├── messages/               # Translation catalogs (es-ES.json, en-GB.json)
├── prisma/                 # Schema, seed and data migration script
├── tests/                  # Jest tests (api, components, i18n, unit)
├── types/                  # Shared TypeScript types
├── .env.example            # Environment variable reference (no real values)
├── next.config.js          # Next.js configuration (with the next-intl plugin)
├── vercel.json             # Vercel deployment configuration
├── jest.config.js          # Jest configuration (with coverage thresholds)
└── jest.setup.js           # Test environment setup (next-auth mocks)
```

### 1.6 Main features (verified)

- Creation, editing, deletion, duplication and copy-to-clipboard of prompts.
- Organization through hierarchical categories (tree relationship with parent and children) and tags.
- Filtering by category, tags, platform, status, language, use cases, clients or projects and models, plus the favourites view.
- Full-text search across the prompt title, description and body.
- Usage tracking (usage count and last used date) when copying a prompt.
- Export and import in JSON format (export produces version 2.0 with N:M relations as arrays; import accepts both version 2.0 and the legacy version 1.0).
- Per-user isolation: each user sees exclusively their own prompts (the list, search, filters, detail, usage, export and import are all filtered by owner). Other users' prompts return a 404 error so their existence is not revealed.
- Sharing prompts: the `/shared` page shows prompts shared by **other** users; the detail is read-only and allows copying (which increments the usage counter).
- User management by the administrator: creation, editing, deactivation and deletion. The last active administrator cannot be deactivated or deleted.
- Account personalization: language, light or dark theme, accent colour, filter order and list columns.
- Internationalization with two active languages: British English and Spanish from Spain.

### 1.7 About the repository's README.md file

The `README.md` file retains content from the original fork and **must not be taken as a reliable reference** for this project. Among the verified discrepancies:

- It mentions a `docs/index.md` file that does not exist in the repository (there is a `docs/README.md` instead).
- It mentions `DOCKER.md` and `DEPLOYMENT.md`, files that do not exist.
- It describes a local SQLite database (`file:./dev.db`), a flow that contradicts the warning in `.env.example` about the absence of a local environment.
- It contains a fragment of documentation in Dutch in the Docker section.

This manual, in contrast, was written by verifying the real code of the repository.

---

## 2. Prerequisites

Before starting, make sure you have all of the following:

### 2.1 Node.js 20 or higher

The application requires **Node.js 20 or higher** (requirement declared in the repository's `README.md`; the project was developed and verified with Node.js 24.x). You can check the installed version with:

```bash
node --version
```

If you do not have Node.js installed or your version is below 20, install the latest LTS version from the official site <https://nodejs.org>.

> **Warning**: `package.json` does not define the `engines` field, so Node.js will not reject lower versions by itself. If you use a version below 20, the build may fail or behave unexpectedly. Do not risk it: use 20 or a higher version.

### 2.2 Package manager

The repository contains the `package-lock.json` file, so the recommended package manager is **npm** (installed together with Node.js). The commands in this manual use `npm` exclusively. The original `README.md` also mentions `yarn` and `pnpm` as alternatives, but there is no evidence that they have been used in this project; if you use them, note that the scripts in `package.json` are defined agnostically and should work with any manager.

### 2.3 Git

You need `git` to clone the repository and to commit and push changes. Check your installation with:

```bash
git --version
```

### 2.4 Vercel account with access to the project

- An account at <https://vercel.com>.
- Access to the `prompt-database` project (this is the name the project keeps in Vercel), under the team of user `omagallanes`.
- Minimum role needed: **Developer** (or higher) within the team.

### 2.5 PostgreSQL database (Neon.tech)

- An account at <https://neon.tech> with a PostgreSQL database created for the project.
- From it you will obtain two connection strings: one with pooling for `DATABASE_URL` and one without pooling for `DATABASE_URL_UNPOOLED` (see Part 5).

### 2.6 Vercel command-line interface (Vercel CLI)

It is used to deploy manually and to inspect logs and deployments. Global installation:

```bash
npm install -g vercel
```

Check the installation:

```bash
vercel --version
```

> **Verified note**: the project's internal guide (`docs/guide/deployment.md`) documents the use of **Vercel CLI 56.x**. Very different versions may change commands or flags. If the behaviour differs from what is described in this manual, consult the official Vercel documentation.

### 2.7 openssl utility

It is needed to generate the `AUTH_SECRET` authentication secret (Part 5). On Windows systems you can use WSL (Windows Subsystem for Linux) or the equivalent command in Git Bash.

### 2.8 Recommended (not required) tools

The repository includes a development container configuration (`.devcontainer/devcontainer.json`) that suggests the Visual Studio Code extensions `dbaeumer.vscode-eslint` (ESLint), `bradlc.vscode-tailwindcss` (Tailwind CSS) and `Prisma.prisma` (Prisma). They make work easier but are not essential.

---

## 3. Getting the code

### 3.1 Cloning the repository

Open a terminal and run:

```bash
git clone https://github.com/omagallanes/p-database.git
cd p-database
```

> **Warning**: there is no alternative installation path. The project is not distributed as a package; the only way to obtain the code is by cloning the Git repository.

### 3.2 Repository branches

The repository contains, at least, the following branches:

| Branch | Purpose |
|---|---|
| `main` | Production branch. After the cutover documented in `docs/planning/main-version-2-cutover.md`, all functionality is integrated here and deployed from here. |
| `version-2` | Historical branch of the previous version. It is not used for current development. |

You can view the local and remote branches with:

```bash
git branch -a
```

### 3.3 Verifying the clone

After cloning, verify that everything is in order:

```bash
# Location and status of the repository
git status

# Tool versions
node --version
npm --version
```

### 3.4 Notes on the repository contents

- Any `.env` file that may exist in a working clone is **not versioned** (it is in `.gitignore`) and contains real tokens. Do not share it or commit it to Git.
- The `.vercel/` directory is also not versioned; it contains the local link to the Vercel project (Part 9).
- The `prisma/migrations/` directory **does not exist in the repository** and is excluded by `.gitignore` (line 41). Migrations are regenerated locally (Part 6).
- The `docs/` directory is excluded from version control according to `.gitignore` (line 45), although in practice some files from `docs/` are present in the repository; treat its content as unofficial internal documentation.
- Paths with parentheses such as `app/(app)/prompts/page.tsx` must **always** be quoted when passed to Git commands; without quotes, the terminal interprets the parentheses as shell syntax (see known error 13 in Part 10).

---

## 4. Installing dependencies

### 4.1 Installation command

From the root of the repository (`/workspaces/p-database` or the directory where you cloned it), run:

```bash
npm install
```

This command installs all the dependencies declared in `package.json` (runtime dependencies and development dependencies).

### 4.2 Reproducible installation with npm ci

The repository contains the `package-lock.json` file, which pins the exact versions. In continuous integration environments or when you want an installation identical to the verified one, you can use:

```bash
npm ci
```

### 4.3 What happens during installation

The `postinstall` script of `package.json` is defined as `prisma generate`. Therefore, **when installation finishes, Prisma automatically generates the Prisma client** (the types and data-access functions) from `prisma/schema.prisma`. This means that after `npm install` the Prisma client is already available and there is no need to run `npm run db:generate` manually (although the command exists and can be used at any time).

### 4.4 Verifying the installation

Check that the Prisma client was generated correctly:

```bash
ls node_modules/.prisma/client  # the generated client must exist
npm run db:generate             # regenerates the client explicitly (optional)
```

> **Warning**: if `npm install` ends with errors related to Prisma (for example, "Client not found" or engine download failures), the most frequent cause is a restricted network or an incompatible Node.js version. Retry with `npm ci` and, if the problem persists, see the error log in Part 10.

### 4.5 Typical installation errors

- **"Prisma Client not found"**: it means `prisma generate` did not run (for example, because the `postinstall` script was skipped or the installation was interrupted). Solution: run `npm run db:generate`.
- **OpenSSL problems at deployment**: the schema declares binary targets (`binaryTargets`) for several environments; if the deployment fails because of the OpenSSL version, see known error 8 in Part 10.

---

## 5. Environment configuration

### 5.1 Guiding principle: there is no local development environment

The `.env.example` file is the only authoritative source about the environment variables. Its header is explicit and worth quoting in full:

> "NO HAY ENTORNO LOCAL DE DESARROLLO. Todo el desarrollo se ejecuta directamente en PRODUCTION (Vercel + Neon.tech PostgreSQL). Las variables de producción se configuran en Vercel Dashboard: Vercel → Project → Settings → Environment Variables. Este archivo .env.example es solo referencia de las variables que Vercel provee automáticamente. NO pongas valores reales aquí — este archivo se versiona."

(Translation: "THERE IS NO LOCAL DEVELOPMENT ENVIRONMENT. All development runs directly in PRODUCTION (Vercel + Neon.tech PostgreSQL). The production variables are configured in the Vercel Dashboard: Vercel → Project → Settings → Environment Variables. This .env.example file is only a reference of the variables that Vercel provides automatically. Do NOT put real values here — this file is versioned.")

Therefore:

1. **Do not create a local `.env` file with production values** unless you know exactly what you are doing (for example, to run Prisma migrations against the Neon database from your machine, see Part 6).
2. **The real production variables live in the Vercel Dashboard**, never in the repository.
3. The workstation `.env` file (not versioned) may contain deployment tokens such as `VERCEL_TOKEN`; do not share them.

### 5.2 Explanation of each variable

Below is an explanation of each variable that appears in `.env.example`, plus the variables that the repository code requires and that are not documented in the example (marked as pending verification).

#### 5.2.1 Database variables

| Variable | Description | Source |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string **with pooling**. Prisma uses it at runtime. Format: `postgresql://user:password@host-pooler.region.neon.tech/dbname?sslmode=require` | Neon.tech Dashboard → Connection Details → pooled connection |
| `DATABASE_URL_UNPOOLED` | PostgreSQL connection string **without** pooling. It is recommended for running Prisma migrations. Format: `postgresql://user:password@host.region.neon.tech/dbname?sslmode=require` | Neon.tech Dashboard → Connection Details → direct connection |

> **Verified warning**: the Prisma schema database is `postgresql` (datasource `db` in `prisma/schema.prisma`, with `provider = "postgresql"` and `url = env("DATABASE_URL")`). The project **does not** use SQLite in production; the mentions of `file:./dev.db` belong to the `README.md` inherited from the original fork and are not applicable.

#### 5.2.2 Authentication variables

| Variable | Description | Source |
|---|---|---|
| `AUTH_SECRET` | NextAuth.js secret that signs the JWT sessions. **It must be generated** with the command `openssl rand -base64 32`; the example value does not work in production | Generate it yourself |
| `AUTH_URL` | Base URL of the application in production. In the example it reads `https://prompt-database-liard.vercel.app` | Vercel (production alias) |

> **Verified warning**: the value `https://prompt-database-liard.vercel.app` is the one that appears in `.env.example` and in the internal deployment guide. Always check the current production alias in the Vercel Dashboard before relying on it; aliases can change.

> **Verified note**: the internal guide `docs/guide/deployment.md` also mentions the aliases `NEXTAUTH_SECRET` and `NEXTAUTH_URL` as equivalents of `AUTH_SECRET` and `AUTH_URL`. The repository code (`lib/auth.ts`) only reads `AUTH_SECRET`; if you define both, keep them with the same value to avoid confusion.

#### 5.2.3 Seed process variables

| Variable | Description | Source |
|---|---|---|
| `SEED_ADMIN_PASSWORD` | Plain-text password that the seed script `prisma/seed.ts` hashes with bcrypt for the administrator account (`server@paginaviva.net`) | Your own configuration (see Part 6) |
| `SEED_USER_PASSWORD` | Plain-text password that the seed script hashes for the user account (`chamed@paginaviva.net`) | Your own configuration (see Part 6) |

> **Pending verification**: these two variables **do not appear in `.env.example`**. Their existence is verified in the code (`prisma/seed.ts` reads them with `process.env` and the script exits with an error if they are missing), but they are not documented in the repository's example file. If you run the seed, define both variables in the environment from which you run it (or in Vercel if you run it there). The script **does not support default values**: if they are missing, it throws an explicit error and creates no users.

#### 5.2.4 Optional application variables

| Variable | Description | Source |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Base path for deploying the application in a subfolder. If defined, `next.config.js` applies `basePath` and `assetPrefix` with that value. If left empty, the application is served from the root | Optional, only if a subfolder deployment is needed |

#### 5.2.5 Variables that Vercel assigns automatically

| Variable | Description |
|---|---|
| `VERCEL` | Set to `1` during Vercel deployments. It indicates that the application runs on Vercel |
| `VERCEL_ENV` | Deployment environment: `production`, `preview` or `development` |
| `VERCEL_URL` | URL of the deployment (for example, `prompt-database-liard.vercel.app`) |
| `VERCEL_OIDC_TOKEN` | OIDC token generated automatically when running `vercel link` (see Part 9) |

Do not define these manually in the Vercel Dashboard; the platform injects them during deployment.

#### 5.2.6 Workstation-local variables (not sent to Vercel)

| Variable | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token for deploying from the command-line interface. It starts with `vcp_`. It is generated in Vercel Dashboard → Account → Tokens, **from the personal account and not from a team** (see Part 9). It is passed to the command as an inline environment variable: `VERCEL_TOKEN="vcp_..." vercel deploy --prod` |

### 5.3 Environment variable security rules

1. **Never** commit `.env`, `.env.local` or their variants to Git (`.gitignore` excludes them on lines 31 to 36 and 77).
2. The `.env.example` file is versioned, so it **must not contain real values**; only comments and templates.
3. If a real value becomes exposed in the Git history (it happened with the seed passwords; see known error 15 in Part 10), **rotate the affected credentials** and consider rewriting the history if the repository is private.
4. The team keeps a local `.env` file with real tokens (for example, `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`). Treat it as a secret and do not share it over insecure channels.

---

## 6. Database

### 6.1 Database engine

The Prisma schema declares a single datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

In production, `DATABASE_URL` points to the **Neon.tech PostgreSQL** database. The schema declares multiplatform binary targets:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x", "debian-openssl-3.0.x"]
}
```

These targets guarantee that the generated Prisma client works in the Vercel environment (Linux with OpenSSL 3.0.x).

### 6.2 The Prisma schema

The `prisma/schema.prisma` file defines **21 models**. They are grouped as follows:

| Group | Models | Purpose |
|---|---|---|
| Users and sessions | `User`, `IpAttempt`, `Account`, `Session`, `VerificationToken` | Accounts, authentication, per-IP lockout and NextAuth sessions |
| Prompts | `Prompt` | The prompt itself (title, description, body, type, platform, status, language, favourite, shared, version, usage count, notes and other fields) |
| Prompt taxonomy | `Category`, `Tag`, `Platform`, `ClientProject`, `UseCase`, `ModelHint` | Classification entities with name, slug and sort order |
| N:M junction tables | `PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint` | Many-to-many relationships between `Prompt` and the taxonomy. **All use `onDelete: Cascade` on both foreign keys** |
| Administration catalogs | `Type`, `Status`, `Language` | Allowed type, status and language values managed by the administrator on the taxonomy pages. They are seeded (Part 6.6). Prompts keep their type, status and language as plain strings; the catalogs define the values offered by the form and the filters. Deleting a catalog value **never** touches existing prompts (simple unlinking) |

Highlights of the `User` model (security-related, all verified in the schema):

- `role` with the default value `"user"` (the administrator is assigned through the seed or user management).
- `isActive` with the default value `true`; inactive users cannot sign in.
- `failedLoginAttempts` and `lockoutUntil`: five failed attempts produce a fifteen-minute lockout.
- `tokenVersion`: when a password is changed or a user is deactivated, this number increases and **all previously issued JWTs become revoked**.
- `promptListViewPreference` (cards or table view) and `uiPreferences` (interface preferences in JSON).

The `IpAttempt` model records failed attempts per IP address, deliberately decoupled from any account so that a locked IP cannot be used to deliberately lock out other users' accounts.

### 6.3 The migration history is not in the repository

**Critical verified fact**: the `prisma/migrations/` directory **does not exist in the repository** and is excluded by `.gitignore` (line 41, comment "Prisma migrations (regenerable)"). The consequences are:

1. In a fresh clone **there are no migrations to apply**; they must be created.
2. There is no migration history visible in pull requests.
3. In production, the database already exists with its tables; the new migrations that a developer generates must be applied carefully (see Part 6.5).

### 6.4 Generating the Prisma client

The client is generated automatically with `postinstall` during `npm install`. To regenerate it manually at any time:

```bash
npm run db:generate
```

(Equivalent to `npm run prisma:generate`, defined as `prisma generate`.)

### 6.5 Creating and applying migrations

In a fresh clone, the target database already contains the tables, but the migration history does not exist locally. The available commands, all verified in `package.json`, are:

| Script | Equivalent command | Use |
|---|---|---|
| `npm run db:migrate` | `prisma migrate dev` | Creates a new migration from the schema changes and applies it. In a fresh clone with no history, this is the command that regenerates the initial migration |
| `npm run prisma:migrate` | `prisma migrate dev` | Identical to the previous one (alias) |
| `npm run db:push` | `prisma db push` | Syncs the schema with the database **without** creating migration files. Suitable for fast development, not for production |
| `npx prisma migrate deploy` | — | Applies pending migrations without creating new ones. It is the recommended option for production when a migration history exists |

**Recommended procedure in a fresh clone** (the concrete steps against production are pending verification; see the note at the end of this section):

```bash
# 1. Generate the client
npm run db:generate

# 2. Create and apply the initial migration (with a descriptive name)
npx prisma migrate dev --name init

# 3. Inspect the database with the visual explorer
npm run prisma:studio
```

> **Pending verification**: the exact migration procedure against the production database (for example, whether `prisma migrate deploy` is used inside the Vercel deployment or whether `prisma migrate dev` is run from a machine pointing at `DATABASE_URL_UNPOOLED`) is not documented in the repository. Before modifying the schema in production, document and test the chosen flow in a staging database.

### 6.6 Database seed

The script `prisma/seed.ts` is run with:

```bash
npm run db:seed
```

(Equivalent to `npm run prisma:seed`, defined as `tsx prisma/seed.ts`; the `prisma.seed` field of `package.json` also declares it.)

**Verified requirements**:

- You must define the variables `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` beforehand in the environment. If they are missing, the script throws an error and exits with code 1. There are no default values.

**What it does exactly (verified in `prisma/seed.ts`)**:

1. Creates or updates (via `upsert`) the administrator account with email `server@paginaviva.net`, name "Administrador" and role `admin`.
2. Creates or updates the user account with email `chamed@paginaviva.net`, name "Usuario" and role `user`.
3. Seeds the `Type` catalog with three values: System, User and Tool.
4. Seeds the `Status` catalog with three values: Draft, Tested and Production.
5. Seeds the `Language` catalog with twelve values: English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese, Chinese and Korean.
6. Prints a summary to the console and disconnects the Prisma client.

The script is **idempotent**: it can be run several times and the result does not change (it uses `upsert` by email for users and by slug for catalogs).

> **Verified security warning**: older versions of `prisma/seed.ts` contained real passwords hashed in the Git history. Since 6 August 2026 the script only reads the passwords from the environment variables, but **the old passwords are still visible in the history**. If the old seed was ever run, rotate the passwords of the affected accounts in production.

### 6.7 Historical data migration script

The repository includes `prisma/migrate-data.ts`, runnable with:

```bash
npm run db:migrate-data
```

(Defined as `tsx prisma/migrate-data.ts`.)

This script transforms the prompt string fields (`platform`, `useCase`, `clientOrProject`, `modelHint`) into many-to-many relationships (`PromptPlatform`, `PromptUseCase`, `PromptClientProject`, `PromptModelHint`). It is idempotent (uses `upsert`) and atomic (uses `$transaction`). It was used to migrate from the old schema to the current one; **it is not needed on fresh installations**.

### 6.8 Database explorer

Prisma Studio offers a visual interface to inspect and edit the data:

```bash
npm run prisma:studio
```

It opens in the browser (usually at <http://localhost:5555>). Use it carefully: any change is immediate and permanent.

### 6.9 Warnings about cascade deletes

All junction tables (`PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint`) use `onDelete: Cascade` on **both** foreign keys:

- Deleting a prompt automatically removes all its classification relationships.
- Deleting a tag (or category, platform or another similar entity) automatically removes the association of **all** prompts with that entity.

This operation **cannot be undone without a backup**. Before deleting taxonomy entities, export the prompts as JSON (the application offers JSON export) or make a backup of the Neon database.

---

## 7. Running in development

### 7.1 Development server

From the root of the repository:

```bash
npm run dev
```

This command runs `next dev` and starts the development server. The application becomes available at <http://localhost:3000>.

### 7.2 User registration and sign-in

- Public registration is available at `/auth/signup`.
- Sign-in is done at `/auth/signin`.
- The `/auth/error` route is declared as public in the middleware and in the NextAuth configuration, but **the page does not exist** in the repository (see known error 3 in Part 10).
- The administrator account is obtained through the seed (Part 6.6); public registration always creates users with the `user` role.

### 7.3 Route protection

The `middleware.ts` file protects the whole application except the public routes (`/auth/signin`, `/auth/signup`, `/auth/error`) and static assets:

- A visitor without a session who tries to access a protected route is redirected to `/auth/signin`.
- A signed-in user who visits a public route is redirected to the root `/`.
- The matcher also excludes `/api`, `/_next/static`, `/_next/image` and `favicon.ico`.

### 7.4 Linter

To check code style:

```bash
npm run lint
```

This command runs `next lint` (ESLint with the `next/core-web-vitals` configuration and `eslint-config-prettier`). The warning of the `react/no-unescaped-entities` rule is configured as a warning in this project (see known error 5 in Part 10).

### 7.5 Type checking

To check TypeScript types without emitting anything:

```bash
npx tsc --noEmit
```

> **Verified warning**: this command may show errors in pre-existing test files (for example, `tests/api/export.test.ts` or `tests/components/PromptFilters.test.tsx`). The Vercel build does not type-check test files, so those errors do not block deployment. Only errors in the files you modify are relevant.

### 7.6 Production build and run (local)

The production build is run with:

```bash
npm run build
```

And the resulting production server with:

```bash
npm start
```

> **Note**: the official project workflow does not maintain a local production environment; these commands serve to validate the build before deploying. The Vercel deployment itself runs its own build in the cloud.

---

## 8. Testing

### 8.1 Running the test suite

The project uses Jest. To run all the tests once:

```bash
npm test
```

This command runs `jest` with the `jest.config.js` configuration. To run them in watch mode (they re-run when files change):

```bash
npm run test:watch
```

### 8.2 Verified state of the test suite

According to the internal coverage report (`docs/informe-cobertura.md`, updated 6 August 2026):

- **388 tests in 40 suites** in the second measurement (314 tests in 33 suites in the first).
- Line coverage: **79.61%** (target met: at least 70%).
- The coverage threshold is set in `jest.config.js`: 75 lines, 60 functions, 72 statements and 60 branches. **If a measurement falls below these thresholds, the test suite fails**, so coverage cannot degrade unnoticed.

### 8.3 Measuring coverage

```bash
npm test -- --coverage
```

The detailed report is generated in the `coverage/` directory, which is excluded from version control.

### 8.4 Structure of the tests directory

| Directory | Contents |
|---|---|
| `tests/api/` | API endpoint tests (authentication, prompts, catalogs, export, import, users, preferences, shared) |
| `tests/components/` | Interface component tests with Testing Library (prompt form, filters, lists, profile, taxonomy, switches, tabs) |
| `tests/i18n/` | Internationalization tests (messages, locales, API errors, rendering) |
| `tests/unit/` | Unit tests of utilities (auth security, colours, UI preferences) |

### 8.5 Technical details of the tests (verified)

1. **next-intl is an ES-module-only package**: the Jest configuration (`jest.config.js`) overrides `transformIgnorePatterns` after `createJestConfig` so that SWC transforms `next-auth`, `@auth/core`, `@auth/prisma-adapter`, `next-intl`, `use-intl`, `intl-messageformat` and `@formatjs`. Without this override, Jest cannot import next-intl and every test using it fails.
2. **`getTranslations` from `next-intl/server` does not work in Jest**: it throws an exception (it is a stub that is not implemented for tests). The API tests must mock the `next-intl/server` module using the real catalogs from `messages/`.
3. **next-auth is mocked globally**: `jest.setup.js` mocks `next-auth`, `next-auth/providers/credentials` and `@auth/prisma-adapter`. If a test needs the real behaviour, it must redefine the mock within the test itself.
4. **The test environment is jsdom**: `jest-environment-jsdom` is configured in `jest.config.js`, which allows testing React components.

---

## 9. Production deployment

### 9.1 Deployment architecture

```
Workstation (main branch)
       ↓
  git push origin main
       ↓
  VERCEL_TOKEN + vercel deploy --prod
       ↓
  Build on Vercel (npm install → prisma generate → next build)
       ↓
  Production: Vercel alias (currently prompt-database-liard.vercel.app)
```

Key points, verified in `vercel.json` and in the internal guide `docs/guide/deployment.md`:

- **Automatic deployment from the `main` branch is deliberately disabled**. The property `git.deploymentEnabled.main: false` in `vercel.json` prevents it; deployments are made manually from `main`.
- The platform is Vercel (Hobby plan) and the database is Neon.tech PostgreSQL.
- The Vercel project keeps the name `prompt-database` (verified in the team's `.vercel/project.json`: `projectName: "prompt-database"`).

### 9.2 The vercel.json file

The `vercel.json` file at the root of the repository contains:

```json
{
  "experimentalServices": {
    "web": {
      "routePrefix": "/",
      "framework": "nextjs"
    }
  },
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  }
}
```

| Property | Function | Can it be changed? |
|---|---|---|
| `experimentalServices.web` | Internal Vercel configuration of the web service, generated automatically | No. Do not touch |
| `git.deploymentEnabled.main: false` | Disables automatic deployment from the `main` branch | Do not remove: the project uses manual deployment by design |

The file is **versioned** in Git (it is not in `.gitignore`). Do not put secrets in it; that is what the Dashboard environment variables are for.

### 9.3 Initial project configuration on Vercel

If the project is linked for the first time (or recreated from scratch), the steps are:

1. Go to <https://vercel.com/new>.
2. Import the repository `omagallanes/p-database`.
3. Recommended configuration (verified in the internal guide):
   - Framework: Next.js (auto-detected).
   - Root directory: `./` (the project root).
   - Build command: `npm run build` (the default).
   - Output directory: `.next` (the default).
   - Node.js version: 24.x (or the latest stable version).
4. Configure the environment variables (section 9.5).
5. Deploy.

If the project is already linked, there is no need to repeat these steps: just run `vercel link` on a fresh clone (section 9.4).

### 9.4 Local linking with Vercel

```bash
vercel link
```

This command creates the `.vercel/project.json` file with the `projectId` and `orgId` identifiers of the project. It asks which project to link: select `prompt-database`.

> **Warning**: the `.vercel/` directory is in `.gitignore` and is not pushed to the repository. Every person who deploys must run `vercel link` on their own clone.

### 9.5 Production environment variables

They are configured in **Vercel Dashboard → Project → Settings → Environment Variables** (Production environment). The required variables are:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Required |
| `DATABASE_URL_UNPOOLED` | Neon non-pooled connection string | Recommended for migrations |
| `AUTH_SECRET` | `openssl rand -base64 32` | Required. Generate a new value |
| `AUTH_URL` | `https://prompt-database-liard.vercel.app` (check the current alias) | Required |
| `SEED_ADMIN_PASSWORD` | Administrator password | Only if the seed is run in production |
| `SEED_USER_PASSWORD` | User password | Only if the seed is run in production |

Vercel injects `VERCEL`, `VERCEL_ENV` and `VERCEL_URL` automatically; do not define them manually. `VERCEL_OIDC_TOKEN` is generated when running `vercel link`.

### 9.6 Command-line interface authentication

**Critical verified rule**: the Vercel token must be created **from the personal account** and not from a team. The internal guide documents that Vercel CLI 56.x **does not accept the `--token` flag** with personal-scope tokens; the `VERCEL_TOKEN` environment variable must be used:

```bash
# Correct: environment variable
VERCEL_TOKEN="vcp_your_token" vercel whoami

# Incorrect: produces "token not valid"
vercel whoami --token "vcp_your_token"
```

Steps to create the token:

1. Go to Vercel Dashboard → Settings → Tokens (<https://vercel.com/account/tokens>).
2. Make sure you are in the context of the **personal account** (not inside a team).
3. Create a token with a descriptive name (for example, `prompt-database-cli`).
4. Copy the generated value (it starts with `vcp_`).
5. Store it in the team's local `.env` file (not versioned) or pass it inline in each command.

Verification:

```bash
VERCEL_TOKEN="vcp_your_token" vercel whoami
VERCEL_TOKEN="vcp_your_token" vercel project ls
```

### 9.7 Full deployment flow

1. **Local preparation**:

```bash
# Confirm the branch
git branch            # must show: * main

# Confirm the status
git status

# Run the test suite
npm test

# Check types (errors in pre-existing test files do not block)
npx tsc --noEmit
```

2. **Commit and push the changes**:

```bash
git add "app/(app)/prompts/page.tsx" tests/api/prompts.test.ts   # quote paths with parentheses
git commit -m "clear description of the change"
git push origin main
```

3. **Deploy to production**:

```bash
VERCEL_TOKEN="vcp_your_token" vercel deploy --prod
```

What this command does (verified in the internal guide):

- Reads `.vercel/project.json` to know the project and the team.
- Uploads the files of the current directory to Vercel.
- Runs the build in the cloud: `npm install` → `prisma generate` (via the `postinstall` script) → `next build`.
- If the build succeeds, publishes the deployment to production.
- Assigns the production alias (for example, `prompt-database-liard.vercel.app`).

Expected output (real example from the internal guide):

```
Production      https://prompt-database-47rqojbv6-omagallanes.vercel.app
Aliased         https://prompt-database-liard.vercel.app
✓ Ready in 1m
```

The URL with the unique identifier (`-47rqojbv6-`) corresponds to the concrete deployment; the aliased URL (`-liard.`) is the one that always points to production.

4. **One-command deployment** (after committing the changes):

```bash
npm test && git push origin main && VERCEL_TOKEN="vcp_your_token" vercel deploy --prod
```

### 9.8 Post-deployment verification

From the browser:

1. Open the production URL.
2. Check that the page loads and that sign-in works.
3. Test the deployed functionality.

From the command-line interface:

```bash
# Production deployments
VERCEL_TOKEN="vcp_your_token" vercel list --environment production

# Details of a concrete deployment
VERCEL_TOKEN="vcp_your_token" vercel inspect <url-or-id>

# Real-time logs
VERCEL_TOKEN="vcp_your_token" vercel logs <url>
```

### 9.9 Rollback

From the command-line interface:

```bash
# List previous deployments
VERCEL_TOKEN="vcp_your_token" vercel list --environment production

# Promote a previous deployment to production
VERCEL_TOKEN="vcp_your_token" vercel promote <deployment-id>
```

From the Vercel Dashboard: Project → Deployments → options button of the desired deployment → Promote to Production.

If the code also needs to be reverted:

```bash
git revert HEAD
git push origin main
VERCEL_TOKEN="vcp_your_token" vercel deploy --prod
```

### 9.10 Migrations and seed in production

**Pending verification**: the repository does not document the exact flow used to apply migrations and the seed against the production database. Safe options that can be followed:

1. Run migrations from a machine with the `DATABASE_URL_UNPOOLED` variable pointing at the Neon database and the command `npx prisma migrate deploy` (applies existing migrations without creating new ones).
2. If there is no migration history, `npx prisma migrate dev --name init` creates the initial migration; run it against a staging database first.
3. The production seed requires defining `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` in the execution environment and running `npm run db:seed`.

Before touching the schema in production: export the prompts (the application offers JSON export), make a backup in Neon and test the whole flow in a staging database.

---

## 10. Known errors and solutions

This section collects the errors and gotchas **verified** in the code, in the repository's internal documentation and in the deployment guide. Those that could not be fully confirmed are explicitly marked.

### 10.1 The `--token` flag of the Vercel CLI does not work

**Symptom**: `Error: The token provided via --token argument is not valid`.

**Cause**: the token was created from the personal account and Vercel CLI 56.x only accepts `--token` with team-scope tokens.

**Solution**: always use the environment variable:

```bash
VERCEL_TOKEN="vcp_your_token" vercel whoami
```

If the problem persists, generate a new token from Vercel Dashboard → Account → Tokens (personal account, not team).

### 10.2 "You do not have access to the specified account"

**Symptom**: the Vercel command responds with that error.

**Cause**: the `--scope` flag was used with the team ID instead of the readable name (slug), or the token has no access to the team.

**Solution**: do not use `--scope` or `--team` unless necessary. If needed, use the slug:

```bash
vercel --scope omagallanes
```

### 10.3 The `/auth/error` page does not exist

**Symptom**: authentication errors show the Next.js default error page instead of a dedicated page.

**Cause (verified)**: `lib/auth.ts` declares `pages.error: "/auth/error"` and `middleware.ts` treats it as a public route, but **there is no directory or page** under `app/(auth)/auth/error/`. It is a known issue documented in the project intelligence (high severity).

**Solution**: create the page `app/(auth)/auth/error/page.tsx` with `export const dynamic = "force-dynamic"` and a generic error message, or accept the default page in the meantime.

### 10.4 Pages using `auth()` fail during static pre-rendering

**Symptom**: build or runtime failures on pages that use `auth()`.

**Cause (verified)**: pages that call `auth()` need dynamic rendering. The affected pages (sign-in and sign-up pages, profile, prompt lists, prompt form and detail) already declare `export const dynamic = "force-dynamic"`.

**Solution**: any new page that uses `auth()` must add `export const dynamic = "force-dynamic"`. The root `app/layout.tsx` also declares it.

### 10.5 ESLint `react/no-unescaped-entities` breaks the build

**Symptom**: the build fails because of unescaped apostrophes or quotes in JSX.

**Cause**: the ESLint rule `react/no-unescaped-entities`.

**Solution (verified)**: in this project the rule is configured as a warning, so it does not break the build. If you see it in new files, write them with `&apos;` or `{"'"}`.

### 10.6 "Prisma Client not found" (Prisma client not generated)

**Symptom**: endpoints or scripts fail with Prisma client errors.

**Cause**: `prisma generate` did not run after installation.

**Solution (verified)**: the `postinstall` script of `package.json` (`prisma generate`) must run automatically with `npm install`. If it did not, run `npm run db:generate`. Do not remove the `postinstall` script.

### 10.7 There is no migration history in the repository

**Symptom**: `prisma migrate` finds no migrations on a fresh clone.

**Cause (verified)**: `/prisma/migrations/` is in `.gitignore` (line 41). Migrations are regenerable and are not versioned.

**Solution**: run `npx prisma migrate dev --name init` (or the flow chosen for production; see Part 6.5).

### 10.8 Prisma failures because of the environment's OpenSSL version

**Symptom**: the Prisma client cannot connect on the deployment environment.

**Cause**: the schema declares specific `binaryTargets` (`native`, `linux-musl-openssl-3.0.x`, `linux-musl-arm64-openssl-3.0.x`, `debian-openssl-3.0.x`). If the platform uses another OpenSSL version, Prisma fails.

**Solution**: verify the OpenSSL version of the target platform and adjust `binaryTargets` in `prisma/schema.prisma`, followed by `npm run db:generate`.

### 10.9 Jest does not transform next-intl (ES modules)

**Symptom**: tests fail when importing next-intl with ES module syntax errors.

**Cause (verified)**: `next/jest` prepends `/node_modules/` to `transformIgnorePatterns`; adding patterns to the custom configuration is not enough.

**Solution (already applied in the project)**: override `transformIgnorePatterns` after `createJestConfig` in `jest.config.js` with the list `(next-auth|@auth/core|@auth/prisma-adapter|next-intl|use-intl|intl-messageformat|@formatjs)`. Do not revert that override.

### 10.10 `getTranslations` from `next-intl/server` throws in Jest

**Symptom**: API tests fail with the exception of the `getTranslations` stub.

**Cause (verified)**: the function is not implemented for the test environment.

**Solution**: mock the `next-intl/server` module in the API tests, loading the real catalogs from `messages/` (this is what the existing tests do).

### 10.11 "Route /api/export/prompts couldn't be rendered statically"

**Symptom**: a message like this appears during the build.

**Cause (verified)**: the export route uses Next.js `headers()`, which prevents static generation.

**Impact**: none. It is a warning, not an error. The deployment completes and the route works as a dynamic route.

### 10.12 Error 500 after deployment

**Symptom**: the application responds with 500 errors after a deployment.

**Likely cause**: environment variables misconfigured in the Vercel Dashboard (for example, `DATABASE_URL` missing or with an incorrect value, or `AUTH_SECRET` missing or with the example value).

**Solution**:

```bash
VERCEL_TOKEN="vcp_your_token" vercel logs <url>
```

and check Vercel → Project → Settings → Environment Variables.

### 10.13 Paths with parentheses in Git commands

**Symptom**: `git add app/(app)/prompts/page.tsx` fails or adds the wrong files.

**Cause**: the shell interprets the parentheses as shell syntax.

**Solution (verified)**: always use quotes:

```bash
git add "app/(app)/prompts/page.tsx"
```

### 10.14 TypeScript errors in pre-existing test files

**Symptom**: `npx tsc --noEmit` shows errors in tests that were not touched.

**Cause (verified)**: there are pre-existing type errors in some test files.

**Solution**: the Vercel build (Next.js) does not type-check test files, so these errors **do not block deployment**. Only errors in the files you modify are relevant.

### 10.15 Old passwords visible in the Git history

**Symptom**: the Git history contains versions of `prisma/seed.ts` with hashed passwords.

**Cause (verified)**: older versions of the seed included real passwords. Since 6 August 2026 the seed only reads `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`.

**Solution**: rotate the real passwords of the accounts in production if the old seed was ever run. Do not reintroduce credentials in the code.

### 10.16 Irreversible cascade deletes

**Symptom**: when deleting a tag or a prompt, relationships that were expected to be kept disappear.

**Cause (verified)**: the six junction tables use `onDelete: Cascade` on both foreign keys.

**Solution**: before deleting, export the prompts as JSON or make a backup. The operation is irreversible without a backup.

### 10.17 References to non-existent files in the README

**Symptom**: the `README.md` links to `docs/index.md`, `DOCKER.md` and `DEPLOYMENT.md` lead nowhere.

**Cause (verified)**: the `README.md` retains content from the original fork and has not been fully updated.

**Solution**: treat the `README.md` as legacy documentation. This manual and `docs/reference/` are the reliable sources. Updating the `README.md` is pending.

### 10.18 Seed variables not documented in `.env.example`

**Symptom**: `npm run db:seed` fails with the missing-variables message.

**Cause (verified)**: the script requires `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`, which do not appear in `.env.example`.

**Solution**: define both variables in the environment from which the seed is run. **Pending verification**: add their documentation to `.env.example`.

### 10.19 Pending item: migration procedure in production

**Pending verification**: it has not been documented how Prisma migrations are applied against the Neon database in the current deployment flow (see Part 9.10). Document the chosen procedure before modifying the schema.

### 10.20 Pending item: workstation environment data

**Pending verification**: the team's `.env` file contains real tokens of external services (for example, Vercel and Cloudflare). If you receive a copy of the work environment, confirm with the person in charge which tokens are valid and which must be regenerated; none of those values should be published.

---

## 11. Quick reference guide

### 11.1 Installation

| Task | Command |
|---|---|
| Clone the repository | `git clone https://github.com/omagallanes/p-database.git` |
| Install dependencies (with automatic Prisma generation) | `npm install` |
| Reproducible installation | `npm ci` |
| Generate the Prisma client | `npm run db:generate` |
| Check Node.js version | `node --version` |
| Check npm version | `npm --version` |

### 11.2 Development

| Task | Command |
|---|---|
| Development server | `npm run dev` |
| Linter | `npm run lint` |
| Type checking | `npx tsc --noEmit` |
| Production build | `npm run build` |
| Local production server | `npm start` |

### 11.3 Database

| Task | Command |
|---|---|
| Generate the Prisma client | `npm run db:generate` (or `npm run prisma:generate`) |
| Create and apply migrations | `npm run db:migrate` (or `npx prisma migrate dev`) |
| Sync the schema without migrations | `npm run db:push` |
| Apply existing migrations | `npx prisma migrate deploy` |
| Seed the database (requires `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`) | `npm run db:seed` |
| Migrate data from legacy fields to N:M relations | `npm run db:migrate-data` |
| Visual database explorer | `npm run prisma:studio` |

### 11.4 Testing

| Task | Command |
|---|---|
| Run the test suite | `npm test` |
| Watch mode | `npm run test:watch` |
| Measure coverage | `npm test -- --coverage` |

### 11.5 Deployment

| Task | Command |
|---|---|
| Link the clone with Vercel | `vercel link` |
| Verify the token | `VERCEL_TOKEN="vcp_your_token" vercel whoami` |
| Deploy to production | `VERCEL_TOKEN="vcp_your_token" vercel deploy --prod` |
| Preview deployment | `VERCEL_TOKEN="vcp_your_token" vercel deploy` |
| List production deployments | `VERCEL_TOKEN="vcp_your_token" vercel list --environment production` |
| Details of a deployment | `VERCEL_TOKEN="vcp_your_token" vercel inspect <url>` |
| Real-time logs | `VERCEL_TOKEN="vcp_your_token" vercel logs <url>` |
| Roll back to a previous deployment | `VERCEL_TOKEN="vcp_your_token" vercel promote <id>` |
| Download Vercel variables to a local file | `VERCEL_TOKEN="vcp_your_token" vercel env pull .env.production` |
| Add a variable from the command line | `vercel env add DATABASE_URL production` |

### 11.6 Complete workflow (single pass)

```bash
npm test && \
git push origin main && \
VERCEL_TOKEN="vcp_your_token" vercel deploy --prod
```

---

## Appendix A. Application routes and API endpoints

### A.1 Main pages

| Route | Purpose |
|---|---|
| `/` | Main page (redirects to the prompts) |
| `/prompts` | List of your own prompts with search and filters |
| `/prompts/new` | Create a prompt |
| `/prompts/[id]` | Prompt detail and editing |
| `/categories` and `/tags` | Category and tag pages |
| `/taxonomy` and its subroutes (`/type`, `/status`, `/language`, `/platforms`, `/use-cases`, `/client-projects`, `/model-hints`) | Catalog management (administrators only) |
| `/shared` and `/shared/[id]` | Prompts shared by other users and their read-only detail |
| `/auth/profile` | User profile (account, dashboard and users tabs) |
| `/auth/signin`, `/auth/signup`, `/auth/error` | Authentication (the error page does not exist; see error 10.3) |

### A.2 API endpoints

| Route | Methods | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth session management |
| `/api/auth/register` | POST | Public user registration |
| `/api/prompts` | GET, POST | Listing (with filters) and creation (requires a session) |
| `/api/prompts/[id]` | GET, PUT, DELETE | Detail, update and deletion. The detail allows the owner or the author of a shared prompt; editing and deletion require ownership |
| `/api/prompts/[id]/usage` | PATCH | Usage tracking (counter and date) |
| `/api/categories` and `/api/categories/[id]` | GET, POST / PUT, DELETE | Categories |
| `/api/tags` and `/api/tags/[id]` | GET, POST / PUT, DELETE | Tags |
| `/api/platforms` and `/api/platforms/[id]` | GET, POST / PUT, DELETE | Platforms |
| `/api/use-cases` and `/api/use-cases/[id]` | GET, POST / PUT, DELETE | Use cases |
| `/api/client-projects` and `/api/client-projects/[id]` | GET, POST / PUT, DELETE | Clients or projects |
| `/api/model-hints` and `/api/model-hints/[id]` | GET, POST / PUT, DELETE | Suggested models |
| `/api/types`, `/api/statuses`, `/api/languages` (and their `/[id]` routes) | GET, POST / PUT, DELETE | Type, status and language catalogs |
| `/api/users` and `/api/users/[id]` | GET, PUT / DELETE | User management (administrators only) |
| `/api/user/profile` | GET, PATCH | Profile of the signed-in user |
| `/api/user/password` | PATCH | Password change (increments `tokenVersion` and revokes previous sessions) |
| `/api/user/preferences` | GET, PATCH | Interface preferences |
| `/api/export/prompts` | GET | Export of your own prompts as JSON |
| `/api/import/prompts` | POST | Import of prompts from JSON (versions 2.0 and 1.0) |
| `/api/shared/prompts` | GET | Prompts shared by other users |

---

## Appendix B. Data models of Prisma

Summary of the 21 models of `prisma/schema.prisma` with their main fields:

| Model | Main fields |
|---|---|
| `User` | `id` (cuid), `name`, `email` (unique), `emailVerified`, `image`, `password`, `role` (default "user"), `isActive` (default true), `language`, `promptListViewPreference` (default "cards"), `uiPreferences` (JSON), `failedLoginAttempts`, `lockoutUntil`, `tokenVersion`, creation and update timestamps |
| `IpAttempt` | `ip` (unique), `failedAttempts`, `lockoutUntil`, timestamps. Index on `lockoutUntil` |
| `Account` | `userId`, `type`, `provider`, `providerAccountId`, OAuth tokens. Unique per `provider` and `providerAccountId`; cascades with the user |
| `Session` | `sessionToken` (unique), `userId`, `expires`. Cascades with the user |
| `VerificationToken` | `identifier`, `token` (unique), `expires`. Unique per `identifier` and `token` |
| `Prompt` | `title`, `description`, `body`, `type` (default "USER"), `platform` (default "CURSOR"), `modelHint`, `language` (default "es"), `useCase`, `clientOrProject`, `status` (default "DRAFT"), `isFavorite`, `isShared`, `version`, `changelog`, `notes`, `prePrompt` (long text), `manualDeUso` (long text), `usageCount`, `lastUsedAt`, `userId` (optional). Indexes on `status`, `platform`, `isFavorite`, `isShared`, `language` and `userId` |
| `Category` | `name` (unique), `slug` (unique), `parentId` (hierarchy), `sortOrder`. Indexes on `parentId` and `slug` |
| `Tag` | `name` (unique), `slug` (unique). Index on `slug` |
| `Platform` | `name` (unique), `slug` (unique), `sortOrder`. Index on `slug` |
| `ClientProject` | `name` (unique), `slug` (unique), `sortOrder`. Index on `slug` |
| `UseCase` | `name` (unique), `slug` (unique), `sortOrder`. Index on `slug` |
| `ModelHint` | `name` (unique), `slug` (unique), `sortOrder`. Index on `slug` |
| `PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint` | Composite keys (`promptId` + entity id), cascade deletes on both keys |
| `Type`, `Status`, `Language` | Catalogs: `name` (unique), `slug` (unique), `sortOrder`. Index on `slug` |

---

## Final verification note

This manual was written on 7 August 2026 by reading the real files of the repository: `package.json`, `prisma/schema.prisma`, `next.config.js`, `vercel.json`, `.env.example`, `README.md`, `middleware.ts`, `lib/auth.ts`, `lib/prisma.ts`, `prisma/seed.ts`, `jest.config.js`, `jest.setup.js`, `i18n/locales.ts`, `i18n/request.ts`, `docs/informe-cobertura.md`, `docs/reference/api-endpoints.md`, `docs/guide/deployment.md` and the project intelligence in `.opencode/context/`. The data pending verification are explicitly indicated in their context (mainly: the migration flow in production, the documentation of `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` in `.env.example`, and the current production URL).
