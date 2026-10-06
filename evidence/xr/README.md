# XR Evidence

Store experiment evidence here in small, reviewable records.

Recommended structure:

```
evidence/xr/
  EXP-XR-01/
    session-001.json
    session-002.json
    notes.md
  EXP-XR-02/
    ...
```

Large videos/captures should not be committed blindly. Store a stable external reference in the session JSON unless the artifact is small and useful in Git history.

Rules:
- anonymize participant IDs;
- record commit/build/hardware;
- distinguish example fixtures from real evidence;
- never manufacture missing measurements;
- keep failed experiments.
