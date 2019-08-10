// ==UserScript==
// @name         Download_Mi_Cloud_Media
// @version      1.0
// @description  Reliably downloads all files in an album on Xiaomi cloud. Needs support of a local http server and disabled web security on your browser!
// @author       Stefan Rickli
// @include      https://us.i.mi.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @grant        GM_addStyle
// ==/UserScript==
/*- The @grant directive is needed to work around a design change
    introduced in GM 1.0.   It restores the sandbox.
*/

// -------------------------------------------------------------------------------------------------------------------
// User changeable varibles
// -------------------------------------------------------------------------------------------------------------------

// Every iteration 0.5s and we consider a download to be dead or
// unsuccessful after n_retries iterations.
// Change this variable to tighten or losen the timeout.
// Works best if the album only contains photos.
var n_retries = 40;


// Elements that this script will look for in the gallery.
// Update if necessary using the developer tools of your browser.
var album_viewer = '.viewer-3uWLw';
var download_button = '.icon-download-2-nI1';
var next_button = '.ico-next-4KyWW.center-S44vV';
var info_button = '.icon-info-2yKNU';
var media_data = '.value-2QSQC';
var info_close_button = '.ico-close-3WH4i';


// -------------------------------------------------------------------------------------------------------------------
// State machine
// -------------------------------------------------------------------------------------------------------------------

// Globals
var n_files = 0;
var next_state = Idle;
var n_waits = 0;
var fileinfo = '';


async function Idle() {
    log_debug('Idle');
    if (AlbumViewer_Present() && Next_Btn_Present()) {
        log_info('Found Album Viewer and Next Button. Starting download loop...');
        next_state = Click_Download;
        await Sleep(500);
    } else {
        log_debug('Waiting for Album Viewer and Next Button...');
        await Sleep(2000);
    }
}


async function Click_Download() {
    log_debug('Click_Download');
    if (!AlbumViewer_Present()) {
        log_warning('Album Viewer not present. Going to Idle...');
        next_state = Idle;
        return;
    }

    await Log_Info();

    if (!Download_Btn_Present()) {
        log_warning('Download Button not present. Going to Idle...');
        next_state = Idle;
        return;
    }

    await $.get('http://localhost:50001', function(data, status) {
        log_info('Starting download with ' + data + ' files');
        n_files = data;
    });

    await Sleep(500);

    $(download_button).click();

    next_state = Await_Download_Start;
    n_waits = 0;
    await Sleep(500);
}


async function Await_Download_Start() {
    log_debug('Await_Download_Start');
    if (!AlbumViewer_Present()) {
        log_warning('Album Viewer not present. Going to Idle...');
        next_state = Idle;
        return;
    }

    await $.get('http://localhost:50001', function(data, status) {
        log_debug('Currently got ' + data + ' files');
        if (data == 'dip') {
            log_debug('Download in progress. Waiting...');
            n_waits = 0;
            next_state = Download_In_Progress;
        } else if (data > n_files) {
            log_info('Download succeeded. Going to next image.');
            next_state = Click_Next;
        } else {
            if (++n_waits > n_retries) {
                log_error(fileinfo + ': Timeout while waiting for download to start. Retrying to click it...');
                next_state = Click_Download;
            } else {
                log_debug('Waiting for download to start...');
            }
        }
    });
    await Sleep(500);
}


async function Download_In_Progress() {
    log_debug('Download_In_Progress');
    if (!AlbumViewer_Present()) {
        log_debug('Album Viewer not present. Going to Idle...');
        next_state = Idle;
        return;
    }

    await $.get('http://localhost:50001', function(data, status) {
        log_debug('Currently got ' + data + ' files');
        if (data == 'dip') {
            if (++n_waits > n_retries) {
                log_error(fileinfo + ': Timeout while waiting for download to finish. Retrying to click it...');
                next_state = Click_Download;
            } else {
                log_debug('Download in progress. Waiting...');
            }
        } else if (data > n_files) {
            log_info('Download succeeded. Going to next image.');
            next_state = Click_Next;
        } else {
            log_warning('Download failed. Retrying to click it...');
            next_state = Click_Download;
        }
    });
    await Sleep(500);
}


async function Click_Next() {
    log_debug('Click_Next');
    if (!AlbumViewer_Present()) {
        log_warning('Album Viewer not present. Going to Idle...');
        next_state = Idle;
        return;
    }

    if (!Next_Btn_Present()) {
        log_warning('Next Button not found. Going to Idle...');
        next_state = Idle;
        return;
    }

    $(next_button).click();

    next_state = Click_Download;
    await Sleep(1000);
}


// -------------------------------------------------------------------------------------------------------------------
// Media info extraction and logging
// -------------------------------------------------------------------------------------------------------------------

async function Log_Info() {
    if (!Info_Btn_Present()) {
        log_warning('Info Button not found');
        return;
    }

    $(info_button).click();
    await Sleep(500);

    fileinfo = '';
    $(media_data).each( function(idx, element) {
        if (idx == 0) {
            fileinfo = $(element).text();
         }
        if (idx == 1) {
            fileinfo = 'Filename: ' + fileinfo + ', Date: "' + $(element).text() + '"';
        }
    });
    log_info(fileinfo);

    if (!Info_Close_Btn_Present) {
        log_warning('Could not find Close Button. Going to Idle...');
        next_state = Idle;
        return;
    }

    $(info_close_button).click();
    await Sleep(500);
}


// -------------------------------------------------------------------------------------------------------------------
// Main loop
// -------------------------------------------------------------------------------------------------------------------

main();

async function main() {
    while(true) {
        await next_state();
        await Sleep(10);
    }
}

// -------------------------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------------------------

function Download_Btn_Present() {
    var Element = $(download_button);
    return Element.length
}


function AlbumViewer_Present() {
    var Element = $(album_viewer);
    return Element.length
}


function Next_Btn_Present() {
    var Element = $(next_button);
    return Element.length
}


function Info_Btn_Present() {
    var Element = $(info_button);
    return Element.length
}


function Info_Close_Btn_Present() {
    var Element = $(info_close_button);
    return Element.length
}


// -------------------------------------------------------------------------------------------------------------------
// Timing
// -------------------------------------------------------------------------------------------------------------------

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}


// -------------------------------------------------------------------------------------------------------------------
// Logging to http server
// -------------------------------------------------------------------------------------------------------------------

function log_debug(str) {
    $.post('http://localhost:50001/debug', str, function(data, status) { if (!data.includes('X')) console.log(data) });
}


function log_info(str) {
    $.post('http://localhost:50001/info', str, function(data, status) { if (!data.includes('X')) console.log(data) });
}


function log_warning(str) {
    $.post('http://localhost:50001/warning', str, function(data, status) { if (!data.includes('X')) console.log(data) });
}


function log_error(str) {
    $.post('http://localhost:50001/error', str, function(data, status) { if (!data.includes('X')) console.log(data) });
}


