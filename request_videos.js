#!/usr/bin/env node

/* eslint-disable no-console */
"use strict"; // eslint-disable-line

// Script to download videos from websites.

const fs = require("fs");

const got = require("got");
const cheerio = require("cheerio");
const minimist = require("minimist");

const doesFileExist = require("./utils").doesFileExist;
const resilientDownloadURL = require("./utils").resilientDownloadURL;

// Accepts the CLI argument `limit` which can be used to configure the max number of videos to download.
const args = minimist(process.argv.slice(2), {
	default: {limit: 30}
});

// Called back with response that contains HTML for video website. Will extract the webpage's video URL
// and the next video's website URL.
function extractVideoMetadata(response) {
	let videoFileName = "";
	const videoWebsite = cheerio.load(response.body);

	const currentVideoURL = videoWebsite("meta[property='twitter:player:stream']").attr("content");
	const nextVideoHTMLURL = videoWebsite(".coming-next .video-thumb-link").attr("href");

	try {
		// The last part of the URL ("dir/videos/the_video.mp4") should contain the name of video file.
		videoFileName = currentVideoURL.split("/").pop();
	} catch (error) {
		console.error(`***** Error while extracting videoFileName from ${currentVideoURL} *****`);
		console.error(error);
		fs.writeFileSync(`error_${Date.now()}.html`, response.body);
	}

	return {currentVideoURL, nextVideoHTMLURL, videoFileName};
}

// Given the current video's metadata request the next video webpage if the download limit
// hasn't been reached.
function requestNextVideoURL(videoPageMetadata, videosMetadata) {
	videosMetadata.push(videoPageMetadata);

	if (videosMetadata.length < args.limit) {
		return getVideoMetadata(videoPageMetadata.nextVideoHTMLURL, videosMetadata); // eslint-disable-line
	}

	return videosMetadata;
}

// Until the number of videos to download count has been reached keep adding video website metadata into
// `videosMetadata` array.
function getVideoMetadata(videoHTMLURL, videosMetadata) {
	return got(videoHTMLURL)
		.then(extractVideoMetadata)
		.then((videoPageMetadata) => requestNextVideoURL(videoPageMetadata, videosMetadata));
}

// Download all the videos in the `videosMetadata` array without allowing an error in an individual
// download to stop the other downloads.
function downloadVideos(videosMetadata) {
	const videoMetadata = videosMetadata.pop();

	if (videoMetadata) {
		return resilientDownloadURL(videoMetadata.currentVideoURL, videoMetadata.videoFileName)
			.then(() => downloadVideos(videosMetadata));
	}
}

getVideoMetadata("http://video.ft.com/latest", [])
	.then((videosMetadata) => {
		const videosToDownload = videosMetadata
			.filter((videoMetadata) => !doesFileExist(videoMetadata.videoFileName))
			.filter((videoMetadata) => videoMetadata.videoFileName !== "");

		console.log(`Found ${videosToDownload.length} videos to download`);

		return downloadVideos(videosToDownload);
	})
	.catch(console.error);
