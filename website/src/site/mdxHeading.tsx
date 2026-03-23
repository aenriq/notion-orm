"use client";

import { createElement, type FC, type HTMLAttributes } from "react";

function makeHeading(
	tag: "h1" | "h2" | "h3" | "h4",
): FC<HTMLAttributes<HTMLHeadingElement>> {
	return function Heading(props) {
		return createElement(tag, props, props.children);
	};
}

export const MdxHeading1 = makeHeading("h1");
export const MdxHeading2 = makeHeading("h2");
export const MdxHeading3 = makeHeading("h3");
export const MdxHeading4 = makeHeading("h4");
