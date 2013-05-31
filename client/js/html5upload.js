/* 
 * Main upload class that handles upload events, upload queue, etc
 */
define(['jquery'], function($) {
    "use strict";
  
    var settings = {
        fileInput: "#html5upload"
        , uploadUrl: '/upload/'
        , uploadMethod: 'POST'
        , sliceUpload: true // send file slices instead of entire file at once (recommended for better js performance)
        , sliceSize: 20480 // size of each slice
        , sliceDelay: 20 // delay between each slice (for performance as well)
        , queueDelay: 100 // delay between each file in the queue
        , maxParallerUploads: 4 // number of files to upload at the same time
        , uploadMaxRetries: 1 // max number of retries if it fails
        , autoStartUpload: true
        , extractThumbnails: true
        , alertOnUnload: true
        , onUnloadMessage: "Files are still uploading."
        , eventSubscribeFunction: $.subscribe // jquery tiny pub/sub by default
        , eventUnsubscribeFunction: $.unsubscribe
        , eventPublishFunction: $.publish
        , eventPrefix: 'html5upload.'
        , defaultThumb: 'images/defaultThumb.jpg'
    };
    
    var uploadInProgress = false;
    var waitingQueue = [];
    var uploadQueue = [];
    var filesUploading = [];
    var filesUploaded = 0;
    var fileId = 0;
    var fileObjects = [];
    var totalSize = 0;
    var uploadedSize = 0;
    
  
    /*
     * file object
     */
    function File(fileObj, fileId) {
        var retries = 0;
        var fileId = fileId;
        var fileObj = fileObj;
        var progress = 0;
        var thumbnail = null;
        var uploadedParts = 0;
        var totalParts = 0;
        
        
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
            var fr = new FileReader();
            var deferred = $.Deferred();

            fr.onload       = function() {};
            fr.onloadstart  = function() {};
            fr.onerror      = function() {};
            fr.onloadend    = function() {
                var binaryImage = fr.result;
                
                // read exif information
                //var exif = EXIF.readFromBinaryFile(new BinaryFile(binaryImage, 0, 131072));
                //console.log(exif);
                var thumb, nextEnd;
                var start = 2, end = 2;
                //var angle = 0;

                start = binaryImage.indexOf("\xFF\xD8", 2);
                end = binaryImage.indexOf("\xFF\xD9", start) + 4;
                nextEnd = binaryImage.indexOf("\xFF\xD9", end + 2) + 4;

                if (nextEnd > -1 && nextEnd > end) {
                    end = nextEnd;
                }

                if (start > -1 && end > -1) {
                    thumb = binaryImage.slice(start, end);
                    if (thumb) {
                        thumbnail = "data:image/jpeg;base64," + btoa(thumb);
                    } else {
                        thumbnail = settings.defaultThumb;
                    }
                }

                
                /*
                if ( thumb == true ) {
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
                }*/
                
                publishFileEvent('fileupload.thumb_ready');

                thumb = null;
                binaryImage = null;
                fr = null;
                deferred.resolve();
            };

            // thumbnail is in exif in first 128kb of the file
            fr.readAsBinaryString(slice(0, 131072));
            return deferred.promise();
            
        }
        
        function uploadNextPart() {
            
            var sliceStart = uploadedParts * settings.sliceSize;
            var sliceEnd = Math.min((uploadedParts + 1) * settings.sliceSize, fileObj.size);
            var sliceSize = sliceEnd - sliceStart;
            
            var reader = new FileReader();

            // upload
            reader.onload = function(e) {
                
                $.post(settings.uploadUrl, {
                    fileId: fileId
                    , retries: retries
                    , fileName: fileObj.name
                    , currentPart: uploadedParts + 1
                    , totalParts: totalParts
                    , data: e.target.result
                })
                .done(function() {
                    uploadedParts++;
                    uploadedSize += sliceSize;
                    progress = Math.min(uploadedParts * 100 / totalParts, 100);
                    
                    if (progress === 100) {
                        completeUpload();
                    } else {
                        setTimeout(uploadNextPart, settings.sliceDelay);
                    }
                })
                .fail(function() {
                    if (retries < settings.uploadMaxRetries) {
                        retries++;
                        uploadedSize -= uploadedParts * settings.sliceSize;
                        uploadedParts = 0;
                        
                        publishFileEvent('fileupload.retry');
                    } else {
                        publishFileEvent('fileupload.failed');
                    }
                });
                
                reader = null;
            };

            // read photo data
            reader.readAsDataURL(slice(sliceStart, sliceEnd));
            
        }
        
        function publishFileEvent(name) {
            publish(name, {
                fileId: fileId
                , fileProgress: progress
                , totalProgress: Math.min(uploadedSize * 100 / totalSize, 100)
            });
        }
        
        /**
         * starts file upload
         * @returns {undefined}
         */
        function startUpload() {
            
            totalParts = Math.ceil(fileObj.size / settings.sliceSize);
            
            // start upload event
            publishFileEvent('fileupload.start');
            
            uploadNextPart();
        }
        
        function completeUpload() {
            
            completeFileUpload(fileId);
            
            // start upload event
            publishFileEvent('fileupload.completed');
        }
        
        /**
         * returns image thumbnail
         * @returns {string} url or base64 encoded thumbnail
         */
        function getThumbnail() {
            return thumbnail;
        }
        
        return {
            fileId: fileId
            , progress: progress
            , getThumbnail: getThumbnail
            , readThumbnailFromExif: readThumbnailFromExif
            , startUpload: startUpload
        }
        
    };
    
    /**
     * add new file to upload queue
     * @param {type} fileObj
     * @returns {undefined}
     */
    function addToWaitingQueue(fileObj) {
        waitingQueue.push(fileObj);
    }
    
    /**
     * process the upload of selected files
     * @param {type} e
     * @returns {undefined}
     */
    function processFiles(e) {
        var fileObj;
        var files = e.target.files;
        var len = files.length;

        while (len > 0) {
            len--;
            fileObj = new File(files[len], ++fileId);
            addToWaitingQueue(fileObj);
            fileObjects[fileId] = fileObj;
        }
        
        if (settings.extractThumbnails) {
            processThumbnails();
        } else if (settings.autoStartUpload) {
            processQueue();
        }
        
    };
    
    /**
     * extracts thumbnails from files
     * @returns {undefined}
     */
    function processThumbnails() {
        
        var deferreds = [];
        for (var i = 0, len = waitingQueue.length; i < len; i++) {
            deferreds.push(waitingQueue[i].readThumbnailFromExif());
        }
        
        $.when.apply(null, deferreds).done(function() {    
            if (settings.autoStartUpload) {
                processQueue();
            }
        });
        
    }
    
    /**
     * move files from waitingQueue to uploadQueue and start the upload
     * @returns {undefined}
     */
    function processQueue() {
        var fileObj;
        /* 
         * if nothing is uploading then pop elements from watingQueue and just add to uploadQueue - this is faster
         * if files are uploading, new files have to be added to the beginning of uploadQueue - slower but required to maintain proper upload order
         */
        if (uploadQueue.length === 0) {
            while((fileObj = waitingQueue.pop())) {
                totalSize += fileObj.size;
                uploadQueue.push(fileObj);
            }
        } else {
            while((fileObj = waitingQueue.shift())) {
                totalSize += fileObj.size;
                uploadQueue.unshift(fileObj);
            }
        }
        
        // upload start event
        publishUploadEvent('upload.start');
        
        if (filesUploading.length < settings.maxParallerUploads) {
            processNextFile();
        }
    }
    
    /**
     * starts file upload
     * @returns {undefined}
     */
    function processNextFile() {
        // nothing to upload
        if (uploadQueue.length === 0) {
            return;
        }
        
        var fileObj = uploadQueue.pop();
        fileObj.startUpload();
        filesUploading.push(fileObj);
        
        // upload progress event
        publishUploadEvent('upload.progress');
        
        if (filesUploading.length < settings.maxParallerUploads) {
            setTimeout(processNextFile, settings.queueDelay);
        }
    }
    
    
    function completeFileUpload(fileId) {
        var fileObj = fileObjects[fileId];
        
        for (var i = 0, len = filesUploading.length; i < len; i++) {
            if (filesUploading === fileObj) {
                filesUploading.splice(i, 1);
                break;
            }
        }
        filesUploaded++;
        
        // upload progress event
        publishUploadEvent('upload.progress');
        
        if (filesUploading.length < settings.maxParallerUploads) {
            setTimeout(processNextFile, settings.queueDelay);
        }
    }
    
    function publishUploadEvent(name) {
        publish(name, {
            filesInQueue: uploadQueue.length
            , filesUploading: filesUploading.length
            , filesUploaded: filesUploaded
        });
    }
    
    /**
     * publish uploader events
     * @param {string} eventName
     * @param {json} eventData
     * @returns {undefined}
     */
    function publish(eventName, eventData) {
        if (settings.eventPublishFunction) {
            eventName = (settings.eventPrefix || "") + eventName; 
            settings.eventPublishFunction(eventName, eventData);
        }
    };
    
    /**
     * get the thumbnail src
     * @param {int} fileId
     * @returns {string} thumbnail src value
     */
    function getPhotoThumbnail(fileId) {
        return fileObjects[fileId].getThumbnail();
    }
    
    
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
        , getPhotoThumbnail: getPhotoThumbnail
        , processQueue: processQueue
    };
});


