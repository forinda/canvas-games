import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	eslintConfigPrettier,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/consistent-type-imports": "error",
			"no-console": "warn",

			// Padding between blocks for readability
			"padding-line-between-statements": [
				"error",
				// Blank line before return
				{ blankLine: "always", prev: "*", next: "return" },
				// Blank line after variable declarations
				{
					blankLine: "always",
					prev: ["const", "let", "var"],
					next: "*",
				},
				{
					blankLine: "any",
					prev: ["const", "let", "var"],
					next: ["const", "let", "var"],
				},
				// Blank line before/after block statements
				{
					blankLine: "always",
					prev: "*",
					next: ["if", "for", "while", "switch", "try", "class"],
				},
				{
					blankLine: "always",
					prev: ["if", "for", "while", "switch", "try", "class"],
					next: "*",
				},
				// Blank line before/after functions
				{
					blankLine: "always",
					prev: "*",
					next: ["function", "export"],
				},
				{
					blankLine: "always",
					prev: ["function", "export"],
					next: "*",
				},
				{
					blankLine: "any",
					prev: "export",
					next: "export",
				},
			],
		},
	},
	{
		ignores: ["dist/", "node_modules/", "*.js"],
	},
);
