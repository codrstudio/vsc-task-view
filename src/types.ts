/** Represents the state of a task checkbox */
export enum TaskState {
  Pending = 'pending',      // [ ]
  Done = 'done',            // [x]
  Incomplete = 'incomplete', // [-]
  InProgress = 'in-progress', // [>]
  Blocked = 'blocked'       // [!]
}

/** Type of hierarchy item */
export enum ItemType {
  Heading = 'heading',
  Task = 'task'
}

/** Aggregated status for headings/sections */
export enum AggregatedStatus {
  Done = 'done',           // All children done
  Partial = 'partial',     // Some children done
  Pending = 'pending',     // No children done
  InProgress = 'in-progress' // At least one child in progress
}

/** A single item in the hierarchy (heading or task) */
export interface HierarchyItem {
  id: string;              // Unique identifier (file + line)
  type: ItemType;          // Whether this is a heading or task
  text: string;            // Heading text or task description
  state?: TaskState;       // Task state (only for tasks)
  aggregatedStatus?: AggregatedStatus; // Aggregated status for headings
  line: number;            // Line number in source file (0-indexed)
  level: number;           // Heading level (1-6) or task nesting level
  children: HierarchyItem[]; // Nested items (headings or tasks)
  hasTaskDescendants?: boolean; // Whether this branch has any tasks
}

/** Legacy type alias for backward compatibility */
export type TaskItem = HierarchyItem;

/** Root structure of a parsed plan file */
export interface ParsedPlan {
  title: string;           // First line or filename
  subtitle: string;        // Filename as link
  filePath: string;        // Full path to source file
  tasks: TaskItem[];       // Root-level tasks
  totalCount: number;      // Total task count
  stateCount: {            // Count by state
    pending: number;
    done: number;
    inProgress: number;
    blocked: number;
  };
}

/** Cache entry with modification time */
export interface CacheEntry {
  mtime: number;           // File modification time (ms since epoch)
  parsed: ParsedPlan;      // Cached parse result
}

/** Message types for webview communication */
export enum MessageType {
  UpdatePlan = 'updatePlan',       // Extension → Webview: New plan data
  NavigateToLine = 'navigateToLine', // Webview → Extension: User clicked task
  SelectFile = 'selectFile',       // Webview → Extension: User changed file
  OpenSettings = 'openSettings',   // Webview → Extension: User clicked settings icon
  UpdateConfig = 'updateConfig',   // Extension → Webview: Send current config
  SaveConfig = 'saveConfig'        // Webview → Extension: Save config changes
}

export interface NavigateMessage {
  type: MessageType.NavigateToLine;
  filePath: string;
  line: number;
}

export interface UpdateMessage {
  type: MessageType.UpdatePlan;
  plan: ParsedPlan;
}

export interface SelectMessage {
  type: MessageType.SelectFile;
  filePath: string;
}

export interface OpenSettingsMessage {
  type: MessageType.OpenSettings;
}

export interface UpdateConfigMessage {
  type: MessageType.UpdateConfig;
  config: TaskViewConfig;
}

export interface SaveConfigMessage {
  type: MessageType.SaveConfig;
  config: TaskViewConfig;
}

/** Configuration structure for .codr/task-planner.json */
export interface TaskViewConfig {
  exclusions: string[];  // Array of folder paths and glob patterns to exclude
}

/** Default configuration */
export const DEFAULT_CONFIG: TaskViewConfig = {
  exclusions: ['**/node_modules/**', '**/.git/**']
};
