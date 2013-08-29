/**
 * @fileOverview Uploader上传类
 */
define( 'webuploader/core/uploader', [ 'webuploader/base',
        'webuploader/core/mediator',
        'webuploader/core/file',
        'webuploader/core/queue',
        'webuploader/core/runtime'
        ], function( Base, Mediator, WUFile, Queue, Runtime ) {

    var $ = Base.$,
        defaultOpts = {
            pick: {
                multiple: true,
                id: 'uploaderBtn'
            },

            accept: [{
                title: 'image',
                extensions: 'gif'
            }, {
                title: 'image',
                extensions: 'jpg'
            }]
        };

    function Uploader( opts ) {
        opts = opts || {};

        if ( typeof opts.pick === 'string' ) {
            opts.pick = {
                id: opts.pick
            };
        }

        this.options = $.extend( true, {}, defaultOpts, opts );
    }

    Mediator.installTo( Uploader.prototype );

    $.extend( Uploader.prototype, {
        state: 'pedding',

        init: function() {
            var me = this,
                opts = me.options;

            me._queue = new Queue();
            me._queue.on( 'queued', function( file ) {
                me.trigger( 'queued', file );
            } );

            me._initRuntime( opts, function() {


                opts.pick && me._initFilePicker( opts );
            } );
        },

        _initRuntime: function( opts, cb ) {
            var caps = {

                    resize_image: true
                },

                runtime;

            if ( opts.pick ) {
                caps.select_file = true;

                caps.select_multiple = opts.pick.multiple;
            }

            runtime = Runtime.getInstance( opts, caps  );
            runtime.once( 'ready', cb );
            runtime.init();

            this._runtime = runtime;
        },

        _initFilePicker: function( opts ) {
            var runtime = Runtime.getInstance(),
                me = this,
                options = $.extend( {}, opts.pick, {
                    accept: opts.accept
                } ),
                FilePicker = runtime.getComponent( 'FilePicker' ),
                picker;

            picker = new FilePicker( options );

            picker.on( 'select', function( files ) {

                $.each( files, function( idx, domfile ) {
                    me._queue.append( new WUFile( domfile ), domfile );
                } );

                /*
                var Transport = runtime.getComponent( 'Transport' );

                // 添加文件到队列
                console.log( files );
                Transport.sendAsBlob( files[ 0 ], {
                    url: '../server/fileupload.php'
                } );
                */

            } );
            picker.init();
        },

        upload: function() {
            var Q = this._queue,
                runtime = Runtime.getInstance(),
                Transport = runtime.getComponent( 'Transport' );

            if ( !Q.stats.numOfQueue ) {
                return;
            }

            while ( Q.stats.numOfQueue ) {
                (function() {
                    var fileObj = Q.fetch(),
                        file = fileObj.file,
                        tr = Transport.sendAsBlob( fileObj.source, {
                            url: '../server/fileupload.php'
                        } );

                    tr.on( 'progress', function() {
                        file.setStatus( WUFile.Status.PROGRESS );
                        console.log( Q.stats );
                    } );

                    tr.on( 'error', function() {
                        file.setStatus( WUFile.Status.ERROR );
                        console.log( Q.stats );
                    } );

                    tr.on( 'complete', function() {
                        file.setStatus( WUFile.Status.COMPLETE );
                        console.log( Q.stats );
                    } );
                })();
            }
        },

        getImageThumbnail: function( file, cb, width, height ) {
            var Q = this._queue,
                runtime = this._runtime,
                Image = runtime.getComponent( 'Image' ),
                image = new Image();

            file = typeof file === 'string' ? Q.getFile( file ) : file;
            image.on( 'load', function() {
                var img = document.createElement( 'img' );
                image.downsize( width, height );
                img.src = image.getAsDataURL();
                cb( img );
            } );
            image.load( file.getSource() );
        },


        // 需要重写此方法来来支持opts.onEvent和instance.onEvent的处理器
        trigger: function( type/*, args...*/ ) {
            var args = [].slice.call( arguments, 1 ),
                opts = this.options,
                name = 'on' + type.substring( 0, 1 ).toUpperCase() +
                    type.substring( 1 );

            if ( $.isFunction( opts[ name ] ) &&
                    opts[ name ].apply( this, args ) === false ) {
                return false;
            }

            if ( $.isFunction( this[ name ] ) &&
                    this[ name ].apply( this, args ) === false ) {
                return false;
            }

            return Mediator.trigger.apply( this, arguments );
        }

    } );

    Base.create = function( opts ) {
        var uploader = new Uploader( opts );
        uploader.init();
        return uploader;
    };

    return Uploader;
} );
