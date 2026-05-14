# Undo/Redo System - Huggy

## Overview

Implementation of undo/redo functionality similar to Lovable and Bolt, allowing users to:
- Navigate through version history with **Ctrl+Z** (undo) and **Ctrl+Shift+Z** (redo)
- Visual timeline of all builds
- One-click restore to any previous version
- Quick return to "Live" current version

## Features

### Keyboard Shortcuts
- **Ctrl+Z** / **Cmd+Z** → Undo (go to previous/older version)
- **Ctrl+Shift+Z** / **Cmd+Shift+Z** → Redo (go to next/newer version)
- **Ctrl+Y** → Alternative redo shortcut

### UI Components

#### 1. UndoRedoToolbar
Quick access buttons in the header:
- Undo button (disabled when no history available)
- Redo button (disabled when at latest version)
- History button (opens full timeline drawer)
- "Viewing History" badge when not at latest
- Reset to Live button

#### 2. BuildTimeline
Visual timeline drawer showing:
- Current/Live state (blue pulse when active)
- All previous builds with timestamps
- QA scores per build
- File counts
- Selected state indicator
- Timeline connector line

#### 3. useUndoRedo Hook
State management for undo/redo:
```typescript
const {
  builds,           // Array of builds
  currentIndex,     // -1 = live, 0+ = viewing that build
  canUndo,          // Boolean
  canRedo,          // Boolean
  isViewingHistory, // Boolean
  undo,             // () => void
  redo,             // () => void
  resetToLive,      // () => void
  jumpToVersion,    // (index: number) => void
} = useUndoRedo({
  projectId,
  getBuilds,
  onRestore,
  onResetToLive,
});
```

## Architecture

### State Flow
```
User builds app → Save to Supabase → Update builds array
                    ↓
            Ctrl+Z pressed
                    ↓
            Load previous build files
                    ↓
            Update preview and editor
                    ↓
            Show "Viewing History" badge
```

### Data Model
```typescript
interface Build {
  id: string;
  project_id: string;
  files: FileEntry[];        // Full app state
  prompt: string;            // Original prompt
  qa_score?: number;        // Quality score
  created_at: string;       // Timestamp
}
```

## Implementation

### Files Added/Modified
- `src/hooks/useUndoRedo.ts` - Core hook
- `src/components/UndoRedoToolbar.tsx` - Quick buttons
- `src/components/BuildTimeline.tsx` - Visual timeline
- `src/App.tsx` - Integration

### Database
Builds are stored in Supabase `builds` table with full file snapshots.

## User Experience

### Scenario 1: Iterative Design
1. User creates "Todo app"
2. User says "Add dark mode" → New build saved
3. User says "Add filters" → Another build saved
4. User presses **Ctrl+Z** → Back to version with dark mode only
5. User presses **Ctrl+Shift+Z** → Forward to latest with filters

### Scenario 2: Time Travel
1. User has 10 versions of app
2. User opens History drawer
3. User clicks on version #3 from 2 hours ago
4. Preview updates to show that version
5. User clicks "Reset to Live" to return to current

## Future Enhancements

### Diff View
- Compare two versions side-by-side
- Highlight file changes
- Show code diffs

### Branching
- Create branches from any version
- Merge branches
- Named versions (e.g., "v1.0 MVP")

### Auto-save
- Save intermediate states during streaming
- More granular history

## Notes

- Each build creates a complete snapshot (immutable)
- No data loss when undoing (just switching pointers)
- All file operations are read-only on history
- Restore creates a "new" version from old state
