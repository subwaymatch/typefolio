/*
 *  Project: typeSticky
 *  Description: Sticky sidebar 
 *  Author: Ye Joo Park
 *  License: MIT
 */

// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

	// undefined is used here as the undefined global variable in ECMAScript 3 is
	// mutable (ie. it can be changed by someone else). undefined isn't really being
	// passed in so we can ensure the value of it is truly undefined. In ES5, undefined
	// can no longer be modified.

	// window and document are passed through as local variable rather than global
	// as this (slightly) quickens the resolution process and can be more efficiently
	// minified (especially when both are regularly referenced in your plugin).

	// Create the defaults once
	var pluginName = "typeSticky",
		defaults = {
			stickyClass: "sticky",
			stickedClass: "sticked",
			stickedzIndex: 10
		};

	// The actual plugin constructor
	function Plugin( element, options ) {
		this.element = element;

		// jQuery has an extend method which merges the contents of two or
		// more objects, storing the result in the first object. The first object
		// is generally empty as we don't want to alter the default options for
		// future instances of the plugin
		this.options = $.extend( {}, defaults, options );

		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	}

	Plugin.prototype = {

		init: function() {

			// Sticky Sidebar
			var stickyClass = this.options.stickyClass; 
			var stickedClass = this.options.stickedClass;
			var stickedzIndex = this.options.stickedzIndex;
			var $sticky = $('.' + stickyClass); 
	
			// If sticky sidebar exists
			if( $sticky.length ) {

				var $sticked = $sticky.clone().addClass(stickedClass).removeClass(stickyClass).insertAfter('.' + stickyClass);

				$(window).on("scroll resize", function(e) {

					var stickyOffsetTop = $sticky.parent().offset().top; 
					var currentScrollPos = $(document).scrollTop(); 

					// If the window's scrollTop position is larger than sticky element's vertical top offset
					// Clone and hide the original element
					if( ( stickyOffsetTop < currentScrollPos ) && ( $(window).width() > 959 ) ) {

						$sticky.css({
							"visibility": "hidden"
						});

						$sticked.css({
							"display": "block", 
							"width": $sticky.width(), 
							"position": "fixed",
							"z-index": stickedzIndex, 
							"top": "0",
							"left": ( $sticky ).parent().hasClass('nested') ? $('.sticky').parent().offset().left - 20 : $('.sticky').parent().offset().left // Adjust the position in case the sidebar is in a nested column
						});

					} else {

						$sticky.css({
							"visibility": "visible"
						});

						$sticked.css({
							"display": "none"
						});

					}
				});

			}

		} // init()

	};

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
		});
	};

})( jQuery, window, document );