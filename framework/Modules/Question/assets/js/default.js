defineModule({
    domLink: {
        class: 'question',
    },
    events: {
        'click [data-event="next"]': 'doSubmit',
        'click [data-event="finish"]': 'doSubmit',
        'click [data-event="prev"]': 'doPrevious',
        'click .answer *': 'hideNoAnswers'
    },

    initialize: function () {
        this.startTimer();
    },

    startTimer: function() {
        if ( !this.querySelector('.question-container') )
            return;

        var time = this.querySelector('.question-container').dataset.time,
            self = this;

        if(this.timer)
            clearTimeout(this.timer);

        if(time > 0) {
            $(this.querySelector('.controls')).hide();

            $(this.querySelector('.question img')).load(function() {
                this.timer = setTimeout(function() {
                    $(self.querySelector('.question-container h2')).slideUp("normal");
                    $(self.querySelector('.question-container img')).slideUp("normal");
                    self.emit('show-details').then(function() {
                        $(self.querySelector('.controls')).show();
                    });
                }, time * 1000);
            });
        }
    },

    doSubmit: function(event, validate) {
        if ( typeof validate == 'undefined' ) validate = true;

        var eventType = event.target.dataset.event;

        event.preventDefault();
        if ( validate ) {
            var selectedInputs = Array.prototype.slice.call(this.querySelectorAll('input:checked')),
                values = selectedInputs.map(function(element) { return element.value; });

            if ( !values.length ) {
                this.showNoAnswers();
                return;
            }
        }

        this.hideNoAnswers();
        this.emit(eventType, {answer_keys: values});

        if (questionData[this.moduleId]['submitByClick']) {
            $(selectedInputs).prop('disabled', true);
        }
    },

    doPrevious: function(event) {
        this.doSubmit(event, false);
    },

    showNoAnswers: function() {
        var div = this.querySelector('#no-answer-selected');
        if ( div.classList )
            return div.classList.remove('hide');
        div.className = div.className.replace(/(^hide$)|(^hide\s)|(\shide\s)|(\shide$)/g, ' ');
    },

    hideNoAnswers: function() {
        var div = this.querySelector('#no-answer-selected');
        if ( div.classList )
            return div.classList.add('hide');

        if ( !div.className.match(/(^hide$)|(^hide\s)|(\shide\s)|(\shide$)/) )
            div.className += ' hide';
    }
});