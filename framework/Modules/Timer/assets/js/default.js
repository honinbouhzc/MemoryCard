function Counter(duration, direction, interval, renderHolder) {
    this.duration       = duration;
    this.direction      = direction;
    this.interval       = interval;
    this.renderHolder   = renderHolder;
    this.currentCounter = 0;
    this.intervalTimer  = null;
    this.intervalSync   = null;
    this.isCounting     = false;

    this.pad = function(val) {
        return val > 9 ? val : "0" + val;
    }

    this.timer = function() {
        var val,
            minutes,
            seconds;

        if (this.direction === 'down')
            val = this.duration - this.currentCounter;
        else if (this.direction === 'up')
            val = this.currentCounter;

        this.showTime(val);


        if (this.duration != 0 && this.currentCounter >= this.duration) {
            this.stop();
            this.triggerStop();
            return;
        }

        this.currentCounter++;
    }

    this.showTime = function(val) {
        seconds = (val % 60) | 0;
        minutes = (val / 60) | 0;

        minutes = this.pad(minutes);
        seconds = this.pad(seconds);

        // if(this.render)
            this.renderHolder.textContent = minutes + ":" + seconds;
    }

    this.count = function() {
        if ((this.duration != 0 && this.currentCounter > this.duration) || this.isCounting
        ) {
            return;
        }

        this.isCounting = true;

        this.timer();
        this.intervalTimer = setInterval(this.timer.bind(this), 1000);
        this.intervalSync = setInterval(this.sync.bind(this), this.interval * 1000);
    }

    this.stop = function() {
        this.isCounting = false;

        if (this.intervalTimer)
            clearInterval(this.intervalTimer);

        if (this.intervalSync)
            clearInterval(this.intervalSync);
    }

    this.triggerStop = function() {
        this.emit('finish', {
                        duration: this.duration,
                        counter: this.currentCounter
                    });
    }

    this.clear = function() {
        this.emit('clear', {
            counter: this.currentCounter
        });
    }

    this.sync = function() {
        this.emit('sync', {
                        duration: this.duration,
                        counter: this.currentCounter
                    });
    }
}

defineModule({
	name: 'timer',

    domLink: {
        class: 'timer'
    },

	initialize: function() {
		var el = this.querySelector('.timer'),
            data = el.dataset,
            name = el.id,
            start;

        if(data.direction === 'up')
            start = (parseInt(data.currentCounter) > parseInt(data.duration)) ? data.duration : data.currentCounter;
        else
            start = (parseInt(data.currentCounter) > parseInt(data.duration)) ? 0 : data.duration - data.currentCounter;

        this.timer = new Counter(data.duration, data.direction, data.interval, el);
        this.timer.emit = this.emit.bind(this);
        this.timer.showTime(start);

        if (data.autostart) {
            this.timer.emit('start');
        }
	},

	start: function(currentValue) {
		var counter = this.timer;
        if ( currentValue )
            counter.currentCounter = currentValue;
		counter.count();
	},

	finish: function() {
		var counter = this.timer;
		counter.stop();
	},

    clear: function() {
        var counter = this.timer;
        counter.clear();
    },

	sync: function(currentValue, duration) {
		var counter = this.timer;

		if ( duration !== 0 && currentValue >= duration ) {
			counter.currentCounter = duration;
			return;
		}

		counter.currentCounter = currentValue;
		counter.duration = duration;
	}
});
