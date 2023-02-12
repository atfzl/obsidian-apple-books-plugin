import * as fs from "fs/promises";
import * as path from "path";

import { Notice, Plugin } from "obsidian";

const APPLE_BOOKS_DATA_FOLDER_ABSOLUTE_PATH = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/`;

const ANNOTATION_DB_FOLDER_ABSOLUTE_PATH = path.join(
	APPLE_BOOKS_DATA_FOLDER_ABSOLUTE_PATH,
	"AEAnnotation"
);
const BOOKS_DB_FOLDER_ABSOLUTE_PATH = path.join(
	APPLE_BOOKS_DATA_FOLDER_ABSOLUTE_PATH,
	"BKLibrary"
);

export default class AppleBooksPlugin extends Plugin {
	async onload() {
		const annotationDBFolderFiles = await fs.readdir(
			ANNOTATION_DB_FOLDER_ABSOLUTE_PATH
		);
		const annotationDBFileName = annotationDBFolderFiles
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();
		console.log({ annotationDBFileName });

		const booksDBFolderFiles = await fs.readdir(
			BOOKS_DB_FOLDER_ABSOLUTE_PATH
		);
		const booksDBFileName = booksDBFolderFiles
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();
		console.log({ booksDBFileName });

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
