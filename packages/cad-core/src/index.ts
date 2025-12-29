/**
 * @rapidtool/cad-core
 * 
 * Core CAD operations and utilities for building CAD applications.
 * This package contains pure logic with no React dependencies.
 * 
 * Features:
 * - Transform system (TransformController, presets, constraints)
 * - CSG engine (boolean operations via web workers)
 * - Coordinate utilities (CAD <-> Three.js conversion)
 * - CAD operations (geometry manipulation)
 */

// Transform System
export * from './transform';

// CSG Engine
export * from './csg';

// Utilities
export * from './utils';

// CAD Operations
export * from './cad';
