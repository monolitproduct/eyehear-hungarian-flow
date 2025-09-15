#!/usr/bin/env node
/**
 * EyeHear Design Pack Applicator
 * Merges design tokens and styles into target project
 */

import fs from 'fs/promises';
import path from 'path';

const designPackDir = './design-pack';
const targetDir = '.';

async function applyDesignPack() {
  console.log('🎨 Applying EyeHear Design Pack...');

  try {
    // 1. Copy theme CSS
    const themeCss = await fs.readFile(path.join(designPackDir, 'css/theme.css'), 'utf8');
    await fs.writeFile(path.join(targetDir, 'src/styles/theme.css'), themeCss);
    
    // 2. Merge Tailwind config
    const tailwindExtend = JSON.parse(
      await fs.readFile(path.join(designPackDir, 'tokens/tailwind.theme.extend.json'), 'utf8')
    );
    
    console.log('📋 Merge this into your tailwind.config.js theme.extend:');
    console.log(JSON.stringify(tailwindExtend, null, 2));
    
    // 3. Copy component styles
    const globalsCss = await fs.readFile(path.join(designPackDir, 'css/globals.extract.css'), 'utf8');
    await fs.writeFile(path.join(targetDir, 'src/styles/components.css'), globalsCss);
    
    console.log('✅ Design pack applied successfully!');
    console.log('📖 See MIGRATION_GUIDE.md for next steps');
    
  } catch (error) {
    console.error('❌ Error applying design pack:', error);
  }
}

applyDesignPack();