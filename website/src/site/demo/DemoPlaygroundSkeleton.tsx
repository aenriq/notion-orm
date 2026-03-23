import Link from "next/link";
import { cx } from "../../styled-system/css";
import { DEMO_PLAYGROUND_RESET_BUTTON_CLASS } from "../siteClassNames";
import {
	demoPlaygroundPanelMeta,
	playgroundApiReferenceLinkClass,
	playgroundEditorContainerClass,
	playgroundEditorContainerPlaceholderClass,
	playgroundFileLabelClass,
	playgroundHeaderActionsClass,
	playgroundHeaderBulletClass,
	playgroundHeaderClass,
	playgroundHeaderTitleGroupClass,
	playgroundLoadingOverlayClass,
	playgroundResetButtonClass,
	playgroundSectionGapClass,
	playgroundWrapperClass,
} from "./demoPlaygroundChrome";

export function DemoPlaygroundSkeleton() {
	return (
		<>
			{demoPlaygroundPanelMeta.map((panel) => (
				<div
					key={panel.label}
					className={cx(
						playgroundWrapperClass,
						panel.sectionGap && playgroundSectionGapClass,
					)}>
					<div className={playgroundHeaderClass}>
						<div className={playgroundHeaderTitleGroupClass}>
							<span className={playgroundFileLabelClass}>{panel.label}</span>
							<span className={playgroundHeaderBulletClass} aria-hidden>
								·
							</span>
							<Link
								href={panel.apiReferenceHref}
								className={playgroundApiReferenceLinkClass}
								aria-label={panel.apiReferenceAriaLabel}>
								Docs
							</Link>
						</div>
						<div className={playgroundHeaderActionsClass}>
							<button
								type="button"
								className={cx(
									playgroundResetButtonClass,
									DEMO_PLAYGROUND_RESET_BUTTON_CLASS,
								)}
								disabled
								aria-label={panel.resetAriaLabel}>
								Reset
							</button>
						</div>
					</div>
					<div
						className={cx(
							playgroundEditorContainerClass,
							playgroundEditorContainerPlaceholderClass,
						)}>
						<div className={playgroundLoadingOverlayClass}>
							Loading playground…
						</div>
					</div>
				</div>
			))}
		</>
	);
}
