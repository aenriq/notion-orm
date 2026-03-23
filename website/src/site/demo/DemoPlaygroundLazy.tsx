"use client";

import dynamic from "next/dynamic";
import { DemoPlaygroundSkeleton } from "./DemoPlaygroundSkeleton";

const LazyPlayground = dynamic(
	() =>
		import("./DemoPlayground").then((mod) => ({
			default: mod.DemoPlayground,
		})),
	{
		ssr: false,
		loading: () => <DemoPlaygroundSkeleton />,
	},
);

export function DemoPlaygroundLazy() {
	return <LazyPlayground />;
}
