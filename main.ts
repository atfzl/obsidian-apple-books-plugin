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
		this.addCommand({
			id: "obsidian-apple-books-plugin-sync-highlights",
			name: "Sync highlights",
			callback: () => {
				this.syncHighlights();
			},
		});

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("book", "Apple Books Sync Highlights", () => {
			this.syncHighlights();
		});
	}
	onunload() {}

	private async syncHighlights() {
		const annotationDBFolderFiles = await fs
			.readdir(ANNOTATION_DB_FOLDER_ABSOLUTE_PATH)
			.catch(() => []);
		const annotationDBFileName = annotationDBFolderFiles
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();

		if (!annotationDBFileName) {
			new Notice(
				"Apple Books Annotation Database not found, cannot sync."
			);
			return;
		}

		const annotationDBAbsoluteFileName = path.join(
			ANNOTATION_DB_FOLDER_ABSOLUTE_PATH,
			annotationDBFileName
		);

		const booksDBFolderFiles = await fs
			.readdir(BOOKS_DB_FOLDER_ABSOLUTE_PATH)
			.catch(() => []);
		const booksDBFileName = booksDBFolderFiles
			.filter((fileName) => fileName.endsWith(".sqlite"))
			.first();

		if (!booksDBFileName) {
			new Notice("Apple Books Books Database not found, cannot sync.");
			return;
		}

		const booksDBAbsoluteFileName = path.join(
			BOOKS_DB_FOLDER_ABSOLUTE_PATH,
			booksDBFileName
		);

		const annotationDataSelectQuery =
			"SELECT ZANNOTATIONASSETID,ZANNOTATIONUUID,ZANNOTATIONSELECTEDTEXT from ZAEANNOTATION where ZANNOTATIONDELETED = 0 AND ZANNOTATIONSELECTEDTEXT NOT NULL;";
		const separatorConfig = '-cmd ".separator ||| @@@"';
		const annotationDBResult = await exec(
			`sqlite3 --readonly ${separatorConfig} ${annotationDBAbsoluteFileName} "${annotationDataSelectQuery}"`
		);

		const annotationDBRawRows = annotationDBResult.stdout
			.split("@@@")
			.filter((a) => !!a);

		interface HighlightData {
			annotationId: string;
			selectedText: string;
		}

		const annotationData = annotationDBRawRows
			.map((row) => row.split("|||"))
			.reduce((acc, row) => {
				if (!acc[row[0]]) {
					acc[row[0]] = [];
				}
				acc[row[0]].push({
					annotationId: row[1],
					selectedText: row[2],
				});
				return acc;
			}, {} as Record<string, Array<HighlightData>>);

		const uniqueBookIds = Object.keys(annotationData).map((a) => `'${a}'`);

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

		const finalData: Record<
			string,
			{
				bookId: string;
				authorName: string;
				bookTitle: string;
				highlights: Array<HighlightData>;
			}
		> = {};
		for (const bookData of booksData) {
			const bookId = bookData[0];
			// ignore highlights for books which are no longer in library
			if (!annotationData[bookId]) {
				continue;
			}
			finalData[bookId] = {
				bookId,
				authorName: bookData[1],
				bookTitle: bookData[2],
				highlights: annotationData[bookId],
			};
		}

		const highlightsFolder = "Apple Books Highlights";

		const highlightsFolderAbstractFile =
			this.app.vault.getAbstractFileByPath(highlightsFolder);
		if (highlightsFolderAbstractFile) {
			await this.app.vault.delete(highlightsFolderAbstractFile, true);
		}
		await this.app.vault.createFolder(highlightsFolder);

		for (const [, book] of Object.entries(finalData)) {
			await this.app.vault.create(
				`${highlightsFolder}/${book.bookTitle}.md`,
				`## Metadata\n- Author: ${
					book.authorName
				}\n- [Apple Books Link](ibooks://assetid/${
					book.bookId
				})\n\n## Highlights\n${book.highlights
					.map((highlight) => highlight.selectedText)
					.join("\n\n---\n")}`
			);
		}

		new Notice("Successfully finished Apple Books Highlight Sync");
	}
}
