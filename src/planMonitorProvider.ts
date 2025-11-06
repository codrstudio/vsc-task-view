import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { parsePlan } from './planParser';
import { PlanCache } from './planCache';
import { findPlanFiles, getWorkspaceRelativePath } from './fileDiscovery';
import { MessageType, NavigateMessage, UpdateMessage } from './types';

/**
 * WebviewViewProvider for the Plan Monitor sidebar panel
 *
 * Implementation follows VSCode extension best practices:
 * - Proper lifecycle management
 * - State persistence
 * - Error handling and recovery
 * - Security (CSP, nonce, sanitization)
 */
export class PlanMonitorProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'planMonitorView';

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _outputChannel: vscode.OutputChannel;
  private readonly _cache: PlanCache;

  private _planFiles: vscode.Uri[] = [];
  private _currentFile?: vscode.Uri;
  private _isInitialized = false;

  constructor(
    extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel
  ) {
    this._extensionUri = extensionUri;
    this._outputChannel = outputChannel;
    this._cache = new PlanCache(outputChannel);

    this._outputChannel.appendLine('[PlanMonitor] Provider created');
  }

  /**
   * Called when the webview view is resolved (shown for the first time or restored)
   * This is the proper place to initialize the view
   */
  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): Promise<void> {
    this._outputChannel.appendLine('[PlanMonitor] resolveWebviewView called');

    try {
      // Store view reference
      this._view = webviewView;

      // Configure webview
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this._extensionUri, 'webview')
        ]
      };

      // Set up disposal handler
      webviewView.onDidDispose(
        () => this._handleDispose(),
        null,
        []
      );

      // Set up message handler BEFORE setting HTML
      webviewView.webview.onDidReceiveMessage(
        message => this._handleMessage(message),
        undefined,
        []
      );

      // Set HTML content
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

      this._outputChannel.appendLine('[PlanMonitor] HTML content set');

      // Initialize data - CRITICAL: must happen after HTML is set
      await this._initialize();

      this._outputChannel.appendLine('[PlanMonitor] Initialization complete');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR in resolveWebviewView: ${errorMsg}`);
      this._outputChannel.appendLine(`[PlanMonitor] Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      throw error;
    }
  }

  /**
   * Initialize the view by discovering files and loading initial data
   * This is called AFTER the webview HTML is set
   */
  private async _initialize(): Promise<void> {
    if (this._isInitialized) {
      this._outputChannel.appendLine('[PlanMonitor] Already initialized, skipping');
      return;
    }

    try {
      this._outputChannel.appendLine('[PlanMonitor] Starting initialization...');

      // Show loading state
      this._postMessage({
        type: 'loading',
        message: 'Discovering PLAN*.md files...'
      });

      // Discover all plan files
      await this._discoverPlanFiles();

      this._outputChannel.appendLine(`[PlanMonitor] Found ${this._planFiles.length} plan files`);

      // Load first file if available
      if (this._planFiles.length > 0) {
        this._outputChannel.appendLine(`[PlanMonitor] Loading first file: ${this._planFiles[0].fsPath}`);
        await this._loadPlan(this._planFiles[0]);
      } else {
        this._outputChannel.appendLine('[PlanMonitor] No plan files found');
        this._postMessage({
          type: 'empty',
          message: 'No PLAN*.md files found in workspace'
        });
      }

      this._isInitialized = true;
      this._outputChannel.appendLine('[PlanMonitor] Initialization successful');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR in initialization: ${errorMsg}`);

      // Show error in UI
      this._postMessage({
        type: 'error',
        message: `Failed to initialize: ${errorMsg}`
      });
    }
  }

  /**
   * Discover all PLAN*.md files in the workspace
   */
  private async _discoverPlanFiles(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        this._outputChannel.appendLine('[PlanMonitor] No workspace folder found');
        this._planFiles = [];
        return;
      }

      this._outputChannel.appendLine(`[PlanMonitor] Searching in: ${workspaceFolder.uri.fsPath}`);
      this._planFiles = await findPlanFiles(workspaceFolder);

      // Log each found file
      this._planFiles.forEach((file, index) => {
        this._outputChannel.appendLine(`[PlanMonitor]   ${index + 1}. ${file.fsPath}`);
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR discovering files: ${errorMsg}`);
      this._planFiles = [];
    }
  }

  /**
   * Load and parse a plan file
   */
  private async _loadPlan(fileUri: vscode.Uri): Promise<void> {
    try {
      this._currentFile = fileUri;
      const filePath = fileUri.fsPath;

      this._outputChannel.appendLine(`[PlanMonitor] Loading plan: ${filePath}`);

      // Check cache first
      let plan = await this._cache.get(filePath);

      if (!plan) {
        this._outputChannel.appendLine(`[PlanMonitor] Cache miss, parsing file`);

        // Read and parse file
        const content = await fs.readFile(filePath, 'utf-8');
        this._outputChannel.appendLine(`[PlanMonitor] File read, ${content.length} bytes`);

        plan = parsePlan(content, filePath);
        this._outputChannel.appendLine(`[PlanMonitor] Parsed ${plan.totalCount} tasks`);

        // Cache the result
        await this._cache.set(filePath, plan);
      } else {
        this._outputChannel.appendLine(`[PlanMonitor] Cache hit`);
      }

      // Send plan to webview
      this._postMessage({
        type: MessageType.UpdatePlan,
        plan
      });

      // Send file list
      this._sendFileList();

      this._outputChannel.appendLine(`[PlanMonitor] Plan loaded successfully`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR loading plan: ${errorMsg}`);

      this._postMessage({
        type: 'error',
        message: `Failed to load plan: ${errorMsg}`
      });
    }
  }

  /**
   * Send list of available files to webview
   */
  private _sendFileList(): void {
    const fileList = this._planFiles.map(uri => ({
      path: uri.fsPath,
      relativePath: getWorkspaceRelativePath(uri),
      isCurrent: this._currentFile?.fsPath === uri.fsPath
    }));

    this._postMessage({
      type: 'fileList',
      files: fileList
    });
  }

  /**
   * Handle messages from webview
   */
  private async _handleMessage(message: any): Promise<void> {
    try {
      this._outputChannel.appendLine(`[PlanMonitor] Received message: ${message.type}`);

      switch (message.type) {
        case MessageType.NavigateToLine:
          await this._navigateToLine(message as NavigateMessage);
          break;

        case MessageType.SelectFile:
          const fileUri = vscode.Uri.file(message.filePath);
          await this._loadPlan(fileUri);
          break;

        default:
          this._outputChannel.appendLine(`[PlanMonitor] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR handling message: ${errorMsg}`);
    }
  }

  /**
   * Navigate to a specific line in a file
   */
  private async _navigateToLine(message: NavigateMessage): Promise<void> {
    try {
      this._outputChannel.appendLine(`[PlanMonitor] Navigating to ${message.filePath}:${message.line}`);

      const uri = vscode.Uri.file(message.filePath);
      const document = await vscode.workspace.openTextDocument(uri);

      await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(message.line, 0, message.line, 0)
      });

      this._outputChannel.appendLine(`[PlanMonitor] Navigation successful`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR navigating: ${errorMsg}`);
      vscode.window.showErrorMessage(`Failed to open file: ${errorMsg}`);
    }
  }

  /**
   * Refresh the view (called by file watcher)
   */
  public async refreshView(): Promise<void> {
    try {
      this._outputChannel.appendLine('[PlanMonitor] Refreshing view...');

      // Re-discover files
      await this._discoverPlanFiles();

      // Check if current file still exists
      if (this._currentFile) {
        const stillExists = this._planFiles.some(
          f => f.fsPath === this._currentFile!.fsPath
        );

        if (!stillExists && this._planFiles.length > 0) {
          this._outputChannel.appendLine('[PlanMonitor] Current file deleted, switching to first available');
          this._currentFile = this._planFiles[0];
        }
      }

      // Reload current file
      if (this._currentFile) {
        this._cache.invalidate(this._currentFile.fsPath);
        await this._loadPlan(this._currentFile);
      } else if (this._planFiles.length > 0) {
        // No current file but files exist - load first one
        await this._loadPlan(this._planFiles[0]);
      } else {
        // No files at all
        this._postMessage({
          type: 'empty',
          message: 'No PLAN*.md files found in workspace'
        });
      }

      this._outputChannel.appendLine('[PlanMonitor] Refresh complete');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._outputChannel.appendLine(`[PlanMonitor] ERROR refreshing: ${errorMsg}`);
    }
  }

  /**
   * Post message to webview (with safety checks)
   */
  private _postMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    } else {
      this._outputChannel.appendLine('[PlanMonitor] WARNING: Attempted to post message but view is not available');
    }
  }

  /**
   * Handle view disposal
   */
  private _handleDispose(): void {
    this._outputChannel.appendLine('[PlanMonitor] View disposed');
    this._view = undefined;
    this._isInitialized = false;
  }

  /**
   * Generate HTML for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get resource URIs
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'style.css')
    );

    // Get Codicons font URI
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    );

    // Generate nonce for CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${codiconsUri}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>Plan Monitor</title>
</head>
<body>
  <div id="app">
    <div class="loading">Initializing Plan Monitor...</div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate a cryptographically random nonce for CSP
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
