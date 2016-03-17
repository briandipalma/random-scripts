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
// Pretend this is a database.
const DOWNLOADED_FILES_DATABASE = "downloaded-ft-videos.json";

// Once Promises are added to the node API this can be handled more elegantly.
function getPreviouslyDownloadedFiles() {
	try {
		return JSON.parse(fs.readFileSync(DOWNLOADED_FILES_DATABASE));
	} catch (error) {
		return {};
	}
}

const previouslyDownloadedFiles = getPreviouslyDownloadedFiles();

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
		const failedDownloadPageURL = videoWebsite("link[rel='canonical']").attr("href");

		console.error(`***** Error while extracting videoFileName from ${failedDownloadPageURL} *****`);
		console.error(error);

		if (previouslyDownloadedFiles.failedDownloads[failedDownloadPageURL] === undefined) {
			fs.writeFileSync(`error_${Date.now()}.html`, response.body);
			previouslyDownloadedFiles.failedDownloads[failedDownloadPageURL] = true;
		}
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
	const nextVideoMetadata = (videoPageMetadata) => requestNextVideoURL(videoPageMetadata, videosMetadata);
	const videoWebpageHTML = got(videoHTMLURL);
	const videoWebpageMetadata = videoWebpageHTML.then(extractVideoMetadata);

	return videoWebpageMetadata.then(nextVideoMetadata);
}

// Download all the videos in the `videosMetadata` array without allowing an error in an individual
// download to stop the other downloads.
function downloadVideos(videosMetadata) {
	const videoMetadata = videosMetadata.pop();

	if (videoMetadata) {
		const downloadSuccesful = (videoFileName) => previouslyDownloadedFiles[videoFileName] = true;
		const downloadNextVideo = () => downloadVideos(videosMetadata);
		const resilientVideoDownload = resilientDownloadURL(
			videoMetadata.currentVideoURL, videoMetadata.videoFileName, downloadSuccesful
		);

		return resilientVideoDownload.then(downloadNextVideo);
	}
}

// Filter out any videos with invalid/incomplete metadata or which have already been downloaded
// and download the remaining ones.
function downloadNewValidVideos(videosMetadata) {
	const videosToDownload = videosMetadata
		.filter((videoMetadata) => !doesFileExist(videoMetadata.videoFileName))
		.filter((videoMetadata) => videoMetadata.videoFileName !== "")
		.filter((videoMetadata) => previouslyDownloadedFiles[videoMetadata.videoFileName] === undefined);

	console.log(`Found ${videosToDownload.length} videos to download`);

	return downloadVideos(videosToDownload);
}

function storeDownloadedVideos() {
	fs.writeFileSync(DOWNLOADED_FILES_DATABASE, JSON.stringify(previouslyDownloadedFiles));
}

const requestVideoMetada = getVideoMetadata("http://video.ft.com/latest", []);
const downloadingNewValidVideos = requestVideoMetada.then(downloadNewValidVideos);
const storingDownloadedVideos = downloadingNewValidVideos.then(storeDownloadedVideos);

storingDownloadedVideos.catch(console.error);
