import * as vscode from 'vscode';

/**
 * Finds all PLAN*.md files in the workspace
 * @param workspaceFolder The workspace folder to search in
 * @param exclusions Additional patterns to exclude (from config)
 * @returns Promise resolving to array of file URIs sorted alphabetically
 */
export async function findPlanFiles(
  workspaceFolder?: vscode.WorkspaceFolder,
  exclusions: string[] = []
): Promise<vscode.Uri[]> {
  try {
    // If no workspace is open, return empty array
    if (!workspaceFolder && !vscode.workspace.workspaceFolders) {
      return [];
    }

    // Use the provided folder or the first workspace folder
    const folder = workspaceFolder || vscode.workspace.workspaceFolders![0];

    // Combine default exclusions with user-provided ones
    const excludePattern = exclusions.length > 0
      ? `{${exclusions.join(',')}}`
      : '**/node_modules/**';

    // Search for PLAN*.md files with combined exclusions
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, '**/PLAN*.md'),
      excludePattern
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
