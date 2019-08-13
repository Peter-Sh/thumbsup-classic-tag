$(function(){
  $('.tagger-switch').on('click', toggleTagger);
  const Autocomplete = {
    input: null,
    menu: null,
    editor: null,
    async updateMenu() {
        let tags = await this.loadTags()
        this.menu.empty()
        tags.map(tag => {
            this.menu.append($('<div class="tag-autocomplete-item">' + tag.name + '</div>').data('tagName', tag.name))
        })
    },
    async loadTags() {
        return await $.ajax({
          url: 'http://127.0.0.1:3000/tags/',
          type: 'GET',
          dataType: 'json',
        })
    },
    create(props) {
        if (!props.menu) {
          throw 'menu is required'
        }
        const me = Object.create(Autocomplete, {
          menu: {
            value: props.menu
          },
          editor: {
            value: props.editor
          },
        })
        me.init()
        return me
    },
    init() {
        this.menu.on('mouseenter mouseleave', '.tag-autocomplete-item', e => { this.highlightItem($(e.target)) })
        this.menu.on('click', '.tag-autocomplete-item', e => { this.addItem($(e.target)) })
    },
    destroy() {
      this.menu.off('mouseenter mouseleave')
    },
    highlightItem(item) {
      if (item.hasClass('highlighted')) {
        item.removeClass('highlighted')
      } else {
        item.addClass('highlighted')
      }
    },
    addItem(item) {
      this.editor.addTag(item.data('tagName'), this.menu)
    }
  }
  const TagEditor = {
    $tags: null,
    $input: null,
    $insertPoint: null,
    addTag(value) {
      if (this.getTags().indexOf(value) !== -1) {
          return;
      }
      this.insertTags([value])

      this.saveTagsToServer(this.getTags(), this.getFileName());
      return value;
    },
    insertTags(tags) {
      tags.map(value => {
        $('<li>' + value + '</li>')
          .addClass('addedTag')
          .data('tagName', value)
          .append($('<span>x</span>').addClass('tagRemove'))
          .insertBefore(this.$insertPoint);
      })
    },
    saveTagsToServer(tags) {
      $.ajax({
          url: 'http://127.0.0.1:3000/save/',
          type: 'POST',
          data: JSON.stringify({fileName: filename, tags: tags}),
          processData: false,
          dataType: 'json',
          contentType: 'application/json',
      });
    },
    getTags() {
      let tags = [];
      this.$tags.find('.addedTag').each(function (idx, li) {
          if ($(li).data('tagName')) {
            tags.push($(li).data('tagName'));
          }
      });

      return tags;
    },
    getFileName($el) {
      return this.$tags.data('filepath');
    },
    create(props) {
      return Object.create(TagEditor, {
        $input: { value: props.$input },
        $insertPoint: { value: props.$insertPoint },
        $tags: { value: props.$tags }
      })
    }
  }
  function toggleTagger(e) {
    var overlay = $(e.target).parents('.captor').children('.tagger-overlay');
    overlay.css('visibility', 'visible');
    let input = overlay.find('.tag-input-text')
    input.focus();
    let tags = loadTagsFromServer(getFileName(input))
      .then(tags => {
        if (tags.data) {
            clearTags(input)
            insertTags(tags.data, locateInsertPoint(input))
        }
      })
    $(document).on('keydown.overlay', function (e) {
        if (e.key == 'Escape') {
            closeWindow(overlay);
        }
    });
    let editor = TagEditor.create({
      $insertPoint: overlay.find('.tags .tagAdd'),
      $input: overlay.find('.tag-input-text'),
      $tags: overlay.find('.tags')
    })
    let suggest = Autocomplete.create({
      menu: overlay.find('.tag-autocomplete-menu'),
      editor: editor
    })
    suggest.updateMenu()

    console.log(e);
  }

  function getTags($el) {
      let tags = [];
      $el.find('.addedTag').each(function (idx, li) {
          if ($(li).data('tagName')) {
            tags.push($(li).data('tagName'));
          }
      });

      return tags;
  }

  function  getFileName($el) {
      let filename = '';
      const container = locateTagsContainer($el);
      return container.data('filepath');
  }

  function clearTags(where) { 
      locateTagsContainer(where).find('.addedTag').each((k, v) => { $(v).remove() })
  }

  function addTag(value, where) {
    let tags = getTags(locateTagsContainer(where));
    if (tags.indexOf(value) !== -1) {
        return;
    }
    insertTags([value], where)

    saveTagsToServer(getTags(locateTagsContainer(where)), getFileName(where));
    return value;
  }

  function insertTags(tags, where) {
      tags.map(value => {
        $('<li>' + value + '</li>')
          .addClass('addedTag')
          .data('tagName', value)
          .append($('<span>x</span>').addClass('tagRemove'))
          .insertBefore(where);
      })
  }

  function loadTagsFromServer(filename) {
      return $.ajax({
          url: 'http://127.0.0.1:3000/tags/file/',
          type: 'GET',
          data: { fileName: filename },
          dataType: 'json',
      });
  }

  function saveTagsToServer(tags, filename) {
      $.ajax({
          url: 'http://127.0.0.1:3000/save/',
          type: 'POST',
          data: JSON.stringify({fileName: filename, tags: tags}),
          processData: false,
          dataType: 'json',
          contentType: 'application/json',
      });
  }

  function locateInsertPoint(from) {
      return from.parents('.tag-editor').find('.tags .tagAdd')
  }

  function locateTagsContainer(from) {
      return from.parents('.tagger-overlay').find('.tags')
  }

  function locateTagIput(from)
  {
      return from.parents('.tag-editor').find('.tag-input-text')
  }

  function closeWindow(from) {
      var overlay = from;
      if (!from.hasClass('tagger-overlay')) {
          overlay = from.parents('.tagger-overlay')
      }
      overlay.css('visibility', 'hidden');
      $(document).off('keydown.overlay');
  }

  $('.tagger-editor-close').on('click', function (e) {
      closeWindow($(e.target));
  });

  $('.tagger-overlay').on('click', function (e) {
      if (e.target === this) {
        closeWindow($(e.target));
      }
  });

  $('.tags').on('click', '.tagRemove', function (event) {
    event.preventDefault();
    var tagsContainer = locateTagsContainer($(this));
    $(this).parent().remove();
    saveTagsToServer(getTags(tagsContainer), getFileName(tagsContainer));
  });

  $('.tag-input-text').keypress(function (event) {
        if (event.which == '13') {
        addTag($(this).val(), locateInsertPoint($(this)));
        $(this).val('');
    }
  });

  $('.tag-input-add').click(function (event) {
    addTag(locateTagIput($(this)).val(), locateInsertPoint($(this)));
    locateTagIput($(this)).val('');
  });
});
