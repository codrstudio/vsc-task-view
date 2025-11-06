import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { HierarchyItem, ItemType, TaskState, AggregatedStatus, ParsedPlan } from './types';

/**
 * Parses markdown content to extract tasks and their states
 * @param content Markdown file content
 * @param filePath Path to the source file
 * @returns ParsedPlan object with hierarchical task structure
 */
export function parsePlan(content: string, filePath: string): ParsedPlan {
  // Initialize markdown-it with task lists plugin
  const md = new MarkdownIt();
  md.use(taskLists, {
    enabled: true,
    label: true,
    labelAfter: false
  });

  // No need to customize renderer - we'll extract state from tokens directly

  // Parse content to tokens
  const tokens = md.parse(content, {});

  console.log('[PlanParser] Total tokens:', tokens.length);
  console.log('[PlanParser] First 10 tokens:', tokens.slice(0, 10).map(t => ({ type: t.type, content: t.content })));

  // Extract items (headings + tasks) from token stream
  const flatItems: Array<{ item: HierarchyItem; level: number }> = [];
  let listDepth = 0; // Track nested list depth
  let lineCounter = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Extract headings (H2 and deeper - ignore H1)
    if (token.type === 'heading_open') {
      const headingLevel = parseInt(token.tag.substring(1)); // h1 → 1, h2 → 2, etc.

      // Only process H2+ (skip H1)
      if (headingLevel >= 2) {
        const contentToken = tokens[i + 1];
        if (contentToken && contentToken.type === 'inline') {
          const headingText = contentToken.content;
          const lineNumber = token.map ? token.map[0] : lineCounter;

          console.log('[PlanParser] Adding heading:', {
            text: headingText,
            line: lineNumber,
            level: headingLevel
          });

          flatItems.push({
            item: {
              id: `${filePath}:${lineNumber}`,
              type: ItemType.Heading,
              text: headingText,
              line: lineNumber,
              level: headingLevel,
              children: []
            },
            level: headingLevel
          });
        }
      }
    }

    // Track list nesting depth
    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      listDepth++;
    }
    if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
      listDepth--;
    }

    // Extract task items
    if (token.type === 'list_item_open') {
      const contentToken = tokens[i + 2]; // inline token with children

      if (contentToken && contentToken.type === 'inline' && contentToken.children) {
        // Detect task state from token structure
        let state: TaskState | null = null;
        let text = '';

        // Check if it's a standard task-list-item (processed by plugin)
        const hasTaskClass = token.attrs?.some(([key, val]) =>
          key === 'class' && val.includes('task-list-item')
        );

        if (hasTaskClass) {
          // Standard checkbox: [x] or [ ]
          // Plugin adds html_inline tokens: <label> and <input...>
          // Find the input element to check state
          const inputChild = contentToken.children.find(c =>
            c.type === 'html_inline' && c.content.includes('task-list-item-checkbox')
          );

          if (inputChild) {
            if (inputChild.content.includes('checked=""')) {
              state = TaskState.Done;
            } else {
              state = TaskState.Pending;
            }
          }

          // Extract text from non-html tokens only
          text = contentToken.children
            .filter(c => c.type !== 'html_inline')
            .map(c => c.content)
            .join('')
            .trim();
        } else {
          // Not processed by plugin - check for custom checkboxes
          const fullText = contentToken.content;

          if (fullText.match(/^\[-\]/)) {
            state = TaskState.InProgress;
            text = fullText.replace(/^\[-\]\s*/, '').trim();
          } else if (fullText.match(/^\[!\]/)) {
            state = TaskState.Blocked;
            text = fullText.replace(/^\[!\]\s*/, '').trim();
          }
          // If no match, state remains null (not a checkbox)
        }

        // Only add if we found a valid checkbox state
        if (state !== null && text) {
          const lineNumber = token.map ? token.map[0] : lineCounter;

          // Find the closest heading before this task
          // Look backwards through flatItems to find the last heading
          let headingLevel = 0;
          for (let j = flatItems.length - 1; j >= 0; j--) {
            if (flatItems[j].item.type === ItemType.Heading) {
              headingLevel = flatItems[j].level;
              break;
            }
          }

          // Task level = heading level + list depth
          const taskLevel = headingLevel + listDepth;

          console.log('[PlanParser] Adding task:', {
            text,
            state,
            line: lineNumber,
            level: taskLevel,
            headingLevel,
            listDepth
          });

          flatItems.push({
            item: {
              id: `${filePath}:${lineNumber}`,
              type: ItemType.Task,
              text,
              state,
              line: lineNumber,
              level: taskLevel,
              children: []
            },
            level: taskLevel
          });
        } else if (hasTaskClass || contentToken.content.match(/^\[[ x\-!]\]/i)) {
          console.log('[PlanParser] Checkbox detected but no valid state:', contentToken.content);
        }
      }
    }

    lineCounter++;
  }

  console.log('[PlanParser] Total flat items found:', flatItems.length);

  // Build hierarchy from flat list
  let hierarchical = buildHierarchy(flatItems);

  console.log('[PlanParser] Hierarchical items:', hierarchical.length);

  // Mark branches that have task descendants
  markTaskDescendants(hierarchical);

  // Filter only branches that culminate in tasks
  hierarchical = filterTaskBranches(hierarchical);

  console.log('[PlanParser] After filtering task branches:', hierarchical.length);

  // Calculate aggregated status for headings
  calculateAggregatedStatus(hierarchical);

  // Calculate statistics (count only tasks, not headings)
  const counts = { pending: 0, done: 0, inProgress: 0, blocked: 0 };
  const countTasks = (items: HierarchyItem[]) => {
    items.forEach(item => {
      // Only count tasks, not headings
      if (item.type === ItemType.Task && item.state) {
        if (item.state === TaskState.Pending) counts.pending++;
        else if (item.state === TaskState.Done) counts.done++;
        else if (item.state === TaskState.InProgress) counts.inProgress++;
        else if (item.state === TaskState.Blocked) counts.blocked++;
      }

      if (item.children.length > 0) countTasks(item.children);
    });
  };
  countTasks(hierarchical);

  // Count total tasks (not headings)
  const totalTaskCount = flatItems.filter(item => item.item.type === ItemType.Task).length;

  // Extract title and subtitle
  const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  const result = {
    title: firstLine || 'Untitled Plan',
    subtitle: fileName,
    filePath,
    tasks: hierarchical,
    totalCount: totalTaskCount,
    stateCount: counts
  };

  console.log('[PlanParser] Final result:', {
    title: result.title,
    totalCount: result.totalCount,
    stateCount: result.stateCount,
    tasksLength: result.tasks.length
  });

  return result;
}

