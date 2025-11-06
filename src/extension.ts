import * as vscode from 'vscode';
import { PlanMonitorProvider } from './planMonitorProvider';

/**
 * Extension activation function
 * Called when extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('Plan Monitor');
  outputChannel.appendLine('═════════════════════════════════════════');
  outputChannel.appendLine('Plan Monitor Extension ACTIVATION STARTED');
  outputChannel.appendLine('═════════════════════════════════════════');
  outputChannel.appendLine(`VSCode version: ${vscode.version}`);
  outputChannel.appendLine(`Extension path: ${context.extensionPath}`);
  outputChannel.appendLine(`Workspace folders: ${vscode.workspace.workspaceFolders?.length || 0}`);

  try {
    outputChannel.appendLine('\n[STEP 1] Creating PlanMonitorProvider...');
    const provider = new PlanMonitorProvider(context.extensionUri, outputChannel);
    outputChannel.appendLine('[STEP 1] ✓ Provider created successfully');

    outputChannel.appendLine(`\n[STEP 2] Registering WebviewViewProvider with ID: "${PlanMonitorProvider.viewType}"...`);
    const registration = vscode.window.registerWebviewViewProvider(
      PlanMonitorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    );

    context.subscriptions.push(registration);
    outputChannel.appendLine('[STEP 2] ✓ Provider registered successfully');
    outputChannel.appendLine(`[STEP 2]   - View Type: ${PlanMonitorProvider.viewType}`);
    outputChannel.appendLine(`[STEP 2]   - Retain Context: true`);

    // Get workspace folder for file watching
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      outputChannel.appendLine(`\n[STEP 3] Setting up FileSystemWatcher...`);
      outputChannel.appendLine(`[STEP 3]   - Workspace: ${workspaceFolder.uri.fsPath}`);

      // Create FileSystemWatcher for PLAN*.md files
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceFolder, '**/PLAN*.md')
      );

      // Hook up watcher events
      watcher.onDidChange(() => {
        outputChannel.appendLine('[FileWatcher] PLAN file changed, refreshing view...');
        provider.refreshView();
      });

      watcher.onDidCreate(() => {
        outputChannel.appendLine('[FileWatcher] PLAN file created, refreshing view...');
        provider.refreshView();
      });

      watcher.onDidDelete(() => {
        outputChannel.appendLine('[FileWatcher] PLAN file deleted, refreshing view...');
        provider.refreshView();
      });

      // Add watcher to subscriptions for proper cleanup
      context.subscriptions.push(watcher);
      outputChannel.appendLine('[STEP 3] ✓ FileSystemWatcher configured');
    } else {
      outputChannel.appendLine('\n[STEP 3] ⚠ No workspace folder found - FileSystemWatcher skipped');
    }

    outputChannel.appendLine('\n═════════════════════════════════════════');
    outputChannel.appendLine('✓ Plan Monitor Extension ACTIVATED');
    outputChannel.appendLine('═════════════════════════════════════════');
    outputChannel.appendLine(`Provider registered: ${PlanMonitorProvider.viewType}`);
    outputChannel.appendLine('Status: Ready to display view');
    outputChannel.appendLine('═════════════════════════════════════════\n');

    // Show output channel automatically to help with debugging
    outputChannel.show(true);

  } catch (error) {
    outputChannel.appendLine('\n✗✗✗ ACTIVATION FAILED ✗✗✗');
    outputChannel.appendLine(`Error: ${error}`);
    if (error instanceof Error) {
      outputChannel.appendLine(`Stack: ${error.stack}`);
    }
    outputChannel.show(true); // Show output on error
    vscode.window.showErrorMessage(`Plan Monitor activation failed: ${error}`);
    throw error;
  }
}

/**
 * Extension deactivation function
 * Called when extension is deactivated
 */
export function deactivate() {
  // Cleanup is automatic via subscriptions
  console.log('Plan Monitor extension deactivated');
}
