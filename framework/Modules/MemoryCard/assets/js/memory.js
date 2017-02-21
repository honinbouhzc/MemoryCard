defineModule({
    domLink: {
		class: 'memoryCard'
	},

	events: {
		'click .card': 'selectCard',
	},

	_isAnimating: false,

	/**
	 * Cards cache
	 */
	_cards: {},
	_ids: {},

	initialize: function() {
		var self = this;
		// Extract the configurations from the DOM when available
		this.container = this.querySelector('.game-container');
		this.maxWidth = parseInt($(this.container).css('width'));
		this.minWidth = parseInt($(this.container).css('min-width'));

		var data = this.container.dataset;

		// How many cards of the same type are required to be considered a match
		if ( data.matchCount ) this._matchCount = parseInt(data.matchCount);

		// Should the board rotate when a match is made
		if ( data.rotateOnMatch ) this._rotateOnMatch = Boolean(parseInt(data.rotateOnMatch));
		// The chances, from 0 to 1, of the board rotating on a match
		if ( data.rotateChance ) this._rotateChance = parseFloat(data.rotateChance);

		if ( data.validationType ) this._validationType = data.validationType;
		if(this._validationType == 'client') {
			this._cards = memoryCardsData[this.moduleId];
			this._ids = memoryCardsIds[this.moduleId];
		}

		this.TO = false;

		$(window).bind('load', this.resizeBoard.bind(this));

		$(window).bind('resize', function() {
			if (self.TO !== false)
				clearTimeout(self.TO);

			self.TO = setTimeout(self.resizeBoard.bind(self), 200);
		});

		$(window).bind('orientationchange', this.resizeBoard.bind(this));
	},

	resizeBoard: function() {
		var windowWidth = $(window).width();

		if (typeof this.lastWindowWidth != 'undefined' && this.lastWindowWidth == windowWidth) {
			return;
		}

		this.lastWindowWidth = windowWidth;

		if (windowWidth > this.maxWidth) {
			windowWidth = this.maxWidth;
		}

		if (windowWidth < this.minWidth) {
			windowWidth = this.minWidth;
		}

		var ratio = (windowWidth / this.maxWidth).toFixed(2);

		$(this.container).hide();
		$(this.container).css('transform-origin', '0px 0px');
		$(this.container).css('transform', 'scale('+ratio+','+ratio+')');
		$(this.container).show(0);

		this.TO = false;
	},

	camelCase: function(input) {
		return input.toLowerCase().replace(/-(.)/g, function(match, group) {
			return group.toUpperCase();
		});
	},

	callMethod: function() {
		if (arguments.length === 0) return;
		var args = [];
		Array.prototype.push.apply( args, arguments );

		var method = args.shift();

		if (this._validationType == 'server') {
			this.emit(method, args.pop());
		} else {
			method = this.camelCase(method);
			method = this[method];
			method.apply(this, args);
		}
	},

	selectCard: function(event) {
		if ( this._isAnimating ) return;

		this._isAnimating = true;

		var target = event.target;
		var id = target.dataset.value;

		target.classList.add('card-loading');

		if (this._cards[id]) {
			this.display(id);
		} else {
			this.callMethod('card-selected', {value: id});
		}
	},

	// called when selectCard is handled server side and caches the image
	displayCallback: function(id, img) {
		this._cards[id] = img;
		this.display(id);
	},

	display: function(id) {
		var item = this.querySelector('#card-' + id);
		item.classList.remove('card-loading');
		item.classList.add('card-selected');
		$(item).children('.back').css('background-image', 'url(' + this._cards[id] + ')');

		if ( this.querySelectorAll('.card-selected').length >= this._matchCount )
			setTimeout(function() {
				this.callCheckCards();
			}.bind(this), 750);
		else
			this._isAnimating = false;
	},

	callCheckCards: function() {
		var allSelected = this.querySelectorAll('.card-selected');
		if ( allSelected.length >= this._matchCount ) {
			var selectedValues = allSelected
				.map(function(item) {
					return item.dataset.value;
				});

			this.callMethod('check-cards', {values: selectedValues});
		}
	},

	checkCards: function(args) {
		var moduleObj = this,
			values = args.values,
			matched = true,
			lastId;

		values.forEach(function loop(id) {
			if (!isNaN(lastId)) {
				matched = matched && (moduleObj._ids[lastId] == moduleObj._ids[id]);
				if (!matched) {
					loop.stop = true;
				}
			}

			lastId = id;
		});

		if (matched) {
			this.emit('matched', {values: values});
			this.matchCards(values);
		} else
			this.turnCards(values);
	},

	matchCards: function(values) {
		var moduleObj = this;

		var total = values.length;
		var animated = 0;
		values.forEach(function(id) {
			var item = moduleObj.querySelector('#card-' + id);
			$(item).append($('<div class="claw-card"><img class="img-responsive" src="assets/img/claw.gif" /></div>'))

			setTimeout(function() {
				$(item).find('.claw-card').hide();
				item.classList.add('card-found');
				item.classList.remove('card-selected');

				animated++;

				if (animated == total) {
					moduleObj._isAnimating = false;

					var isFinished;
					if (moduleObj._validationType == 'client')
						isFinished = moduleObj.isFinished();

					if ( !isFinished && moduleObj._rotateOnMatch )
						setTimeout(moduleObj.rotateBoard.bind(moduleObj), 250);
				}
			}, 500);
		});
	},

	turnCards: function(values) {
		this.querySelectorAll('.card-selected').forEach(function(cardEl) {
			cardEl.classList.remove('card-selected');
			$(cardEl).children('span.back').css('background-image', '');
		});

		this._isAnimating = false;
	},

	rotateBoard: function() {
		var randomness = Math.random(),
			shouldRotate = randomness < this._rotateChance,
			rotateTo = Math.ceil(Math.random() * 2);

		if ( !shouldRotate ) return;

		var previousRotateTo = this.querySelector('.gameboard').dataset.rotateTo ? this.querySelector('.gameboard').dataset.rotateTo : 0;
		rotateTo = (rotateTo + previousRotateTo) % 3;
		console.log('rotate somewhere', rotateTo);
		this.querySelector('.gameboard').className = 'gameboard gameboard-alt'+rotateTo;
		this.querySelector('.gameboard').dataset.rotateTo = rotateTo;

		var width = $(this.querySelector('.gameboard')).width(),
			height = $(this.querySelector('.gameboard')).height();

		var sign = rotateTo == "1" ? "+" : "-";
		$(this.querySelector('.gameboard')).css('transform', 'translateY(' + sign + ((width - height) / 2) + 'px');

		$(window).bind('resize', this.resizeBoard.bind(this));
	},

	isFinished: function() {
		var cardsNo = this.querySelectorAll('.card').length,
			foundCardsNo = this.querySelectorAll('.card-found').length;

		if(foundCardsNo == cardsNo) {
			this.finish();
			return true;
		}

		return false;
	},

	finish: function() {
		this.emit('finish');
	}
});