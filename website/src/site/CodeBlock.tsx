"use client";

import { IconCheckmark1Small } from "@central-icons-react/round-outlined-radius-3-stroke-2/IconCheckmark1Small";
import { IconClipboard } from "@central-icons-react/round-outlined-radius-3-stroke-2/IconClipboard";
import {
	type FC,
	isValidElement,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { css, cx } from "../styled-system/css";

interface CodeBlockProps {
	children?: ReactNode;
}

interface CodeBlockData {
	code: string;
	fileLabel: string | null;
	caption: string | null;
}

const jsFamilyLanguages = new Set([
	"ts",
	"tsx",
	"js",
	"jsx",
	"typescript",
	"javascript",
]);

function normalizeCaption(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function inferCaptionFromCode(
	code: string,
	language: string | null,
): { fileLabel: string | null; caption: string | null; code: string } {
	if (!language) {
		return { fileLabel: null, caption: null, code };
	}

	if (!jsFamilyLanguages.has(language.toLowerCase())) {
		return { fileLabel: null, caption: null, code };
	}

	const lines = code.split("\n");
	const directiveLineRegex = /^\/\/\s*(.+)\s*$/;
	const explicitCaptionRegex = /^(?:@?caption)\s*:\s*(.+)$/;
	const explicitFileRegex = /^(?:@?file)\s*:\s*(.+)$/;
	const filenameOnlyRegex = /^([A-Za-z0-9._/-]+\.[A-Za-z0-9]+(?:\s*\(.+\))?)$/;

	let fileLabel: string | null = null;
	let caption: string | null = null;
	let consumedDirectiveLines = 0;

	for (const line of lines) {
		const trimmed = line.trim();
		const directiveMatch = directiveLineRegex.exec(trimmed);
		if (!directiveMatch) {
			break;
		}

		const value = directiveMatch[1].trim();
		const fileMatch = explicitFileRegex.exec(value);
		if (fileMatch) {
			fileLabel = fileMatch[1].trim();
			consumedDirectiveLines += 1;
			continue;
		}

		const captionMatch = explicitCaptionRegex.exec(value);
		if (captionMatch) {
			caption = captionMatch[1].trim();
			consumedDirectiveLines += 1;
			continue;
		}

		const filenameMatch = filenameOnlyRegex.exec(value);
		if (filenameMatch) {
			fileLabel = filenameMatch[1].trim();
			consumedDirectiveLines += 1;
			continue;
		}

		break;
	}

	if (consumedDirectiveLines === 0) {
		return { fileLabel: null, caption: null, code };
	}

	const remaining = lines.slice(consumedDirectiveLines);
	if (remaining[0]?.trim() === "") {
		remaining.shift();
	}

	return { fileLabel, caption, code: remaining.join("\n") };
}

function getCodeBlockData(children: ReactNode): CodeBlockData | null {
	if (!isValidElement<Record<string, unknown>>(children)) {
		return null;
	}

	const className =
		typeof children.props.className === "string"
			? children.props.className
			: null;
	const language = className?.startsWith("language-")
		? className.replace("language-", "")
		: null;
	const explicitCaption =
		normalizeCaption(children.props["data-caption"]) ??
		normalizeCaption(children.props.title);
	const explicitFileLabel = normalizeCaption(children.props["data-file"]);
	const nestedChildren = children.props.children;

	if (typeof nestedChildren === "string") {
		const inferred = inferCaptionFromCode(nestedChildren, language);
		return {
			code: inferred.code,
			fileLabel: explicitFileLabel ?? inferred.fileLabel,
			caption: explicitCaption ?? inferred.caption,
		};
	}

	if (Array.isArray(nestedChildren)) {
		const textParts = nestedChildren.filter(
			(value): value is string => typeof value === "string",
		);
		const inferred = inferCaptionFromCode(textParts.join(""), language);

		return {
			code: inferred.code,
			fileLabel: explicitFileLabel ?? inferred.fileLabel,
			caption: explicitCaption ?? inferred.caption,
		};
	}

	return null;
}

const codeBlockFallbackPreClass = css({
	fontFamily: "mono",
	fontSize: "sm",
	lineHeight: "1.75",
	bg: "transparent",
	color: "text",
	borderWidth: "1px",
	borderColor: "border",
	borderRadius: "md",
	p: "6",
	overflowX: "auto",
	my: "6",
});

const codeBlockWrapperClass = css({
	mt: "6",
});

const codeBlockWrapperWithCaptionClass = css({
	mb: "8",
});

const codeBlockWrapperWithoutCaptionClass = css({
	mb: "6",
});

const codeBlockRevealOnHoverClass = css({
	position: "relative",
	_hover: {
		"& [data-code-copy-wrap]": {
			opacity: 1,
			pointerEvents: "auto",
		},
	},
});

const codeBlockContainerClass = css({
	borderWidth: "1px",
	borderColor: "border",
	borderTopRadius: "12px",
	borderBottomRadius: "16px",
	overflow: "hidden",
	bg: "transparent",
});

const codeBlockHeaderClass = css({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	px: "4",
	py: "2.5",
	bg: "inlineCodeBg",
	borderBottomWidth: "1px",
	borderBottomColor: "border",
	fontSize: "xs",
	color: "muted",
	letterSpacing: "0.08em",
	columnGap: "3",
	minH: "9",
});

const codeBlockPreClass = css({
	m: "0",
	px: "6",
	py: "5",
	overflowX: "auto",
	fontFamily: "mono",
	fontSize: "sm",
	lineHeight: "1.75",
	color: "text",
});

const codeBlockCaptionClass = css({
	mt: "2.5",
	display: "block",
	width: "100%",
	boxSizing: "border-box",
	fontSize: "sm",
	lineHeight: "1.6",
	color: "text",
	opacity: 0.7,
	bg: "inlineCodeBg",
	p: "6px",
	borderRadius: "2px",
});

const copyButtonWrapClass = css({
	position: "relative",
	flexShrink: 0,
	opacity: 0,
	pointerEvents: "none",
	transitionProperty: "opacity",
	transitionDuration: "0.15s",
	transitionTimingFunction: "ease",
});

const copyButtonClass = css({
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	w: "8",
	h: "8",
	p: "0",
	m: "0",
	borderWidth: "0",
	borderRadius: "md",
	cursor: "pointer",
	color: "muted",
	bg: "transparent",
	transitionProperty: "transform, color",
	transitionDuration: "0.15s",
	transitionTimingFunction: "ease",
	_hover: {
		color: "inlineCodeText",
		transform: "scale(1.08)",
	},
	_active: {
		transform: "scale(0.96)",
	},
});

const copyIconLayerClass = css({
	position: "absolute",
	inset: "0",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	transitionProperty: "opacity, transform",
	transitionDuration: "0.2s",
	transitionTimingFunction: "ease",
});

const COPY_SUCCESS_MS = 600;

export const CodeBlock: FC<CodeBlockProps> = ({ children }) => {
	const blockData = getCodeBlockData(children);
	const [copied, setCopied] = useState(false);
	const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearResetTimer = useCallback(() => {
		if (resetTimerRef.current !== null) {
			clearTimeout(resetTimerRef.current);
			resetTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			clearResetTimer();
		};
	}, [clearResetTimer]);

	const handleCopy = useCallback(async () => {
		if (!blockData) {
			return;
		}
		try {
			await navigator.clipboard.writeText(blockData.code);
		} catch {
			return;
		}
		clearResetTimer();
		setCopied(true);
		resetTimerRef.current = setTimeout(() => {
			setCopied(false);
			resetTimerRef.current = null;
		}, COPY_SUCCESS_MS);
	}, [blockData, clearResetTimer]);

	if (!blockData) {
		return <pre className={codeBlockFallbackPreClass}>{children}</pre>;
	}

	const hasCaption = blockData.caption !== null;
	const titleLabel = blockData.fileLabel ?? "Example";

	return (
		<div
			className={cx(
				codeBlockWrapperClass,
				codeBlockRevealOnHoverClass,
				hasCaption
					? codeBlockWrapperWithCaptionClass
					: codeBlockWrapperWithoutCaptionClass,
			)}>
			<div className={codeBlockContainerClass}>
				<div className={codeBlockHeaderClass}>
					<span>{titleLabel}</span>
					<div data-code-copy-wrap className={copyButtonWrapClass}>
						<button
							type="button"
							className={copyButtonClass}
							aria-label={copied ? "Copied" : "Copy code"}
							onClick={handleCopy}>
							<span
								className={copyIconLayerClass}
								style={{
									opacity: copied ? 0 : 1,
									transform: copied ? "scale(0.85)" : "scale(1)",
									pointerEvents: copied ? "none" : "auto",
								}}>
								<IconClipboard size={16} aria-hidden />
							</span>
							<span
								className={copyIconLayerClass}
								style={{
									opacity: copied ? 1 : 0,
									transform: copied ? "scale(1)" : "scale(0.85)",
									pointerEvents: copied ? "auto" : "none",
								}}>
								<IconCheckmark1Small size={18} aria-hidden />
							</span>
						</button>
					</div>
				</div>
				<pre className={codeBlockPreClass}>
					<code>{blockData.code}</code>
				</pre>
			</div>
			{hasCaption && (
				<p className={codeBlockCaptionClass}>{blockData.caption}</p>
			)}
		</div>
	);
};
