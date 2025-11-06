# Installation Guide - Plan Monitor v0.5.1

## 🎯 This Version FIXES the "No data provider registered" Error

Version 0.5.1 contains the **ACTUAL definitive fix** for the data provider registration issue.

**What was wrong**: The `package.json` was missing the `"type": "webview"` field in the view definition. Without this field, VSCode doesn't recognize the view as a webview and never calls `resolveWebviewView()`.

**What's fixed**: Added `"type": "webview"` to the view configuration, which is mandatory for `WebviewViewProvider` to work.

---

## 📋 Prerequisites

Before installing, make sure:
- ✅ VSCode or VSCodium version 1.75.0 or higher
- ✅ All previous versions of plan-monitor are uninstalled

---

## 🗑️ Step 1: Clean Previous Installations

### VSCodium (your case)

```bash
# Remove ALL old versions
rm -rf /c/Users/gugac/.vscode-oss/extensions/codr-studio.plan-monitor-*
```

### VSCode (if applicable)

```bash
# Remove ALL old versions
rm -rf ~/.vscode/extensions/codr-studio.plan-monitor-*
```

**Or manually:**
1. Open VSCodium
2. Go to Extensions (Ctrl+Shift+X)
3. Find "Plan Monitor"
4. Click gear icon ⚙️ → Uninstall
5. **Restart VSCodium** (important!)

---

## 📦 Step 2: Install v0.5.1

1. **Open VSCodium**
2. **Go to Extensions** (Ctrl+Shift+X)
3. **Click "..." menu** (three dots) at the top-right
4. **Select "Install from VSIX..."**
5. **Navigate to**: `D:\sources\codr.studio\platform\src\vsc-task-view\`
6. **Select**: `plan-monitor-0.5.1.vsix`
7. **Click "Install"**
8. **IMPORTANT**: Click "Reload Now" when prompted

---

## ✅ Step 3: Verify Installation

### Automatic Verification

After VSCodium restarts, **within 2-3 seconds**, you should see:

1. **Output Panel Opens Automatically**
   - Shows activation logs with ═══ borders
   - Look for: "✓ Plan Monitor Extension ACTIVATED"

2. **Check the Logs**
   ```
   ═════════════════════════════════════════
   Plan Monitor Extension ACTIVATION STARTED
   ═════════════════════════════════════════
   [STEP 1] ✓ Provider created successfully
   [STEP 2] ✓ Provider registered successfully
   [STEP 3] ✓ FileSystemWatcher configured
   ═════════════════════════════════════════
   ✓ Plan Monitor Extension ACTIVATED
   ═════════════════════════════════════════
   ```

3. **If output doesn't show automatically:**
   - Press `Ctrl+Shift+U` (View > Output)
   - Select "Plan Monitor" from the dropdown
   - You should see the activation logs

### Manual Verification

4. **Look for the icon** in the Activity Bar (left sidebar)
   - Should show a checklist icon ✅
   - Located below other sidebar icons

5. **Click the icon**
   - Panel should open immediately
   - NO "There is no data provider registered" error
   - Should show either:
     - Loading state → File list → Content
     - OR "No PLAN*.md files found"

---

## 🧪 Step 4: Test Functionality

### Test 1: Basic Display
1. Click the Plan Monitor icon in Activity Bar
2. Verify panel opens without errors
3. Should see list of PLAN*.md files (if any exist)

### Test 2: File Discovery
1. Create a test file: `PLAN-test.md`
2. Add some content:
   ```markdown
   # Test Plan

   - [ ] Test task 1
   - [x] Test task 2
   - [-] Test task 3
   - [!] Test task 4
   ```
3. Save the file
4. Check Plan Monitor panel - should detect the new file

### Test 3: Navigation
1. In the Plan Monitor panel, click any task
2. Verify the PLAN.md file opens
3. Verify cursor jumps to the correct line

### Test 4: Auto-Refresh
1. Edit a PLAN.md file
2. Change a checkbox state: `[ ]` → `[x]`
3. Save the file
4. Panel should update automatically

---

## 🐛 Troubleshooting

### Issue: Output panel doesn't show activation logs

**Solution:**
```bash
# 1. Open Developer Tools
Ctrl+Shift+P → "Developer: Toggle Developer Tools"

