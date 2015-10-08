#!/usr/bin/env node
"use strict";

/**
 * Script to download videos from websites.
 */

const fs = require("fs");

const got = require("got");
const cheerio = require("cheerio");

// Given a `videoURL` download it to the pwd.
function downloadVideo(videoURL) {
	// The last part of the URL ("dir/videos/the_video.mp4") should contain the name of video file.
	const videoFileName = videoURL.split("/").pop();

	got
		.stream(videoURL)
		.pipe(fs.createWriteStream(videoFileName));
}

// Called back with response that contains HTML from FT's video website.
function extractFTVideoMetaData(response) {
	const $ = cheerio.load(response.body);

	const nextVideoHTMLURL = $(".coming-next .video-thumb-link").attr("href");
	const currentVideoURL = $("meta[property='twitter:player:stream']").attr("content");

	return {currentVideoURL, nextVideoHTMLURL};
}

function getFTVideoURLs() {
	return new Promise((resolve, reject) => {
		return got("http://video.ft.com/latest")
			.then(extractFTVideoMetaData)
			.then(resolve)
			.catch(reject);
	});
}

getFTVideoURLs()
	/*eslint-disable no-console*/
	.then(metadata => {
		console.log(metadata);

		downloadVideo(metadata.currentVideoURL);
	})
	.catch(console.error);
	/*eslint-enable no-console*/
