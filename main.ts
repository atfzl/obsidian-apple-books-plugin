import * as fs from "fs/promises";

import { Notice, Plugin } from "obsidian";

const ANNOTATION_DB_FOLDER_ABSOLUTE_PATH = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation`;

export default class AppleBooksPlugin extends Plugin {
	async onload() {
		const result = await fs.readdir(ANNOTATION_DB_FOLDER_ABSOLUTE_PATH);

		const annotationDB = result
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();

		console.log(annotationDB);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("dice", "Sample Plugin", (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice("This is a notice!");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}
}
