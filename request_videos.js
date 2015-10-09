#!/usr/bin/env node
/*eslint-disable no-console*/
"use strict";

// Script to download videos from websites.

const fs = require("fs");

const got = require("got");
const cheerio = require("cheerio");
const minimist = require("minimist");

// Accepts the CLI argument `n` which can be used to configure the max number of videos to download.
const args = minimist(process.argv.slice(2), {
	default: {n: 30}
});

// Given a `videoURL` download it to the cwd.
// function downloadVideo(videoURL, videoFileName) {
// 	got
// 		.stream(videoURL)
// 		.pipe(fs.createWriteStream(videoFileName));
// }

// Called back with response that contains HTML from FT's video website. Will extract the webpage's video URL
// and the next video's website URL.
function extractFTVideoMetadata(response) {
	const $ = cheerio.load(response.body);

	const nextVideoHTMLURL = $(".coming-next .video-thumb-link").attr("href");
	const currentVideoURL = $("meta[property='twitter:player:stream']").attr("content");
	// The last part of the URL ("dir/videos/the_video.mp4") should contain the name of video file.
	const videoFileName = currentVideoURL.split("/").pop();

	return {currentVideoURL, nextVideoHTMLURL, videoFileName};
}

// Check if a file exists.
function doesFileExist(fileName) {
	try {
		fs.statSync(fileName);

		// If no error was raised the file exists.
		return true;
	} catch (error) {
		return false;
	}
}

//
function requestNextVideoURL(videosMetadata, resolve, reject) {
	return (videoPageMetadata) => {
		const videoFileExists = doesFileExist(videoPageMetadata.videoFileName);

		if (videoFileExists) {
			console.log(`Video ${videoPageMetadata.videoFileName} already exists.`);

			resolve(videosMetadata);
		} else {
			videosMetadata.push(videoPageMetadata);

			if (videosMetadata.length < args.n) {
				getFTVideosMetadata(videoPageMetadata.nextVideoHTMLURL, videosMetadata)
					.then(resolve)
					.catch(reject);
			} else {
				resolve(videosMetadata);
			}
		}
	};
}

// Will push into the `videosMetadata` array video website metadata until the maximum number of videos to download
// limit has been reached.
function getFTVideosMetadata(videoHTMLURL, videosMetadata) {
	return new Promise((resolve, reject) => {
		got(videoHTMLURL)
			.then(extractFTVideoMetadata)
			.then(requestNextVideoURL(videosMetadata, resolve, reject))
			.catch(reject);
	});
}

getFTVideosMetadata("http://video.ft.com/latest", [])
	.then(metadata => {
		console.log(metadata);

		// downloadVideo(metadata.currentVideoURL, metadata.videoFileName);
	})
	.catch(console.error);
