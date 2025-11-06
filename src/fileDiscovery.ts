import * as vscode from 'vscode';

/**
 * Finds all PLAN*.md files in the workspace
 * @param workspaceFolder The workspace folder to search in
 * @returns Promise resolving to array of file URIs sorted alphabetically
 */
export async function findPlanFiles(
  workspaceFolder?: vscode.WorkspaceFolder
): Promise<vscode.Uri[]> {
  try {
    // If no workspace is open, return empty array
    if (!workspaceFolder && !vscode.workspace.workspaceFolders) {
      return [];
    }

    // Use the provided folder or the first workspace folder
    const folder = workspaceFolder || vscode.workspace.workspaceFolders![0];

    // Search for PLAN*.md files, excluding node_modules
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, '**/PLAN*.md'),
      '**/node_modules/**'
    );

    // Sort alphabetically by filename
    return files.sort((a, b) => {
      const aName = a.fsPath.split(/[/\\]/).pop() || '';
      const bName = b.fsPath.split(/[/\\]/).pop() || '';
      return aName.localeCompare(bName);
    });
  } catch (error) {
    // Log error but don't throw - return empty array on failure
    console.error('Error finding PLAN files:', error);
    return [];
  }
}

/**
 * Gets workspace-relative path for a file URI
 * @param uri File URI
 * @returns Workspace-relative path or full path if not in workspace
 */
export function getWorkspaceRelativePath(uri: vscode.Uri): string {
  try {
    return vscode.workspace.asRelativePath(uri, false);
  } catch (error) {
    // Fallback to full path if not in workspace
    return uri.fsPath;
  }
}
