/* 
 * Main upload class that handles upload events, upload queue, etc
 */
define(['jquery'], function($) {
    "use strict";
  
    var settings = {
        fileInput: "#html5upload"
        , uploadUrl: '/upload.php'
        , uploadMethod: 'POST'
        , sliceUpload: true // send file slices instead of entire file at once (recommended for better js performance)
        , sliceSize: 20480 // size of each slice
        , sliceDelay: 20 // delay between each slice (for performance as well)
        , queueDelay: 100 // delay between each file in the queue
        , maxParallerUploads: 4 // number of files to upload at the same time
        , autoStartUpload: false
        , extractThumbnails: true
        , alertOnUnload: true
        , onUnloadMessage: "Files are still uploading."
        , eventSubscribeFunction: $.subscribe // jquery tinu pub/sub by default
        , eventUnsubscribeFunction: $.unsubscribe
        , eventPublishFunction: $.publish
        , eventPrefix: 'html5upload_'
    };
    
    var uploadInProgress = false;
    var waitingQueue = [];
    var uploadQueue = [];
    var filesUploading = [];
    var fileId = 0;
    
  
    /*
     * file object
     */
    function file() {
        
    };
    
    /**
     * process the upload of selected files
     * @param {type} e
     * @returns {undefined}
     */
    function processFiles(e) {
        console.log("process files");
    };
    
    
    /**
     * Init html5 upload
     * @param {type} newSettings overwrites the default settings
     * @returns {undefined}
     */
    function init(newSettings) {
        if(newSettings) {
            $.merge(settings, newSettings);
        }
        
        $(settings.fileInput).on('change', processFiles);
    };
    
    
    return {
        version: '1.0.0'
        , toString: "[object HTML5Uploader]"
        , init: init
    };
});


