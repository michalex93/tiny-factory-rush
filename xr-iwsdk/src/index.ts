/**
 * Tiny Factory Rush XR — provisional IWSDK walking-skeleton checkpoint.
 *
 * DEVELOPMENT CHECKPOINT — NOT FINAL COMPETITION SUBMISSION.
 * D-007 remains OPEN. Quest unverified.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { FactorySystem } from './factory/FactorySystem.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(FactorySystem);
});
