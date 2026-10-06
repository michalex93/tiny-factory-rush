---
name: xr-interaction-review
description: Use for grab, snap, rotate, route, gaze, hand loss, menus and any hands-first interaction.
---
<!-- Generated from skills/xr-interaction-review/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: XR Interaction Review

## Core rule
Design for **intent**, then measure it.

Do not copy gesture families or timing constants from another winner simply because they worked there.

## Procedure
1. Confirm task is completable hands-first.
2. Prefer direct physical action when it matches the fantasy.
3. Make targets/tolerance forgiving before inventing new gestures.
4. Keep intent-history window configurable.
5. Handle brief tracking loss and reacquisition explicitly.
6. Arbitrate direct manipulation vs ray/gaze contextually.
7. Use distinct gestures for distinct actions.
8. Log:
   - intended attempts;
   - successful intended actions;
   - false activations;
   - unintended releases;
   - tracking-loss/recovery;
   - material errors.
9. Observe naive users' natural grab/action behavior before adding extra pose families.
10. Test real hardware before "done".

## Gaze
Gaze/head-gaze + pinch is a secondary path unless evidence proves it should dominate.
Never make unsupported eye tracking mandatory on Quest 3/3S.

## Review questions
- Can user discover the action without technical text?
- Is failure likely to feel like player error or system error?
- Is precision beyond what tracking comfortably supports?
- Does the action repeat too fast/frequently for session comfort?
- Can user recover immediately?
- Is this action materially better in MR than with a mouse?

## Required evidence
Capture + session data including intended-action success and false activations.

## Stop condition
Interaction meets its experiment gate or is simplified/pivoted.
