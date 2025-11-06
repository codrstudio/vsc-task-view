# Change Log

All notable changes to the "plan-monitor" extension will be documented in this file.

## [0.5.1] - 2025-11-05

### Fixed
- **CRITICAL FIX**: Added missing `"type": "webview"` field in package.json view definition
- Without this field, VSCode doesn't recognize the view as a webview and never calls resolveWebviewView()
- This was the actual root cause of "There is no data provider registered" error
- The provider was registering correctly but VSCode wasn't associating it with the view

### Technical Details
- Changed view definition in package.json from `{ "id": "...", "name": "..." }` to `{ "type": "webview", "id": "...", "name": "..." }`
- This is a mandatory field for views using WebviewViewProvider
- Without it, VSCode treats the view as a static placeholder

## [0.5.0] - 2025-11-05

### Fixed
- **CRITICAL - FINAL FIX**: Resolved "There is no data provider registered" error PERMANENTLY
- Root cause: Race condition between view opening and provider registration
- Solution: Changed from `onView` to `onStartupFinished` activation event
- Provider now guaranteed to be registered before any user interaction

### Changed
- **BREAKING**: Activation event changed from `onView:planMonitorView` to `onStartupFinished`
- Extension now activates automatically after VSCode startup (2-3 seconds)
- Output channel now shows automatically on activation for better debugging
- Enhanced activation logging with clear step-by-step progress indicators
- Added visual separators in logs for easier reading

### Added
- Comprehensive diagnostic logging with ═══ markers
- Auto-display of Output panel on activation (can be disabled by closing)
- DIAGNOSTIC-REPORT.md documenting the root cause and solution
- Validation of provider registration before activation completes

### Technical Details
- Follows VSCode 1.74.0+ best practices (onView no longer needed)
- Uses `onStartupFinished` for deterministic activation timing
- Eliminates all race conditions through early registration
- Based on Microsoft's official extension samples

## [0.4.0] - 2025-11-05

### Fixed
- **CRITICAL**: Fixed "There is no data provider registered" error
- Proper lifecycle management following VSCode best practices
- Initialization now happens AFTER webview HTML is set
- Fixed async constructor issue (moved to _initialize method)
- Added comprehensive error handling and logging

### Changed
- Complete rewrite of provider following Microsoft's official patterns
- Added extensive logging with [PlanMonitor] prefix for debugging
- Provider now uses private members with underscore prefix
- Added loading and empty states for better UX
- Improved disposal and cleanup handling

### Added
- Detailed logging at every step for troubleshooting
- Loading state messages
- Empty state when no files found
- Proper error recovery mechanisms

## [0.3.0] - 2025-11-05

### Fixed
- **CRITICAL**: Fixed "Cannot find module 'markdown-it'" error
- Switched from TypeScript compilation to esbuild bundling
- All dependencies now properly included in extension package
- Extension now works correctly when installed from .vsix

### Changed
- Build system changed from tsc to esbuild for proper dependency bundling
- Main entry point moved from dist/ to out/

## [0.2.0] - 2025-11-05

### Changed
- **BREAKING**: Moved from Explorer view to dedicated Activity Bar icon
- Extension now appears as its own panel in the sidebar with checklist icon
- View renamed to "Tasks" for clarity

## [0.1.0] - 2025-11-05

### Added
- Initial release
- Sidebar panel for PLAN*.md file visualization
- Support for four checkbox states: [ ], [x], [-], [!]
- Hierarchical task structure based on markdown headings
- Click-to-navigate to source file lines
- Auto-refresh on file changes via FileSystemWatcher
- Mtime-based caching for performance
- Works on both VSCode and VSCodium
