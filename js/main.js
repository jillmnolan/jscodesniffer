define([
	"jquery",
	"../lib/Sniffer",
	"../lib/Dictionary/en",
	"../lib/Dictionary"
	], function( $, Sniffer, en, Dictionary ) {
    $(function() {
		var sh = window.SyntaxHighlighter,
        document = window.document,
				sniffer = new Sniffer(),
        dictionary = new Dictionary( en ),
				/**
				 * Module representing code view
				 * @module
				 */
        codeView = (function(){
            var _view,
                _message,
                _container,
                indexedMessages = {},
                htmlEntities = function( str ) {
                    var amRe = /&/g,
                        ltRe = /</g,
                        gtRe = />/g,
                        quRe = /"/g;
                    return String( str ).replace( amRe, '&amp;' )
                        .replace( ltRe, '&lt;' )
                        .replace( gtRe, '&gt;' )
                        .replace( quRe, '&quot;' );
                },
                parseMarkup = function( messages ) {
                    return $( messages ).map(function(inx, el) {
                        var oRe = /\[color:yellow\]/g,
                            cRe = /\[\/color\]/g;
                        el.message = el.message.replace( oRe, "" );
                        el.message = el.message.replace( cRe, "" );
                        return el;
                    })
                };
            return {
                init: function() {
                    _view = $( "#srcview" );
                    _message = _view.find( "p.message" );
                    _container = _view.find( "div.container" );
                },
                message : function( message, classname ) {
                    _message.html( message + '<a href="#reset">&#9660;</a>' );
                    _message.attr( "class", "message " + classname );
                },
                show : function( code ) {
                    _view.show();
										_container.empty();
                    _container.html( "<pre id=\"codeview\" class=\"brush: js\">" +
                        htmlEntities( code ) + "</pre>" );
                    sh.highlight( {}, _container.find("#codeview").get( 0 ) );
                },


                highlightCode: function() {
                    var that = this;
                    _container.find( "tbody > tr > .code > .container > div" ).each(function( inx, el ){
                        if ( indexedMessages[ inx + 1 ] ) {
                            that.highlightCodeLine( $( el ), indexedMessages[ inx + 1 ] );
                        }
										});
                },
								/**
								 * @param {object} el
								 * @param {object[]} messages
								 */
                highlightCodeLine: function( el, messages ) {
										$( ".overlay" ).remove();
                    $.each( messages, function( inx, obj ) {
                        var overlay = $( '<div class="overlay" title="' +
                            obj.message + '">_</div>' ).prependTo( el );
                        overlay.get( 0 ).style.cssText = "left: " + ( ( obj.loc.start.column * 8 ) + 8 ) + "px !important";
                        overlay.off( "mouseenter" ).on( "mouseenter", function( e ){
                            logView.activate( obj.loc.start.line, obj.loc.start.column );
                        });
                        overlay.off( "mouseleave" ).on( "mouseleave", logView.deactivate );
                    });

                },
								/**
								 * @param {object[]} messages
								 */
                assignMessages: function( messages ) {
                    $.each( parseMarkup( messages ), function( inx, el ){
                        indexedMessages[ el.loc.start.line ] = indexedMessages[ el.loc.start.line ] || [];
                        indexedMessages[ el.loc.start.line ].push( el );
                    });
                },
                highlightLines: function() {
                    _container.find( "tbody > tr > .code > .container > div" ).each(function( inx, val ){
                        if ( indexedMessages[ inx + 1 ] ) {
                            $( val ).addClass( "warning-line" );
                        }
                    });
                },
                reset: function() {
										indexedMessages = {};
                    _container.empty();
                    _view.hide();
                }
            }
        }()),
				/**
				 * Module representing log view
				 * @module
				 */
        logView = (function(){
            var _view,
                _container,
                _table,
                parseMarkup = function( message ) {
                    var oRe = /\[color:yellow\]/g,
                        cRe = /\[\/color\]/g;
                    message = message.replace( oRe, "<span>" );
                    message = message.replace( cRe, "</span>" );
                    return message;
                };;
            return {
                init: function() {
                    _view = $( "#srclog" );
                    _container = _view.find( "div.container" );
                },
								/**
								 * @param {object[]} messages
								 */
                show : function( messages ) {
                    var html = '<table><thead>' +
                        '<tr><th>Line</th><th>Col</th><th>Warning</th></tr></thead><tbody>';
                    $.each( messages, function( inx, val ){
                        html += '<tr id="log' + val.loc.start.line + '-' + val.loc.start.column + '">' +
                            '<td>' + val.loc.start.line + '</td>' +
                            '<td>' + val.loc.start.column + '</td>' +
                            '<td>' + parseMarkup( val.message ) + '</td></tr>';
                    });
                    html += "</tbody></table>";
                    _container.empty();
                    _table = $( html ).appendTo( _container );
                    _view.show();
                },
                activate: function( line, column ) {
                    var tr = _table.find( "tr#log" + line + "-" + column );
                    tr.addClass( "active" );
                    tr.position() && _container.scrollTop( tr.position().top );
                },
                deactivate: function() {
                    _table.find( "tr" ).removeClass( "active");
                },
                reset: function() {
                    _container.empty();
                    _view.hide();
                }
            }
        }()),
				/**
				 * Module representing source code
				 * @module
				 */
        codeSource = (function(){
            var _view,
                _reset;
            return {
                init: function() {
                    _view = $( "#srccode");
                    _reset = $( "#reset");
                },
                syncUi: function() {
                    _reset.on( "click", function( e ){
                        e.preventDefault();
                        codeView.reset();
                        logView.reset();
                        codeSource.reset();
                        $( this ).hide();
                        $( document ).scrollTop( 0 );
                    });
                    _view.on( "submit", function( e ){
                        var code = $( this ).find( "textarea").val(),
                            standard = $( this ).find( "select[name=standard]").val(),
                            logger,
                            messages;
                        e.preventDefault();
                        $( this ).hide();
                        try {
													// Get sniffer report
													logger = sniffer.getTestResults( code, { standard: standard } );
													// Translate messages
													messages = dictionary.translateBulk( logger.getMessages(), true );

                           // standard = logger.standard;
                           if ( !messages.length  ) {
                               codeView.message( 'Congratulations! Your code does not violate "' +
                                   standard + '" standard', 'success');
                               codeView.show( code );
                               _reset.show();
                               return;
                           }

                           codeView.message( 'Your code violates "' +
                               standard + '" standard. Please, find details in Error Log window below', 'fail');
                           codeView.show( code );
                           logView.show( messages, 'fail' );
                           _reset.show();

                           $( "#codeview").ready(function(){
                               codeView.assignMessages( messages );
                               codeView.highlightLines();
                               codeView.highlightCode();
                           });
                        } catch( e ) {
                           codeView.message( 'Apparently that is invalid JavaScript syntax.', 'fail' );
                           codeView.show( code );
                           _reset.show();
                        }
                    });
                },
                reset: function() {
                    _view.show();
                }
            }
        }());


				$( document ).ready(function(){
					sh && sh.highlight();
					logView.init();
					codeView.init();
					codeSource.init();
					codeSource.syncUi();
				});



    });
});