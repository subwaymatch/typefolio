/*!
 * Typefolio
 *
 * Replaces jQuery 1.8, Modernizr, less.js, jQuery.BlackAndWhite,
 * jquery.easing, iosSlider, FlexSlider, typeMenu and typeSticky with one
 * dependency-free file. Everything here is progressive enhancement: with
 * JavaScript disabled the pages still read and the sliders still scroll.
 *
 * Original author: Ye Joo Park
 * Licensed under the MIT license
 */

(function () {
	'use strict';

	var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


	/*------------------------------------------------------------------
		Menu

		Builds the phone menu from the desktop <ul id="nav">, so a single
		list in the markup drives both. The toggle is a real <button> with
		aria-expanded, which the old <div id="toggle-menu"> was not:
		keyboard users could not reach it and screen readers had no way to
		know whether the menu was open.
	------------------------------------------------------------------*/

	var MENU_DEFAULTS = {
		mobileWrapperId: 'menu-mobile-wrapper',
		mobileMenuId: 'menu-mobile',
		toggleElementId: 'toggle-menu',
		menuOnCollapseText: 'Menu',
		menuOnExpandText: 'Close',
		addFirstLevelArrow: true,
		firstLevelArrow: '▾',
		addDeeperLevelArrow: true,
		deeperLevelArrow: '▸'
	};

	function initMenu(nav, options) {
		var opts = Object.assign({}, MENU_DEFAULTS, options || {});

		// Snapshot the markup before the arrows go in, so the phone menu
		// does not inherit decorations meant for the desktop bar.
		var sourceMarkup = nav.innerHTML;

		if (opts.addFirstLevelArrow) {
			addArrows(nav.querySelectorAll(':scope > li:has(> ul) > a'), opts.firstLevelArrow);
		}

		if (opts.addDeeperLevelArrow) {
			addArrows(nav.querySelectorAll(':scope li ul li:has(> ul) > a'), opts.deeperLevelArrow);
		}

		buildMobileMenu(nav, sourceMarkup, opts);
	}

	function addArrows(links, glyph) {
		Array.prototype.forEach.call(links, function (link) {
			var span = document.createElement('span');
			span.className = 'arrow';
			span.textContent = ' ' + glyph;

			// Decorative: the link text already says where it goes.
			span.setAttribute('aria-hidden', 'true');
			link.appendChild(span);
		});
	}

	function buildMobileMenu(nav, sourceMarkup, opts) {
		if (document.getElementById(opts.mobileWrapperId)) return;

		var wrapper = document.createElement('div');
		wrapper.id = opts.mobileWrapperId;

		var label = nav.getAttribute('aria-label') || 'Main';

		wrapper.innerHTML =
			'<div class="container">' +
				'<div class="desktop-12 columns">' +
					'<button type="button" id="' + opts.toggleElementId + '" ' +
						'aria-expanded="false" aria-controls="' + opts.mobileMenuId + '">' +
						'<span class="toggle-icon" aria-hidden="true"></span>' +
						'<span class="toggle-label">' + opts.menuOnCollapseText + '</span>' +
					'</button>' +
					'<nav aria-label="' + label + '">' +
						'<ul id="' + opts.mobileMenuId + '"></ul>' +
					'</nav>' +
				'</div>' +
			'</div>';

		/*
			Sit inside the page header, after the skip link. Prepending to
			<body> would put the toggle ahead of the skip link in the tab
			order and leave it outside every landmark.
		*/
		var header = document.getElementById('header');
		var skip = header && header.querySelector('.skip-link');

		if (skip) header.insertBefore(wrapper, skip.nextSibling);
		else if (header) header.insertBefore(wrapper, header.firstChild);
		else document.body.insertBefore(wrapper, document.body.firstChild);

		var menu = wrapper.querySelector('#' + opts.mobileMenuId);
		menu.innerHTML = sourceMarkup;

		// The desktop bar hides some items on small screens. Those markers
		// would hide the same items here, where there is room for them.
		Array.prototype.forEach.call(menu.querySelectorAll('.hide-on-mobile'), function (el) {
			el.classList.remove('hide-on-mobile');
		});

		// Duplicated ids would break every anchor and label on the page.
		Array.prototype.forEach.call(menu.querySelectorAll('[id]'), function (el) {
			el.removeAttribute('id');
		});
		menu.id = opts.mobileMenuId;

		var toggle = wrapper.querySelector('#' + opts.toggleElementId);
		var toggleLabel = toggle.querySelector('.toggle-label');

		function setOpen(open) {
			toggle.setAttribute('aria-expanded', String(open));
			menu.classList.toggle('is-open', open);
			wrapper.classList.toggle('toggle-open', open);
			toggleLabel.textContent = open ? opts.menuOnExpandText : opts.menuOnCollapseText;
		}

		toggle.addEventListener('click', function () {
			setOpen(toggle.getAttribute('aria-expanded') !== 'true');
		});

		// Escape closes the menu and puts focus back on the button, so the
		// user is not left stranded inside a collapsed list.
		document.addEventListener('keydown', function (event) {
			if (event.key !== 'Escape') return;
			if (toggle.getAttribute('aria-expanded') !== 'true') return;

			setOpen(false);
			toggle.focus();
		});

		document.addEventListener('click', function (event) {
			if (toggle.getAttribute('aria-expanded') !== 'true') return;
			if (wrapper.contains(event.target)) return;

			setOpen(false);
		});
	}


	/*------------------------------------------------------------------
		Slider

		A thin controller over a CSS scroll-snap track. The browser does the
		scrolling, snapping, touch handling and momentum; this only keeps
		the arrows, dots and thumbnails in step with where the track is.
	------------------------------------------------------------------*/

	function initSlider(root) {
		var track = root.querySelector('[data-slider-track]');
		if (!track) return;

		var slides = Array.prototype.slice.call(track.querySelectorAll('[data-slider-slide]'));
		if (slides.length < 2) return;

		var prev = root.querySelector('[data-slider-prev]');
		var next = root.querySelector('[data-slider-next]');
		var markers = Array.prototype.slice.call(
			root.parentNode.querySelectorAll('[data-slider-goto]')
		);

		var dotsHost = root.querySelector('[data-slider-dots]');
		if (dotsHost && !markers.length) {
			markers = slides.map(function (slide, index) {
				var dot = document.createElement('button');
				dot.type = 'button';
				dot.setAttribute('data-slider-goto', index);
				dot.setAttribute('aria-label', 'Go to slide ' + (index + 1));
				dotsHost.appendChild(dot);
				return dot;
			});
		}

		var current = 0;

		function goTo(index) {
			var target = slides[Math.max(0, Math.min(index, slides.length - 1))];
			if (!target) return;

			// scrollIntoView would also scroll the page vertically when the
			// slider is partly offscreen, so move the track directly.
			track.scrollTo({
				left: target.offsetLeft - (track.clientWidth - target.clientWidth) / 2,
				behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
			});
		}

		function nearestSlide() {
			// A centred snap cannot centre the first or last slide: there is
			// no room to scroll past the edge. Trust the scroll extremes
			// rather than the nearest-centre guess, which at scrollLeft 0
			// would otherwise report slide two.
			var maxScroll = track.scrollWidth - track.clientWidth;
			if (track.scrollLeft <= 1) return 0;
			if (track.scrollLeft >= maxScroll - 1) return slides.length - 1;

			var center = track.scrollLeft + track.clientWidth / 2;
			var best = 0;
			var bestDistance = Infinity;

			slides.forEach(function (slide, index) {
				var distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = index;
				}
			});

			return best;
		}

		function sync() {
			current = nearestSlide();

			markers.forEach(function (marker, index) {
				marker.setAttribute('aria-current', String(index === current));
			});

			slides.forEach(function (slide, index) {
				// Offscreen slides are still in the scroll container, so hide
				// them from assistive tech rather than announcing all eight.
				slide.setAttribute('aria-hidden', String(index !== current));
			});

			if (prev) prev.disabled = current === 0;
			if (next) next.disabled = current === slides.length - 1;
		}

		if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
		if (next) next.addEventListener('click', function () { goTo(current + 1); });

		markers.forEach(function (marker) {
			marker.addEventListener('click', function () {
				goTo(Number(marker.getAttribute('data-slider-goto')));
			});
		});

		// Left and right arrows move the track once it has focus.
		track.addEventListener('keydown', function (event) {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				goTo(current - 1);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				goTo(current + 1);
			}
		});

		var scrollTimer;
		track.addEventListener('scroll', function () {
			clearTimeout(scrollTimer);
			scrollTimer = setTimeout(sync, 80);
		}, { passive: true });

		window.addEventListener('resize', sync);
		sync();

		startAutoplay(root, track, slides, goTo, function () { return current; });
	}

	function startAutoplay(root, track, slides, goTo, getCurrent) {
		var interval = Number(root.getAttribute('data-slider-autoplay'));
		if (!interval || prefersReducedMotion.matches) return;

		var timer = null;

		function tick() {
			var next = getCurrent() + 1;
			goTo(next >= slides.length ? 0 : next);
		}

		function play() {
			if (timer) return;
			timer = setInterval(tick, interval);
		}

		function pause() {
			clearInterval(timer);
			timer = null;
		}

		// Stop while the visitor is interacting with or reading the slider,
		// and while the tab is in the background.
		['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach(function (name) {
			root.addEventListener(name, pause, { passive: true });
		});

		['mouseleave', 'focusout'].forEach(function (name) {
			root.addEventListener(name, play);
		});

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) pause();
			else play();
		});

		play();
	}


	/*------------------------------------------------------------------
		Boot
	------------------------------------------------------------------*/

	function init() {
		var nav = document.getElementById('nav');
		if (nav) initMenu(nav);

		Array.prototype.forEach.call(
			document.querySelectorAll('[data-slider]'),
			initSlider
		);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
