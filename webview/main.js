// Acquire VSCode API
const vscode = acquireVsCodeApi();

// State management
let currentPlan = null;
let availableFiles = [];
let expandedSections = new Set();

// Message handler
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'updatePlan':
      currentPlan = message.plan;
      renderPlan(currentPlan);
      break;

    case 'fileList':
      availableFiles = message.files;
      renderFileSelector();
      break;

    case 'error':
      renderError(message.message);
      break;

    case 'loading':
      renderLoading(message.message);
      break;

    case 'empty':
      renderEmptyState();
      break;
  }
});

/**
 * Renders the plan in the UI
 */
function renderPlan(plan) {
  if (!plan) {
    renderEmptyState();
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="file-selector" id="file-selector"></div>
    <div class="header">
      <div class="title">${escapeHtml(plan.title)}</div>
      <div class="stats">
        <span class="badge pending" data-tooltip="Pending">${plan.stateCount.pending}</span>
        <span class="badge done" data-tooltip="Done">${plan.stateCount.done}</span>
        <span class="badge in-progress" data-tooltip="In Progress">${plan.stateCount.inProgress}</span>
        <span class="badge blocked" data-tooltip="Blocked">${plan.stateCount.blocked}</span>
        <span class="spacer"></span>
        <button class="action-btn" id="collapse-all" data-tooltip="Collapse All">−</button>
        <button class="action-btn" id="expand-all" data-tooltip="Expand All">+</button>
      </div>
    </div>
    <div class="task-list">
      ${renderTaskList(plan.tasks)}
    </div>
  `;

  // Render file selector
  renderFileSelector();

  // Attach click handlers
  attachHandlers();

  // Attach expand/collapse all handlers
  attachExpandCollapseHandlers();
}

/**
 * Renders file selector dropdown
 */
function renderFileSelector() {
  const container = document.getElementById('file-selector');
  if (!container || availableFiles.length === 0) {
    return;
  }

  const currentPath = currentPlan ? currentPlan.filePath : '';

  container.innerHTML = `
    <select id="file-select">
      ${availableFiles.map(file => `
        <option value="${escapeHtml(file.path)}" ${file.path === currentPath ? 'selected' : ''}>
          ${escapeHtml(file.relativePath)}
        </option>
      `).join('')}
    </select>
  `;

  // Attach change handler
  const select = document.getElementById('file-select');
  if (select) {
    select.addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'selectFile',
        filePath: e.target.value
      });
    });
  }
}

/**
 * Renders hierarchical list (headings + tasks) in accordion style
 */
function renderTaskList(items, level = 0) {
  if (!items || items.length === 0) {
    return '<div class="empty-state"><p>No items found</p></div>';
  }

  return items.map(item => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isHeading = item.type === 'heading';
    const isTask = item.type === 'task';

    if (isHeading) {
      // Render heading in accordion style
      const checkboxClass = getCheckboxClass(item.aggregatedStatus);

      return `
        <div class="accordion-item heading-item h${item.level}" data-type="heading" data-id="${escapeHtml(item.id)}" data-status="${item.aggregatedStatus || 'pending'}" data-nest-level="${level}" ${hasChildren ? `data-has-children="true"` : ''}>
          <div class="accordion-header" data-id="${escapeHtml(item.id)}">
            <span class="checkbox ${checkboxClass}"></span>
            <span class="heading-text">${escapeHtml(item.text)}</span>
            <span class="link-icon" data-line="${item.line}" data-file="${escapeHtml(currentPlan.filePath)}">🔗</span>
            ${hasChildren ? `<small class="chevron">${isExpanded ? '⯆' : '⯈'}</small>` : ''}
          </div>
          ${hasChildren && isExpanded ? `
            <div class="accordion-content">
              ${renderTaskList(item.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    } else if (isTask) {
      // Render task
      const checkboxClass = getCheckboxClass(item.state, hasChildren ? item.aggregatedStatus : null);

      return `
        <div class="accordion-item task-item" data-state="${item.state}" data-type="task" data-id="${escapeHtml(item.id)}" data-nest-level="${level}" ${hasChildren ? `data-has-children="true"` : ''}>
          <div class="accordion-header task-header" data-id="${escapeHtml(item.id)}">
            <span class="checkbox ${checkboxClass}"></span>
            <span class="task-text">${escapeHtml(item.text)}</span>
            <span class="link-icon" data-line="${item.line}" data-file="${escapeHtml(currentPlan.filePath)}">🔗</span>
            ${hasChildren ? `<span class="chevron">${isExpanded ? '⯆' : '⯈'}</span>` : ''}
          </div>
          ${hasChildren && isExpanded ? `
            <div class="accordion-content">
              ${renderTaskList(item.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }

    return '';
  }).join('');
}

/**
 * Gets checkbox class based on status
 * @param {string} state - Task state or aggregated status
 * @param {string} aggregatedStatus - Aggregated status for tasks with children
 * @returns {string} CSS class for checkbox
 */
function getCheckboxClass(state, aggregatedStatus = null) {
  // If task has children, use aggregated status
  if (aggregatedStatus) {
    if (aggregatedStatus === 'done') return 'checked';
    if (aggregatedStatus === 'partial') return 'partial';
    return 'unchecked';
  }

  // Regular task or heading
  switch (state) {
    case 'done':
      return 'checked';
    case 'partial':
      return 'partial';
    case 'in-progress':
      return 'in-progress';
    case 'blocked':
      return 'blocked';
    case 'pending':
    default:
      return 'unchecked';
  }
}

/**
 * Attaches event handlers to interactive elements
 */
function attachHandlers() {
  // Click on header to toggle (expand/collapse)
  document.querySelectorAll('.accordion-header').forEach(el => {
    // Single click: toggle expand/collapse
    el.addEventListener('click', (e) => {
      // Don't toggle if clicking on link icon
      if (e.target.closest('.link-icon')) {
        return;
      }

      const itemId = el.dataset.id;
      const hasChildren = el.parentElement.dataset.hasChildren === 'true';

      if (hasChildren && itemId) {
        if (expandedSections.has(itemId)) {
          expandedSections.delete(itemId);
        } else {
          expandedSections.add(itemId);
        }
        renderPlan(currentPlan);
      }
    });

    // Double-click on description: navigate to line
    el.addEventListener('dblclick', (e) => {
      // Don't navigate if clicking on link icon (it has its own handler)
      if (e.target.closest('.link-icon')) {
        return;
      }

      e.stopPropagation();

      // Busca o link-icon dentro do header para pegar os dados corretos
      const linkIcon = el.querySelector('.link-icon');
      if (!linkIcon) {
        return;
      }

      const line = parseInt(linkIcon.dataset.line);
      const file = linkIcon.dataset.file;

      if (!isNaN(line) && file) {
        vscode.postMessage({
          type: 'navigateToLine',
          filePath: file,
          line: line
        });
      }
    });
  });

  // Single-click on link icon: navigate to file
  document.querySelectorAll('.link-icon').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();

      const line = parseInt(el.dataset.line);
      const file = el.dataset.file;

      vscode.postMessage({
        type: 'navigateToLine',
        filePath: file,
        line: line
      });
    });
  });
}

/**
 * Attaches expand/collapse all handlers
 */
function attachExpandCollapseHandlers() {
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');

  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      // Recursively collect all item IDs that have children
      function collectAllIds(items) {
        const ids = [];
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            ids.push(item.id);
            ids.push(...collectAllIds(item.children));
          }
        });
        return ids;
      }

      // Expand all items with children
      const allIds = collectAllIds(currentPlan.tasks);
      allIds.forEach(id => expandedSections.add(id));
      renderPlan(currentPlan);
    });
  }

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      expandedSections.clear();
      renderPlan(currentPlan);
    });
  }
}

/**
 * Renders error message
 */
function renderError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="error">
      <strong>Error:</strong> ${escapeHtml(message)}
    </div>
  `;
}

/**
 * Renders empty state when no plan files found
 */
function renderEmptyState() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="empty-state">
      <p>No PLAN*.md files found in workspace</p>
      <p>Create a file starting with "PLAN" and ending with ".md"</p>
    </div>
  `;
}

/**
 * Renders loading state
 */
function renderLoading(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="loading">
      ${escapeHtml(message || 'Loading...')}
    </div>
  `;
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
renderEmptyState();
