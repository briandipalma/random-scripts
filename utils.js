/* eslint-disable no-console */
"use strict"; // eslint-disable-line

const fs = require("fs");

const got = require("got");

// Given a `videoURL` download it to the cwd.
module.exports.downloadURL = function downloadURL(resourceURL, resourceFileName) {
	return new Promise((resolve, reject) => {
		const fileWriteStream = fs.createWriteStream(resourceFileName);
		const readableResourceStream = got.stream(resourceURL);

		readableResourceStream.on("error", reject);
		fileWriteStream.on("error", reject);
		fileWriteStream.on("finish", resolve);

		console.log(`Downloading ${resourceFileName} from ${resourceURL}`);

		readableResourceStream.pipe(fileWriteStream);
	});
};

// Check if a file exists.
module.exports.doesFileExist = function doesFileExist(fileName) {
	try {
		fs.statSync(fileName);
	} catch (error) {
		return false;
	}

	// If no error was raised the file exists.
	return true;
};

// Log an error showing why a download failed but don't reject the download `Promise`.
module.exports.resilientDownloadURL = function resilientDownloadURL(resourceURL, resourceFileName) {
	return module.exports.downloadURL(resourceURL, resourceFileName)
		.then(
			() => console.log(`Succesfully downloaded ${resourceURL} to ${resourceFileName}.`),
			(error) => {
				console.error(`****** Downloading ${resourceURL} to ${resourceFileName} failed! *****`);
				console.error(error);
			}
		);
};
