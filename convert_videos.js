#!/usr/bin/env node
/*eslint-disable no-console*/
"use strict";

// Script to convert video files in the `cwd` to mp3 files.

const fs = require("fs");
const child_process = require("child_process");

// RegExp used to test if a file is a video
const videoNameRegExp = /\.mp4/;

// Retrieve all the files in the cwd.
const files = fs.readdirSync(process.cwd());

// Test if a given fileName is a video file.
function isVideoFile(fileName) {
	return fileName.match(videoNameRegExp);
}

// Given a video name create the mp3 name.
function createMp3Name(videoName) {
	// Split the name on the extension and get the first value in the array.
	const fileName = videoName.split(videoNameRegExp)[0];

	return {
		mp3Name: `${fileName}.mp3`,
		videoName: videoName
	};
}

// Given some videoData check if the mp3 file already exists.
function mp3FileNotCreated(videoData) {
	try {
		fs.statSync(videoData.mp3Name);

		// If no error was raised then the mp3 file exists so return false.
		return false;
	} catch (error) {
		return true;
	}
}

function convertVideoFile(videoData) {
	const command = "avconv";
	const args = ["-i", videoData.videoName, "-b", "320k", videoData.mp3Name];

	console.log(`Creating ${videoData.mp3Name} using ${videoData.videoName}`);

	const processObject = child_process.spawnSync(command, args);

	// If creating the child process errored, log it.
	if (processObject.error) {
		console.error(processObject.error);
	}
}

// Filter out files that aren't video files.
// Then convert the video files.
files
	.filter(isVideoFile)
	.map(createMp3Name)
	.filter(mp3FileNotCreated)
	.forEach(convertVideoFile);
