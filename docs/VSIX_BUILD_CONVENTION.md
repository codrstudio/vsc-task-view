# VSIX Build Convention

## Critical: Always Build with UTC Timezone

### Problem

VSCode/VSCodium-based IDEs (including DeepAgent by Abacus AI) have issues parsing VSIX packages created in non-UTC timezones, especially with non-standard locale configurations.

**Symptoms:**
- Extension installs successfully via VSIX
- Error appears when IDE tries to process installed extensions
- Error: `RangeError: Invalid time value at Date.toISOString()`
- Stack trace shows error in `getProductUpdateVersion()`

**Root Cause:**
- VSIX files store file timestamps using system timezone
- When system uses non-standard timezone (e.g., ESAST -0300 in Brazil with pt-BR locale)
- Some IDEs fail to parse these timestamps correctly
- IDE calls `new Date(timestamp)` which creates invalid Date object
- Calling `.toISOString()` on invalid Date throws "Invalid time value"

### Solution

**Always force UTC timezone when packaging:**

```bash
TZ=UTC npm run package
```

### Implementation

Update the `package` script in `package.json`:

```json
{
  "scripts": {
    "package": "TZ=UTC npx vsce@2.15.0 package"
  }
}
```

**Note:** The `TZ=UTC` prefix ensures all file timestamps in the generated VSIX are in UTC, regardless of system locale or timezone configuration.

### Verification

After packaging, verify timestamps are in UTC:

```bash
unzip -l plan-monitor-X.X.X.vsix
```

All timestamps should be in UTC (not local time).

**Example correct output:**
```
2025-11-06 03:18 extension.vsixmanifest
2025-11-06 03:18 [Content_Types].xml
2025-11-06 02:19 extension/LICENSE.txt
```

### Affected Configurations

This issue was observed with:
- **OS:** Windows 10/11 (MINGW64)
- **Locale:** pt-BR (Portuguese Brazil)
- **Timezone:** ESAST (-0300) - East South America Standard Time
- **IDE:** DeepAgent 1.101.24002 (VSCodium-based)

The issue may affect other non-UTC timezone configurations and non-English locales.

### Working Example

**Moonbloom theme extension** (which works correctly) was packaged with:
- Tool: `vsce 2.15.0`
- Timestamps: Mixed dates in standard timezones (2024-12-31, 2025-01-26)
- No locale-specific formatting issues

### Version History

- **v0.11.7 and earlier:** Failed on DeepAgent with "Invalid time value" error
- **v0.11.8:** Fixed by forcing UTC timezone during packaging

### Related Issues

- Stack Overflow: [RangeError: Invalid time value](https://stackoverflow.com/questions/54462227/rangeerror-invalid-time-value)
- Cause: `Date.toISOString()` called on Date object with `undefined` or `NaN` value
- VSCode Extension API does not handle timezone edge cases properly

## Best Practices

1. **Always use `TZ=UTC` when packaging extensions**
2. **Test VSIX on multiple IDEs:** VSCode, VSCodium, DeepAgent, Code-OSS
3. **Verify timestamps** in generated VSIX using `unzip -l`
4. **Document timezone requirements** in CI/CD pipelines
5. **Use vsce 2.15.0** for compatibility with VSCodium-based editors

## CI/CD Configuration

For GitHub Actions, Azure Pipelines, or other CI:

```yaml
# GitHub Actions example
- name: Package Extension
  run: TZ=UTC npm run package
  env:
    TZ: UTC
```

```yaml
# Azure Pipelines example
- script: |
    export TZ=UTC
    npm run package
  displayName: 'Package Extension with UTC'
```

## Additional Notes

- This convention applies to **all VSCode extensions**, not just this project
- The issue is **not specific to this extension** - it's a general VSIX packaging concern
- The `TZ` environment variable is POSIX-standard and works on Linux, macOS, and Windows (Git Bash, WSL)
- On pure Windows CMD/PowerShell, use: `$env:TZ="UTC"; npm run package`
