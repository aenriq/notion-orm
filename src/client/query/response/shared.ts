export function resolveUserNameOrId(user: unknown): string | null {
	if (!user || typeof user !== "object") {
		return null;
	}

	if (
		"name" in user &&
		typeof user.name === "string" &&
		user.name.length > 0
	) {
		return user.name;
	}

	if ("id" in user && typeof user.id === "string") {
		return user.id;
	}

	return null;
}

export function resolveFormulaValue(formula: unknown) {
	if (!formula || typeof formula !== "object" || !("type" in formula)) {
		return null;
	}

	switch (formula.type) {
		case "string":
			return "string" in formula && typeof formula.string === "string"
				? formula.string
				: null;
		case "number":
			return "number" in formula && typeof formula.number === "number"
				? formula.number
				: null;
		case "boolean":
			return "boolean" in formula && typeof formula.boolean === "boolean"
				? formula.boolean
				: null;
		case "date": {
			if (
				"date" in formula &&
				formula.date &&
				typeof formula.date === "object" &&
				"start" in formula.date &&
				typeof formula.date.start === "string"
			) {
				return {
					start: formula.date.start,
					end:
						"end" in formula.date && typeof formula.date.end === "string"
							? formula.date.end
							: undefined,
				};
			}
			return null;
		}
		default:
			return null;
	}
}

export function resolveFilesValue(files: unknown) {
	if (!Array.isArray(files)) {
		return [];
	}

	return files
		.map((file) => {
			if (typeof file.name !== "string") {
				return undefined;
			}

			let url: string | undefined;
			if (file.type === "external") {
				url = file.external?.url;
			} else if (file.type === "file") {
				url = file.file?.url;
			}

			if (typeof url !== "string") {
				return undefined;
			}

			return {
				name: file.name,
				url,
			};
		})
		.filter(
			(value): value is { name: string; url: string } => value !== undefined,
		);
}
