/*!
 * 
 * jQuery typeMenu
 * 
 * This plugin  is written for Typefolio
 * 
 * Original author: Ye Joo Park
 * Licensed under the MIT license
 *
 */

;(function ( $, window, document, undefined) {

	// Defaults
	var pluginName = 'typeMenu', 
		defaults = { 
			mobileToggle: true, 
			mobileWrapperId: "menu-mobile-wrapper", 
			mobileMenuId: "menu-mobile", 
			toggleElementId: "toggle-menu", 
			menuOnCollapseText: "Menu", 
			menuOnExpandText: "Close", 
			addFirstLevelArrow: true, 
			firstLevelArrow: '<span class="arrow">&nbsp;&#x25BE;</span>', 
			addDeeperLevelArrow: true, 
			deeperLevelArrow: '<span class="arrow">&nbsp;&#x25B8;</span>',
			breakpoint: 768 
		}; 


	// Actual plugin constructor
	function Plugin( element, options ) {
		this.element = element;

		this.options = $.extend( {}, defaults, options );

		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	}


	Plugin.prototype.init = function() {

		// Original menu
		var menu = $(this.element);

		// Store HTML inside the menu
		// Note that the content is stored before automatically adding arrows
		var menuContent = $(menu).html();

		// Options
		var mobileWrapperId = this.options.mobileWrapperId;
		var mobileMenuId = this.options.mobileMenuId; 
		var toggleElementId = this.options.toggleElementId; 
		var firstLevelArrow = this.options.firstLevelArrow; 
		var deeperLevelArrow = this.options.deeperLevelArrow; 
		var menuOnCollapseText = this.options.menuOnCollapseText; 
		var menuOnExpandText = this.options.menuOnExpandText; 

		var mobileWrapper = "#" + mobileWrapperId; 
		var mobileMenu = "#" + mobileMenuId; 
		var toggleElement = "#" + toggleElementId; 

		// Add .hasChild to top-level elements with children items
		// Also add arrows 
		if ( this.options.addFirstLevelArrow ) {
			$("> li:has(ul)", menu).addClass('hasChild').find("a:first").append(firstLevelArrow);
		}
		
		// Add arrows to deeper level menu items
		if ( this.options.addDeeperLevelArrow ) {
			$("li ul li:has(ul)", menu).find("a:first").append(deeperLevelArrow);
		}
		
		/* Make dropdown menus keyboard accessible */
		$("a", menu).focus(function() {

			$(this).parents("li").addClass("hover");

		}).blur(function() {

			$(this).parents("li").removeClass("hover");

		});

		// If mobileToggle options is turned on (default)
		// Create a mobile menu wrapper and copy contents from the original menu
		if( this.options.mobileToggle == true ) {

			$('body').css({"position": "relative"}).prepend('<div id=' + mobileWrapperId + '><div class="container"><div class="desktop-12 columns"><ul id="menu-mobile"></ul></div></div></div>'); 
			$(mobileMenu).html(menuContent).before('<div id="' + toggleElementId + '">' + menuOnCollapseText + '</div>');

			// When the user clicks on the toggle element
			$(toggleElement).bind('click', function(e) {

				// Toggle the menu 
				// Apply stop() before slideToggle() to stop animation
				$(mobileMenu).stop().slideToggle();

				// Apply .toggle-open to the wrapper
				$(mobileWrapper).toggleClass("toggle-open");

				// If the menu is open
				if( $(mobileWrapper).hasClass("toggle-open") ) {

					// Display the "Close" text
					$(toggleElement).text(menuOnExpandText);

				} else {

					// Display the "Menu" text
					$(toggleElement).text(menuOnCollapseText);

				}

			});

		}
	};


	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, 'plugin_' + pluginName)) {
				$.data(this, 'plugin_' + pluginName, 
					new Plugin( this, options ));
			}
		});
	}

})( jQuery, window, document );