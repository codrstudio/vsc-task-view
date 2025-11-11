import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TaskViewConfig, DEFAULT_CONFIG } from './types';

/**
 * Manages reading and writing the .codr/task-planner.json configuration file
 */
export class ConfigManager {
  private static readonly CONFIG_DIR = '.codr';
  private static readonly CONFIG_FILE = 'task-planner.json';

  private workspaceFolder: vscode.WorkspaceFolder;
  private configPath: string;

  constructor(workspaceFolder: vscode.WorkspaceFolder) {
    this.workspaceFolder = workspaceFolder;
    this.configPath = path.join(
      workspaceFolder.uri.fsPath,
      ConfigManager.CONFIG_DIR,
      ConfigManager.CONFIG_FILE
    );
  }

  /**
   * Reads the configuration file, creating it with defaults if it doesn't exist
   */
  async readConfig(): Promise<TaskViewConfig> {
    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        // Create with defaults
        await this.writeConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }

      // Read and parse config file
      const content = await fs.promises.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content) as TaskViewConfig;

      // Validate config structure
      if (!config.exclusions || !Array.isArray(config.exclusions)) {
        console.warn('Invalid config structure, using defaults');
        return DEFAULT_CONFIG;
      }

      return config;
    } catch (error) {
      console.error('Error reading config:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Writes the configuration to disk
   */
  async writeConfig(config: TaskViewConfig): Promise<void> {
    try {
      // Ensure .codr directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
      }

      // Write config file with pretty formatting
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(this.configPath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing config:', error);
      throw error;
    }
  }

  /**
   * Gets the file path to the config file
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Opens the config file in the editor
   */
  async openConfigFile(): Promise<void> {
    try {
      // Ensure config exists
      await this.readConfig();

      // Open in editor
      const doc = await vscode.workspace.openTextDocument(this.configPath);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      console.error('Error opening config file:', error);
      throw error;
    }
  }
}
