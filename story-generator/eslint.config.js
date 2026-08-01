// eslint.config.js — flat config (ESLint 9+)
// Migrated from the legacy eslintrc.js format.
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
	{
		ignores: ["dist/**", "node_modules/**"],
	},
	js.configs.recommended,
	{
		// Node.js runtime globals (this package targets the Lambda Node runtime).
		languageOptions: {
			globals: {
				console: "readonly",
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
				URL: "readonly",
				TextEncoder: "readonly",
				TextDecoder: "readonly",
			},
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: "module",
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			// TypeScript performs this check itself; the base rule misfires on
			// type-only and ambient declarations.
			"no-undef": "off",
		},
	},
];
