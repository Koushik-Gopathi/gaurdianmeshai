import { Module } from '@nitrostack/core';
import { ScreenTools } from './screen.tools.js';
import { ScreenResources } from './screen.resources.js';
import { ScreenPrompts } from './screen.prompts.js';

@Module({
  name: 'screen',
  description: 'TODO: Add description',
  controllers: [ScreenTools, ScreenResources, ScreenPrompts],
})
export class ScreenModule {}
