import { exec as execCB } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";

import { Notice, Plugin } from "obsidian";

const exec = promisify(execCB);

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

		if (!annotationDBFileName) {
			return;
		}

		const annotationDBAbsoluteFileName = path.join(
			ANNOTATION_DB_FOLDER_ABSOLUTE_PATH,
			annotationDBFileName
		);
		console.log({ annotationDBAbsoluteFileName });

		const booksDBFolderFiles = await fs.readdir(
			BOOKS_DB_FOLDER_ABSOLUTE_PATH
		);
		const booksDBFileName = booksDBFolderFiles
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();

		if (!booksDBFileName) {
			return;
		}

		const booksDBAbsoluteFileName = path.join(
			BOOKS_DB_FOLDER_ABSOLUTE_PATH,
			booksDBFileName
		);
		console.log({ booksDBAbsoluteFileName });

		const annotationDataSelectQuery =
			"SELECT ZANNOTATIONASSETID,ZANNOTATIONUUID,ZANNOTATIONSELECTEDTEXT from ZAEANNOTATION where ZANNOTATIONDELETED = 0 AND ZANNOTATIONSELECTEDTEXT NOT NULL;";
		const separatorConfig = '-cmd ".separator ||| @@@"';
		const annotationDBResult = await exec(
			`sqlite3 --readonly ${separatorConfig} ${annotationDBAbsoluteFileName} "${annotationDataSelectQuery}"`
		);

		const annotationDBRawRows = annotationDBResult.stdout
			.split("@@@")
			.filter((a) => !!a);

		const annotationData = annotationDBRawRows.map((row) =>
			row.split("|||")
		);

		console.log({ annotationData });

		const uniqueBookIds = Array.from(
			new Set(annotationData.map((row) => row[0]))
		).map((a) => `'${a}'`);

		const booksDataSelectQuery = `SELECT ZASSETID,ZAUTHOR,ZTITLE from ZBKLIBRARYASSET where ZASSETID in (${uniqueBookIds.join(
			","
		)})`;

		const booksDBResult = await exec(
			`sqlite3 --readonly ${separatorConfig} ${booksDBAbsoluteFileName} "${booksDataSelectQuery}"`
		);

		const booksDBRawRows = booksDBResult.stdout
			.split("@@@")
			.filter((a) => !!a);
		const booksData = booksDBRawRows.map((row) => row.split("|||"));

		console.log({ booksData });

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
