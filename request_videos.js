#!/usr/bin/env node
"use strict";

/**
 * Script to download videos from websites.
 */

const got = require("got");
const cheerio = require("cheerio");

// Called back with HTML from FT's latest videos website.
function latestFTVideosCallback(error, html) {
	if (error) {
		/*eslint-disable no-console*/
		console.error(error);
		/*eslint-enable no-console*/
	}

	const $ = cheerio.load(html);

	$(".video-thumb-link").each(function(i, elem) {
		/*eslint-disable no-console*/
		console.log($(elem).attr("href"));
		/*eslint-enable no-console*/
	});
}

got("http://video.ft.com/latest", latestFTVideosCallback);
