# Manual Shift Cost Override Feature

## Overview
Added the ability for users to manually override shift costs instead of using calculated amounts based on line items. This is useful for special situations where standard pricing doesn't apply.

## Features Implemented

### 1. **Override Button in Shift Dialog**
- Located next to "Shift total: $X.XX" display
- Button text: "✎ Override" (or "✎ Edit" if override already set)
- Transparent styling with subtle border

### 2. **Manual Cost Input**
- When button clicked, an input field appears below the total
- Accepts decimal values (up to 2 decimal places)
- Validation:
  - Must be greater than 0
  - Accepts up to 2 decimal places (e.g., 25.50)
  - Empty value clears the override
- "Done" button to confirm and hide the input

### 3. **Cost Calculation**
- If manual override is set: uses override value
- If no override: uses standard calculated cost
- On save: override flag (`is_cost_overridden`) is set in database

### 4. **Visual Indicators**

#### In Shift Tiles (Both Day and Week Views)
- **White border (2px)**: Indicates shift has manual cost override
- **⚙️ gear icon**: Appears next to cost value (all views)
- Matches style of other indicators:
  - Red border = HIREUP
  - Purple border = Sleepover
  - Green border = Public Holiday
  - White border = Manual Cost Override

#### In Shift Details
- Gear icon (⚙️) appears next to cost display
- Cost value shows the overridden amount

### 5. **State Management**
- `manualCostOverride`: Stores the numeric override value (null if none set)
- `showManualCostInput`: Controls visibility of input field
- States clear when:
  - Dialog is closed
  - Shift is saved
  - Shift is opened for editing (loads existing override if present)

### 6. **Data Persistence**

#### Database Column
- **Column name**: `is_cost_overridden` (BOOLEAN)
- **Default**: false
- **Indexed**: Yes, for efficient queries
- **Migration file**: `migrations/add_cost_override_flag.sql`

#### Database Query
- All shift queries automatically include the new column
- Column is used to determine visual indicators on shift tiles

## Implementation Details

### File Changes

#### `app/calendar/CalendarClient.tsx`
- **Lines 206-207**: State variables
- **Line 2575**: Cost calculation logic (uses override if set)
- **Line 2645**: Save override flag to database
- **Lines 2681-2682**: Reset override states after save
- **Lines 3007-3012**: Load override when editing existing shift
- **Lines 4183-4221**: Week view shift rendering with override indicator
- **Lines 4390-4470**: Day view shift rendering with override indicator

#### `migrations/add_cost_override_flag.sql`
- New migration file to add the database column
- Creates index for performance

### UI Components

#### Override Input Section
```
[Button: "✎ Override"] 
  ↓ (when clicked)
[Input field] [Done button]
```

#### Visual Style
- Input: Dark theme matching shift dialog
- Button: Transparent with subtle border on hover
- Icon: Gear symbol (⚙️) in white

## Database Setup

### Running the Migration

To add the `is_cost_overridden` column to your database:

1. **In Supabase SQL Editor**:
   ```sql
   ALTER TABLE shifts
   ADD COLUMN is_cost_overridden BOOLEAN DEFAULT false;
   
   CREATE INDEX idx_shifts_is_cost_overridden ON shifts(is_cost_overridden);
   ```

2. **Or using the migration file**:
   - Copy contents of `migrations/add_cost_override_flag.sql`
   - Execute in Supabase SQL Editor

### Verification
After running migration, verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shifts' 
AND column_name = 'is_cost_overridden';
```

## User Workflow

### Creating a Shift with Manual Cost
1. Create shift normally
2. Fill in all required fields (carer, client, times)
3. Click "✎ Override" button next to total cost
4. Enter desired cost in the input field (e.g., 75.50)
5. Click "Done" to confirm
6. Save shift - override is now stored

### Editing Existing Override
1. Click shift to edit
2. Click "✎ Edit" button (appears when override exists)
3. Modify cost in input field
4. Click "Done"
5. Save shift to update

### Removing Override
1. Click shift to edit
2. Click "✎ Edit" button
3. Clear the input field (delete text)
4. Click "Done"
5. Save shift - override is removed

## Visual Examples

### Shift Tile Display (Week View)
```
┌─────────────────────┐
│ 09:00-17:00: John   │  ← White border indicates override
│ $45.75 ⚙️           │  ← Gear icon shows override is active
│ STANDARD            │
└─────────────────────┘
```

### Day View
```
09:00 - 17:00, John Smith - $45.75 ⚙️ STANDARD
↑ White border, Gear icon visible
```

## Validation Rules

| Rule | Example | Status |
|------|---------|--------|
| Positive value only | -25, 0 | ❌ Rejected |
| Greater than zero | 0.01 | ✅ Accepted |
| Two decimal places max | 45.50 | ✅ Accepted |
| More than two decimals | 45.555 | ❌ Rejected |
| Valid number format | abc | ❌ Rejected |

## Technical Notes

- Override value is saved as the `cost` field in database
- The `is_cost_overridden` flag indicates whether cost was manually set
- All existing shifts default to `is_cost_overridden = false`
- Manual costs are preserved during shift updates
- Works with all shift types (HIREUP, standard, sleepover, public holiday)
- Visual priority: HIREUP (red) > Sleepover (purple) > Public Holiday (green) > Override (white)

## Testing Checklist

- [ ] Can create shift with manual cost override
- [ ] Can edit existing override
- [ ] Can remove override
- [ ] Override cost is saved to database
- [ ] White border appears on shift tiles with override
- [ ] Gear icon (⚙️) displays correctly
- [ ] Override persists when reopening shift editor
- [ ] Cost calculation uses override value, not line item calculation
- [ ] Works in both day and week views
- [ ] Works with copy shift/day/week operations (preserves override)
- [ ] All TypeScript checks pass
- [ ] Vercel deployment successful
