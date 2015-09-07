#!/usr/bin/env node
"use strict";

//
// Script to convert video files in the `cwd` to mp3 files.
//

var fs = require("fs");
var child_process = require("child_process");

// RegExp used to test if a file is a video
var videoNameRegExp = /\.mp4/;

// Retrieve all the files in the cwd.
var files = fs.readdirSync(process.cwd());

// Test if a given fileName is a video file.
function isVideoFile(fileName) {
	return fileName.match(videoNameRegExp);
}

// Given a video name create the mp3 name.
function createMp3Name(videoName) {
	// Split the name on the extension and get the first value in the array.
	var fileName = videoName.split(videoNameRegExp)[0];

	return {
		mp3Name: fileName + ".mp3",
		videoName: videoName
	};
}

// Given some videoData check if the mp3 file already exists.
function mp3FileNotCreated(videoData) {
	try {
		var fileStats = fs.statSync(videoData.mp3Name);

		// If no error was raised then the mp3 file exists so return false.
		return false;
	} catch (e) {
	}

	return true;
}

function convertVideoFile(videoData) {
	var command = "avconv";
	var args = ["-i", videoData.videoName, "-b", "320k", videoData.mp3Name];

	console.log("Creating ", videoData.mp3Name, " using ", videoData.videoName);

	var processObject = child_process.spawnSync(command, args);

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
