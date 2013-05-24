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
        , uploadMaxRetries: 1 // max number of retries if it fails
        , autoStartUpload: false
        , extractThumbnails: true
        , alertOnUnload: true
        , onUnloadMessage: "Files are still uploading."
        , eventSubscribeFunction: $.subscribe // jquery tinu pub/sub by default
        , eventUnsubscribeFunction: $.unsubscribe
        , eventPublishFunction: $.publish
        , eventPrefix: 'html5upload_'
        , defaultThumb: 'image/defaultThumb.jpg'
    };
    
    var uploadInProgress = false;
    var waitingQueue = [];
    var uploadQueue = [];
    var filesUploading = [];
    var fileId = 0;
    
  
    /*
     * file object
     */
    function File(fileObj, fileId) {
        var retries = 0;
        var fileId = fileId;
        var fileObj = fileObj;
        var progress = 0;
        var thumbnail = null;
        var partsUploaded = 0;
        
        
        /**
         * slices file object so we don't have to read entire file to memory
         * @param {type} start
         * @param {type} end
         * @returns {slice}
         */
        function slice(start, end) {
            if (fileObj.slice) {
                return fileObj.slice(start, end);
            } else if (fileObj.webkitSlice) {
                return fileObj.webkitSlice(start, end);
            } else if (fileObj.mozSlice) {
                return fileObj.mozSlice(start, end);
            } else {
                return fileObj;
            }
        }
        
        /**
         * extracts thumbnail from exif
         * @returns {undefined}
         */
        function readThumbnailFromExif() {
            var fr = new FileReader( );

            fr.onload       = function ( ) { };
            fr.onloadstart  = function ( ) { };
            fr.onerror      = function ( ) { };
            fr.onloadend    = function ( )
            {
                var binaryImage = fr.result;
                
                // read exif information
                var exif = EXIF.readFromBinaryFile(new BinaryFile(binaryImage, 0, 131072));
                console.log(exif);

                var thumb, nextEnd;
                var start = 2, end = 2;

                start = binaryImage.indexOf( "\xFF\xD8", 2 );
                end = binaryImage.indexOf( "\xFF\xD9", start ) + 4;
                nextEnd = binaryImage.indexOf( "\xFF\xD9", end + 2 ) + 4;

                if ( nextEnd > -1 && nextEnd > end)
                {
                    end = nextEnd;
                }

                if ( start > -1 && end > -1 )
                {
                    thumb = binaryImage.slice( start, end );
                    if ( thumb ) {
                        thumbnail = "data:image/jpeg;base64," + btoa(thumb);
                    } else {
                        thumbnail = settings.defaultThumb;
                    }
                }

                if ( hasThumb == true ) {
                    // get correct image orientation
                    var swapWidthHeight = false;
                    if ( exif['Orientation'] > 0 ) {
                        switch( exif['Orientation'] )
                        {
                            case 6:
                                angle = 90;
                                swapWidthHeight = true;
                                break;
                            case 8:
                                angle = 270;
                                swapWidthHeight = true;
                                break;
                            case 1:
                                angle = 0;
                                break;
                            case 3:
                                angle = 180;
                                break;
                        }
                    }
                }

                thumb = null;
                binaryImage = null;
                fr = null;
            };

            // thumbnail is in exif in first 128kb of the file
            fr.readAsBinaryString( slice(0, 131072) );
        }
        
        function getThumbnail() {
            if (thumbnail === null) {
                thumbnail = readThumbnailFromExif();
            }
            
            return thumbnail;
        }
        
        return {
            fileId: fileId
            , progress: progress
            , getThumbnail: getThumbnail
        }
        
    };
    
    /**
     * add new file to upload queue
     * @param {type} fileObj
     * @returns {undefined}
     */
    function addToQueue(fileObj) {
        waitingQueue.push(fileObj);
        
        console.log(waitingQueue);
    }
    
    /**
     * process the upload of selected files
     * @param {type} e
     * @returns {undefined}
     */
    function processFiles(e) {
        console.log("process files");
        
        var fileObj;
        var files = e.target.files;
        var len = files.length;

        while (len > 0) {
            len--;
            fileObj = new File(files[len], fileId++);
            addToQueue(fileObj);
        }
        
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


