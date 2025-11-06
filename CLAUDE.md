# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Planner is a VSCode/VSCodium extension that visualizes markdown checklist files matching `PLAN*.md` in a sidebar panel. It parses task states (`[ ]`, `[x]`, `[-]`, `[!]`) and displays them hierarchically based on markdown headings.

## Build & Development Commands

### Development
```bash
npm install              # Install dependencies
npm run compile          # Build with sourcemaps
npm run watch            # Watch mode for development
npm run lint             # Run ESLint
```

### Packaging
```bash
npm run package          # Build .vsix (uses TZ=UTC - see critical note below)
```

**CRITICAL:** Always package with `TZ=UTC` to avoid timezone-related installation failures on VSCodium-based IDEs. The package script is already configured correctly. See `docs/VSIX_BUILD_CONVENTION.md` for details.

### Testing Extension
1. Press F5 in VSCode to launch Extension Development Host
2. Open a workspace containing `PLAN*.md` files
3. Check the "Task Planner" sidebar panel
4. View output in "Task Planner" output channel for debugging

## Architecture

### Core Components

**Extension Entry (`src/extension.ts`)**
- Activates on `onStartupFinished`
- Registers `PlanMonitorProvider` as webview view provider
- Sets up `FileSystemWatcher` for `**/PLAN*.md` pattern
- Creates output channel for logging

**Webview Provider (`src/planMonitorProvider.ts`)**
- Implements `vscode.WebviewViewProvider` interface
- Manages webview lifecycle (initialization, disposal, message handling)
- Coordinates file discovery, parsing, and caching
- Handles bidirectional communication with webview (extension ↔ webview)
- Key methods:
  - `resolveWebviewView()`: Called when view is shown
  - `refreshView()`: Triggered by file watcher events
  - Message handlers for navigation and file selection

**Plan Parser (`src/planParser.ts`)**
- Uses `markdown-it` with `markdown-it-task-lists` plugin
- Parses markdown tokens to extract headings (H2+) and task items
- Builds hierarchical structure from flat token stream
- Supports 4 task states:
  - `[ ]` → Pending
  - `[x]` → Done
  - `[-]` → In Progress (custom)
  - `[!]` → Blocked (custom)
- Filters headings that don't contain tasks
- Calculates aggregated status for parent headings
- Key functions:
  - `parsePlan()`: Main entry point
  - `buildHierarchy()`: Converts flat items to tree
  - `markTaskDescendants()`: Identifies branches with tasks
  - `filterTaskBranches()`: Removes empty headings
  - `calculateAggregatedStatus()`: Computes parent status

**File Discovery (`src/fileDiscovery.ts`)**
- Finds all `PLAN*.md` files in workspace
- Excludes `node_modules`
- Sorts files alphabetically by filename

**Cache (`src/planCache.ts`)**
- Implements mtime-based caching to avoid redundant parsing
- Invalidates cache when files change
- Keyed by file path

**Type Definitions (`src/types.ts`)**
- Defines all interfaces and enums used across the extension
- Key types: `HierarchyItem`, `ParsedPlan`, `TaskState`, `MessageType`

**Webview (`webview/main.js` & `webview/style.css`)**
- Vanilla JavaScript (no framework)
- Renders hierarchical task tree
- Handles user interactions (click to navigate, file selection)
- Uses VSCode theme variables for styling
- Implements collapsible sections

### Communication Flow

1. **File Changes** → FileSystemWatcher → `refreshView()`
2. **File Discovery** → `findPlanFiles()` → URI list
3. **File Loading** → Cache check → `parsePlan()` → `ParsedPlan`
4. **Send to Webview** → `postMessage(UpdatePlan)` → Render UI
5. **User Click** → `postMessage(NavigateToLine)` → Open file at line

### Data Flow

```
PLAN*.md files
    ↓
FileSystemWatcher detects changes
    ↓
PlanCache (mtime-based)
    ↓
PlanParser (markdown-it tokenization)
    ↓
HierarchyItem tree
    ↓
Webview (message passing)
    ↓
User interactions → Navigation
```

## Key Design Patterns

### Hierarchical Task Structure
- Markdown headings (H2+) create hierarchy levels
- Tasks nest under their closest preceding heading
- Tasks can have subtasks (nested bullet lists)
- Headings without tasks are filtered out
- Aggregated status bubbles up from child tasks

### Parser Token Processing
- Standard checkboxes (`[ ]`, `[x]`) are processed by `markdown-it-task-lists` plugin
- Custom checkboxes (`[-]`, `[!]`) are detected via regex on token content
- Line numbers are preserved from token maps for navigation

### Caching Strategy
- Parse results are cached with file's mtime (modification time)
- On cache hit, skip parsing entirely
- On cache miss, parse and update cache
- File watcher invalidates cache on changes

### Webview Security
- Content Security Policy (CSP) with nonces
- Only specific resources allowed (scripts, styles, fonts)
- Message-based communication (no direct DOM access from extension)

## Important Conventions

### File Naming
- Plan files must match `PLAN*.md` pattern
- Examples: `PLAN.md`, `PLAN-feature.md`, `PLAN_tasks.md`

### Task States in Markdown
```markdown
- [ ] Pending task
- [x] Completed task
- [-] In-progress task
- [!] Blocked task
```

### Output Channel Logging
- Extension uses "Plan Monitor" output channel extensively
- Check output channel for debugging initialization and parsing issues
- Logs include step-by-step activation process

### Packaging Requirements
- MUST use `TZ=UTC` when running `vsce package`
- This prevents timezone-related issues in VSCodium-based editors
- Already configured in package.json scripts

## Common Modifications

### Adding New Task State
1. Add enum value to `TaskState` in `types.ts`
2. Update regex/detection logic in `planParser.ts` (around line 116-123)
3. Add icon/styling in `webview/style.css`
4. Update state counting logic (around line 196-201)

### Changing File Pattern
1. Update pattern in `extension.ts` FileSystemWatcher (line 48)
2. Update pattern in `fileDiscovery.ts` findFiles (line 22)
3. Update README.md documentation

### Modifying Webview UI
- Edit `webview/main.js` for behavior
- Edit `webview/style.css` for styling
- Use VSCode CSS variables for theming (e.g., `--vscode-foreground`)
- Restart extension host to see changes (F5)

## Troubleshooting

### Extension Not Activating
- Check "Plan Monitor" output channel
- Verify `activationEvents` in package.json
- Ensure workspace has at least one folder open

### Tasks Not Parsing
- Check console logs in `planParser.ts`
- Verify markdown syntax matches expected patterns
- Look for token structure in parser output

### Webview Not Loading
- Check CSP errors in Developer Tools
- Verify resource URIs are correct
- Ensure nonces are properly generated

### VSIX Installation Fails
- Verify packaging was done with `TZ=UTC`
- Check timestamps in VSIX: `unzip -l plan-monitor-X.X.X.vsix`
- See `docs/VSIX_BUILD_CONVENTION.md`
