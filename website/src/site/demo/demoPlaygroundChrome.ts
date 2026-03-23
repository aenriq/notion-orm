import { css } from "../../styled-system/css";

export const playgroundWrapperClass = css({
	mt: "8",
	mb: "0",
	bg: "transparent",
});

export const playgroundSectionGapClass = css({
	mt: "10",
});

export const playgroundHeaderClass = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	px: "4",
	py: "2.5",
	bg: "transparent",
	fontSize: "xs",
	color: "muted",
	letterSpacing: "0.08em",
});

export const playgroundFileLabelClass = css({
	fontFamily: "mono",
	fontSize: "xs",
	color: "text",
	fontWeight: "500",
});

export const playgroundHeaderTitleGroupClass = css({
	display: "flex",
	alignItems: "baseline",
	gap: "2",
	flexWrap: "wrap",
	minW: "0",
});

export const playgroundHeaderBulletClass = css({
	color: "muted",
	userSelect: "none",
});

export const playgroundApiReferenceLinkClass = css({
	fontFamily: "inherit",
	fontSize: "xs",
	color: "muted",
	textDecoration: "underline",
	textUnderlineOffset: "2px",
	letterSpacing: "0.06em",
	_hover: {
		color: "text",
	},
});

export const playgroundHeaderActionsClass = css({
	display: "flex",
	alignItems: "center",
	gap: "3",
});

export const playgroundResetButtonClass = css({
	fontSize: "xs",
	fontFamily: "inherit",
	color: "muted",
	backgroundColor: "transparent",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	borderRadius: "6px",
	padding: "3px 8px",
	cursor: "pointer",
	transformOrigin: "center",
	transform: "scale(1)",
	transition:
		"background-color 0.15s, border-color 0.15s, color 0.15s, transform 0.22s cubic-bezier(0.34, 1.45, 0.64, 1)",
	_hover: {
		color: "text",
		borderColor: "muted",
		backgroundColor: "background",
		transform: "scale(1.05)",
	},
	_active: {
		transform: "scale(0.96)",
		transition:
			"background-color 0.15s, border-color 0.15s, color 0.15s, transform 0.1s cubic-bezier(0.34, 1.8, 0.64, 1)",
	},
	_disabled: {
		opacity: "0.45",
		cursor: "not-allowed",
		transform: "scale(1)",
	},
});

export const playgroundEditorContainerClass = css({
	position: "relative",
	bg: "background",
	borderWidth: "1px",
	borderColor: "border",
	borderRadius: "12px",
	overflow: "hidden",
});

export const playgroundEditorContainerPlaceholderClass = css({
	minHeight: "480px",
});

export const playgroundLoadingOverlayClass = css({
	position: "absolute",
	inset: "0",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	bg: "background",
	color: "muted",
	fontFamily: "mono",
	fontSize: "sm",
	zIndex: 2,
});

export const demoPlaygroundPanelMeta = [
	{
		label: "Databases",
		resetAriaLabel: "Reset database demo to default code",
		apiReferenceHref: "/api-reference#database-client",
		apiReferenceAriaLabel: "Database client API reference",
		sectionGap: false,
	},
	{
		label: "Agents",
		resetAriaLabel: "Reset agent demo to default code",
		apiReferenceHref: "/api-reference#agent-client",
		apiReferenceAriaLabel: "Agent client API reference",
		sectionGap: true,
	},
] as const;
