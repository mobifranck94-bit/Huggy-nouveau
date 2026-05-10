/**
 * Visual Builder - Public API
 * 
 * Usage in App.tsx:
 *   import { VisualBuilder } from './components/visual';
 *   
 *   <VisualBuilder
 *     initialCode={generatedCode}
 *     fileName="App.tsx"
 *     onCodeChange={(newCode) => updateFile(newCode)}
 *     onClose={() => setMode('code')}
 *   />
 */

export { VisualBuilder } from './VisualBuilder';
export { VisualCanvas } from './VisualCanvas';
export { ComponentPalette, TEMPLATES } from './ComponentPalette';
export { PropertyPanel } from './PropertyPanel';