# 2. Check Console tab for errors
# 3. Look for errors mentioning "plan-monitor" or "codr-studio"

# 4. Manually open Output
Ctrl+Shift+U → Select "Plan Monitor"
```

### Issue: "There is no data provider registered" STILL appears

This should NOT happen in v0.5.1. If it does:

1. **Verify the version:**
   ```bash
   ls -la /c/Users/gugac/.vscode-oss/extensions/ | grep plan-monitor
   ```
   Should show ONLY `codr-studio.plan-monitor-0.5.1/`

2. **Check if extension activated:**
   - Open Output panel
   - Select "Plan Monitor"
   - Look for "✓ Plan Monitor Extension ACTIVATED"

3. **If not activated, check extension list:**
   ```
   Ctrl+Shift+P → "Developer: Show Running Extensions"
   ```
   Search for "plan-monitor" and check status

4. **Get detailed logs:**
   - Output > "Plan Monitor" - Activation logs
   - Output > "Extension Host" - VSCode extension system logs
   - Share these logs for further debugging

### Issue: Icon doesn't appear in Activity Bar

**Solution:**
1. Restart VSCodium completely (close all windows)
2. Wait 3-5 seconds after reopening
3. Check Activity Bar again
4. If still missing, check Output > "Plan Monitor" for activation errors

### Issue: Extension not loading

**Solution:**
```bash
# 1. Complete clean reinstall
rm -rf /c/Users/gugac/.vscode-oss/extensions/codr-studio.plan-monitor-*

# 2. Clear VSCodium cache (optional, if problems persist)
rm -rf /c/Users/gugac/.vscode-oss/Cache/*
rm -rf /c/Users/gugac/.vscode-oss/CachedExtensions/*

# 3. Reinstall v0.5.1
# (Follow Step 2 above)

# 4. Restart VSCodium
```

---

## 📊 What's Different in v0.5.1?

**THE CRITICAL FIX (v0.5.1)**:

| Aspect | v0.5.0 (Broken) | v0.5.1 (Fixed) |
|--------|-----------------|----------------|
| **View Type Field** | ❌ Missing | ✅ `"type": "webview"` |
| **resolveWebviewView Called** | ❌ Never | ✅ Always |
| **Provider Association** | ❌ Not connected | ✅ Properly connected |
| **Error Status** | ⚠️ Still occurred | ✅ Completely fixed |

**Previous Improvements (v0.5.0)**:

| Aspect | v0.4.0 | v0.5.0 |
|--------|--------|--------|
| **Activation Event** | `onView:planMonitorView` | `onStartupFinished` |
| **Activation Timing** | When view is first opened | 2-3 sec after VSCode startup |
| **Race Condition** | ❌ Possible | ✅ Eliminated |
| **Provider Registration** | ⚠️ May be late | ✅ Always ready |
| **Output Display** | Manual | ✅ Automatic |
| **Diagnostic Logs** | Basic | ✅ Comprehensive |

---

## 🎉 Success Indicators

You'll know it's working correctly when:

1. ✅ Output panel shows activation within 3 seconds of opening VSCodium
2. ✅ Logs show "✓ Plan Monitor Extension ACTIVATED"
3. ✅ Plan Monitor icon appears in Activity Bar
4. ✅ Clicking icon opens panel immediately
5. ✅ NO "There is no data provider registered" error
6. ✅ PLAN*.md files are discovered and displayed

---

## 📞 Still Having Issues?

If problems persist after following this guide:

1. **Capture logs:**
   - Output > "Plan Monitor" (save all text)
   - Output > "Extension Host" (save relevant parts)
   - Developer Tools > Console (screenshot errors)

2. **Check extension status:**
   ```
   Ctrl+Shift+P → "Developer: Show Running Extensions"
   ```
   Screenshot the plan-monitor entry

3. **System information:**
   - VSCodium version: `Help > About`
   - OS: Windows/Linux/Mac + version
   - Extension version: Should be 0.5.0

4. **Share this information for further debugging**

---

## 📚 Additional Documentation

- **DIAGNOSTIC-REPORT.md** - Technical details about the fix
- **CHANGELOG.md** - Complete version history
- **README.md** - General usage guide
