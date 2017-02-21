defineModule({
    domLink: {
        class: 'todo',
    },
    events: {
        'click [data-event="viewList"]': 'viewList',
        'click [data-event="viewItem"]': 'viewItem',
        'click [data-event="toggleItem"]': 'toggleItem',
        'click [data-event="viewItemLink"]': 'viewItemLink'
    },

    initialize: function() {
        var todo = this;
        $(this.querySelector('.modal')).find('iframe').load(function(e) {
            $(e.target).height($(e.target).contents().find('body')[0].scrollHeight);
        });

        $(this.querySelector('.modal')).on('hide.bs.modal', function () {
            $(todo.querySelector('.modal-body')).find('iframe').attr('src', 'about:blank');

            var listId = $(todo.querySelector('.todo-lists')).find('.active a').data('id');
            todo.fetchLists(listId);
        });

        var listId = (this.fetchRegexFromHash(/^#list=(.*)&item=.*$/) || this.fetchRegexFromHash(/^#list=(.*)$/));

        if (listId) {
            this.showList(listId);

            var itemId = this.fetchRegexFromHash(/&item=(.*)$/);
            if (itemId) {
                this.showItem(listId, itemId);
            }
        }
    },

    fetchRegexFromHash: function(regex) {
        var hash = window.location.hash;

        if (hash.length > 0) {
            var matches = regex.exec(hash);

            if (matches) {
                return matches[1];
            }
        }

        return null;
    },

    fetchLists: function(listId) {
        this.emit('fetchLists', {listId: listId});
    },

    replaceLists: function(innerHtml) {
        var selector = $(this.querySelector('.todo-lists-container'));

        selector.html(innerHtml);
    },

    showList: function(listId) {
        var target = $(this.querySelector('a[data-id="'+listId+'"]'));

        target.closest('li').siblings('li').removeClass('active');
        target.closest('li').addClass('active');

        $(this.querySelectorAll('.todo-list')).addClass('hidden');
        $(this.querySelector('.todo-list#' + listId)).removeClass('hidden');

        $(this.querySelectorAll('.todo-item')).addClass('hidden');
    },

    viewList: function(event) {
        var listId = event.target.dataset.id;

        this.showList(listId);

        this.emit('viewList', {listId: listId});
    },

    showItem: function(listId, itemId) {
        $(this.querySelectorAll('.todo-item')).addClass('hidden');

        $(this.querySelector('.todo-item[data-list-id="' + listId + '"][data-id="' + itemId + '"]')).removeClass('hidden');
    },

    viewItem: function(event) {
        var listId = $(event.target).closest('li').data('listId'),
            itemId = $(event.target).closest('li').data('id'),
            eventType = event.target.dataset.event;

        this.showItem(listId, itemId);

        this.emit(eventType, {listId: listId, itemId: itemId});
    },

    toggleItem: function(event) {
        var target = event.target,
            listId = $(event.target).closest('li').data('listId'),
            itemId = $(event.target).closest('li').data('id');

        if ($(target).is(':checked')) {
            this.emit('completeItem', {itemId: itemId, listId: listId});
        } else {
            this.emit('undoCompleteItem', {itemId: itemId, listId: listId});
        }
    },

    viewItemLink: function(event) {
        if ($(event.target).attr('target') != '_blank') {

            event.preventDefault();
            var modalEl = this.querySelector('.modal');

            $(modalEl).find('.modal-title').html($(event.target).data('title'));
            $(modalEl).find('.modal-body iframe').contents().find('body').html('');
            $(modalEl).find('.modal-body iframe').attr('src', $(event.target).attr('href'));
            $(modalEl).modal('show');
        }

        var listId = $(event.target).parent().data('listId'),
            itemId = $(event.target).parent().data('id'),
            eventType = event.target.dataset.event;

        this.emit(eventType, {itemId: itemId, listId: listId});
    }
});