/**
 * Builds hierarchical structure from flat list of items (headings + tasks)
 * @param flatItems Flat array of items with levels
 * @returns Hierarchical array of root-level items
 */
function buildHierarchy(
  flatItems: Array<{ item: HierarchyItem; level: number }>
): HierarchyItem[] {
  const root: HierarchyItem[] = [];
  const stack: Array<{ level: number; children: HierarchyItem[] }> = [
    { level: 0, children: root }  // Start at level 0 to catch H2 (level 2)
  ];

  flatItems.forEach(({ item, level }) => {
    // Pop stack until we find parent level
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    // Add to current parent's children
    const parent = stack[stack.length - 1];
    parent.children.push(item);

    // Push this item as potential parent
    stack.push({ level, children: item.children });
  });

  return root;
}

/**
 * Marks items that have task descendants (recursively)
 * @param items Hierarchy to mark
 * @returns true if this branch has tasks
 */
function markTaskDescendants(items: HierarchyItem[]): boolean {
  let hasAnyTasks = false;

  for (const item of items) {
    if (item.type === ItemType.Task) {
      // This is a task
      item.hasTaskDescendants = true;
      hasAnyTasks = true;
      // Tasks can have children (subtasks) - mark them too
      if (item.children.length > 0) {
        markTaskDescendants(item.children);
      }
    } else if (item.children.length > 0) {
      // This is a heading with children - check recursively
      const childrenHaveTasks = markTaskDescendants(item.children);
      item.hasTaskDescendants = childrenHaveTasks;
      if (childrenHaveTasks) {
        hasAnyTasks = true;
      }
    } else {
      // This is a heading without children - no tasks
      item.hasTaskDescendants = false;
    }
  }

  return hasAnyTasks;
}

/**
 * Filters hierarchy to keep only branches that culminate in tasks
 * @param items Hierarchy to filter
 * @returns Filtered hierarchy
 */
function filterTaskBranches(items: HierarchyItem[]): HierarchyItem[] {
  return items
    .filter(item => item.hasTaskDescendants)
    .map(item => ({
      ...item,
      children: filterTaskBranches(item.children)
    }));
}

/**
 * Calculates aggregated status for headings and tasks with children
 * @param items Hierarchy to process
 */
function calculateAggregatedStatus(items: HierarchyItem[]): void {
  for (const item of items) {
    // Recursively process children first
    if (item.children.length > 0) {
      calculateAggregatedStatus(item.children);
    }

    // Calculate status for headings AND tasks with children
    if (item.children.length > 0) {
      // Collect all descendant tasks (recursively)
      const descendantTasks = collectDescendantTasks(item);

      if (descendantTasks.length === 0) {
        item.aggregatedStatus = AggregatedStatus.Pending;
      } else {
        const doneCount = descendantTasks.filter(t => t.state === TaskState.Done).length;
        const totalCount = descendantTasks.length;

        if (doneCount === totalCount) {
          item.aggregatedStatus = AggregatedStatus.Done;
        } else if (doneCount > 0) {
          item.aggregatedStatus = AggregatedStatus.Partial;
        } else {
          item.aggregatedStatus = AggregatedStatus.Pending;
        }
      }
    }
  }
}

/**
 * Collects all descendant tasks recursively
 * @param item Item to collect tasks from
 * @returns Array of all descendant tasks
 */
function collectDescendantTasks(item: HierarchyItem): HierarchyItem[] {
  const tasks: HierarchyItem[] = [];

  for (const child of item.children) {
    if (child.type === ItemType.Task) {
      tasks.push(child);
    }

    if (child.children.length > 0) {
      tasks.push(...collectDescendantTasks(child));
    }
  }

  return tasks;
}
