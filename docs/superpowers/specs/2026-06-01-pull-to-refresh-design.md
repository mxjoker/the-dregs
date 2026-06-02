# Pull-to-Refresh — Design Spec
Date: 2026-06-01

## Overview

Add pull-to-refresh to the matches list screen so users can manually reload their matches without restarting the app.

## Scope

One file only: `app/(tabs)/two.tsx`. No new files, no DB changes, no new hooks.

## Design

### State

Add a `refreshing` boolean state alongside the existing `loading` state:

```tsx
const [refreshing, setRefreshing] = useState(false);
```

### loadMatches function

Extract the fetch logic from the current `useEffect` into a standalone `loadMatches` function so both the initial load and pull-to-refresh can call the same code:

```tsx
async function loadMatches() {
  if (!profileId) return;
  try {
    const data = await fetchMatches(profileId);
    setMatches(data);
  } catch (err) {
    console.error('fetchMatches error:', err);
  }
}
```

### Initial load

Replace the current `useEffect` body with a call to `loadMatches`:

```tsx
useEffect(() => {
  if (!profileId) { setLoading(false); return; }
  loadMatches().finally(() => setLoading(false));
}, [profileId]);
```

### Pull-to-refresh handler

```tsx
async function handleRefresh() {
  setRefreshing(true);
  await loadMatches();
  setRefreshing(false);
}
```

### FlatList refreshControl prop

```tsx
refreshControl={
  <RefreshControl
    refreshing={refreshing}
    onRefresh={handleRefresh}
    tintColor={Colors.textMuted}
  />
}
```

`tintColor` uses `Colors.textMuted` to match the app's dark palette.

## Import

Add `RefreshControl` to the existing React Native import line.

## Files Changed

| File | Change |
|------|--------|
| `app/(tabs)/two.tsx` | Add `refreshing` state, `loadMatches` fn, `handleRefresh` fn, `refreshControl` prop on FlatList |
