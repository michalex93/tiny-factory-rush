/**
 * Tiny Factory Rush XR — IWSDK interaction kill-test entry.
 *
 * Official scaffold: npm create @iwsdk@latest (@iwsdk/create 1.0.1)
 * Target: AR/MR + grabbing + scene understanding + environment raycast.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { KillTestSystem } from './killtest/KillTestSystem.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(KillTestSystem);
});
