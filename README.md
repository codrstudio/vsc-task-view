# Task Planner - VSCode Extension

A VSCode/VSCodium extension that provides a sidebar panel to visualize and monitor Markdown checklist files matching the pattern `PLAN*.md` in your workspace.

## Features

- **Sidebar Panel**: Dedicated view in the Explorer activity bar
- **File Discovery**: Automatically finds all `PLAN*.md` files in your workspace
- **Task Visualization**: Hierarchical tree structure based on markdown headings
- **Four Task States**:
  - `[ ]` → 📝 Pending (gray)
  - `[x]` → ✅ Done (green)
  - `[-]` → 🔄 In Progress (blue)
  - `[!]` → ⚠️ Blocked (red)
- **Click-to-Navigate**: Click any task to jump to the exact line in the source file
- **Auto-Refresh**: Automatically updates when files change
- **Performance**: Efficient mtime-based caching prevents unnecessary parsing

## Installation

### From .vsix File

1. Download the `.vsix` file from releases
2. Open VSCode/VSCodium
3. Go to Extensions panel (Ctrl+Shift+X)
4. Click the "..." menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

### From Source

```bash
cd src/vsc-task-view
npm install
npm run package
```

Then install the generated `.vsix` file using the steps above.

## Usage

1. **Open a workspace** containing `PLAN*.md` files
2. **Look for "Task Planner"** in the Explorer sidebar
3. **Select a file** from the dropdown if you have multiple PLAN files
4. **View tasks** in a hierarchical structure
5. **Click any task** to navigate to its line in the source file

## Supported Checkbox States

The extension recognizes four checkbox states in your markdown files:

- `[ ]` - Pending task
- `[x]` or `[X]` - Completed task
- `[-]` - In-progress task
- `[!]` - Blocked task

## File Detection

The extension automatically detects files matching these patterns:
- `PLAN.md`
- `PLAN-anything.md`
- `PLAN_anything.md`
- Any file starting with `PLAN` and ending with `.md`

## Requirements

- VSCode version 1.75.0 or higher
- VSCodium (compatible)

## Extension Settings

This extension contributes no settings. It works out of the box.

## Known Issues

- None at this time

## Release Notes

### 0.1.0

Initial release:
- Sidebar panel with task visualization
- Support for all four checkbox states
- Click-to-navigate functionality
- Auto-refresh on file changes
- Mtime-based caching

## Contributing

This extension is part of the codr.studio platform project.

## License

See LICENSE file in the project root.
