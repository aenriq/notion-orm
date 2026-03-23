import { tags as t } from "@lezer/highlight";
import { createTheme } from "thememirror";

export const cmOneDarkTheme = createTheme({
	variant: "dark",
	settings: {
		background: "var(--colors-background)",
		foreground: "var(--colors-code-text)",
		caret: "var(--colors-text)",
		selection: "#3e4451",
		lineHighlight: "#2c313a",
		gutterBackground: "var(--colors-background)",
		gutterForeground: "var(--colors-muted)",
	},
	styles: [
		{
			tag: [t.comment, t.docComment],
			color: "#5c6370",
			fontStyle: "italic",
		},
		{
			tag: [t.keyword, t.operatorKeyword, t.controlKeyword, t.definitionKeyword],
			color: "#c678dd",
		},
		{
			tag: [t.modifier, t.moduleKeyword],
			color: "#e06c75",
		},
		{
			tag: [t.string, t.special(t.brace), t.regexp, t.escape],
			color: "#98c379",
		},
		{
			tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom, t.unit],
			color: "#d19a66",
		},
		{
			tag: [t.className, t.typeName, t.namespace],
			color: "#e5c07b",
		},
		{
			tag: [
				t.function(t.variableName),
				t.function(t.propertyName),
				t.labelName,
				t.macroName,
			],
			color: "#61afef",
		},
		{
			tag: [t.propertyName, t.attributeName, t.constant(t.name), t.color],
			color: "#d19a66",
		},
		{
			tag: [t.variableName, t.self, t.special(t.variableName)],
			color: "#e06c75",
		},
		{
			tag: [t.standard(t.variableName), t.definition(t.variableName)],
			color: "#e5c07b",
		},
		{
			tag: [t.operator, t.punctuation, t.separator, t.bracket],
			color: "#abb2bf",
		},
		{
			tag: [t.meta, t.annotation, t.processingInstruction],
			color: "#56b6c2",
		},
		{
			tag: t.invalid,
			color: "#ffffff",
			backgroundColor: "#e06c75",
		},
	],
});
