import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { CacheEntry, ParsedPlan } from './types';

/**
 * Cache for parsed plan files using mtime-based invalidation
 */
export class PlanCache {
  private cache: Map<string, CacheEntry> = new Map();
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Retrieves cached plan if file hasn't changed
   * @param filePath Path to the plan file
   * @returns Cached ParsedPlan or null if cache miss
   */
  async get(filePath: string): Promise<ParsedPlan | null> {
    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);
      const cached = this.cache.get(filePath);

      // Cache hit - mtime matches
      if (cached && cached.mtime === stats.mtimeMs) {
        this.outputChannel.appendLine(`Cache hit: ${filePath}`);
        return cached.parsed;
      }

      // Cache miss or invalidated
      this.outputChannel.appendLine(`Cache miss: ${filePath}`);
      return null;
    } catch (error) {
      // File not found or other error
      this.outputChannel.appendLine(`Cache get error for ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Stores parsed plan in cache with current mtime
   * @param filePath Path to the plan file
   * @param plan Parsed plan to cache
   */
  async set(filePath: string, plan: ParsedPlan): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      this.cache.set(filePath, {
        mtime: stats.mtimeMs,
        parsed: plan
      });
      this.outputChannel.appendLine(`Cache updated: ${filePath}`);
    } catch (error) {
      // Log warning but don't throw
      this.outputChannel.appendLine(`Cache set warning for ${filePath}: ${error}`);
    }
  }

  /**
   * Invalidates cache entry for a file
   * @param filePath Path to the plan file
   */
  invalidate(filePath: string): void {
    if (this.cache.delete(filePath)) {
      this.outputChannel.appendLine(`Cache invalidated: ${filePath}`);
    }
  }

  /**
   * Clears entire cache
   */
  clear(): void {
    this.cache.clear();
    this.outputChannel.appendLine('Cache cleared');
  }
}
