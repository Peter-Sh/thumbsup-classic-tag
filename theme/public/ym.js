// vim: set expandtab tabstop=2 shiftwidth=2 :
"use strict"
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
      this.editor.addTag(item.data('tagName'))
    }
  }

  const Tag = {
    value: null,
    active: true,
    create(value, active = true) {
      return Object.create(Tag, {
        value: {
          value: value
        },
        active: {
          value: active
        }
      })
    }
  }

  const TagsCollection = {
    tags: [],
    changeHandler: null,

    addTag(value, active = true) {
      this.tags.push(Tag.create(value, active))
      this.changeHandler()
    },
    create(changeHandler) {
      return Object.create(TagsCollection, {
        changeHandler: {
          value: changeHandler
        }
      })
    },
    clear() {
      this.tags = []
    },
    getTags() {
      return this.tags
    },
  }

  const TagEditor = {
    $overlay: null,
    $tags: null,
    $input: null,
    $insertPoint: null,
    
    tags: null,

    renderEnqueued: false,

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
          this.tags.addTag(value)
          this.createActiveTagElement(value).insertBefore(this.$insertPoint);
      })
    },
    createActiveTagElement(value) {
        return $('<li>' + value + '</li>')
          .addClass('addedTag')
          .data('tagName', value)
          .append($('<span>x</span>')
          .addClass('tagRemove'))
    },
    saveTagsToServer(tags, fileName) {
      $.ajax({
          url: 'http://127.0.0.1:3000/save/',
          type: 'POST',
          data: JSON.stringify({fileName: fileName, tags: tags}),
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
    getFileName() {
      return this.$tags.data('filepath');
    },
    loadTagsFromServer(fileName) {
      return $.ajax({
          url: 'http://127.0.0.1:3000/tags/file/',
          type: 'GET',
          data: { fileName: fileName },
          dataType: 'json',
      });
    },
    async initialize() {
      let tags = await this.loadTagsFromServer(this.getFileName())
      if (tags.data) {
        this.clearTags()
        this.insertTags(tags.data)
      }
    },
    clearTags() {
      this.$tags.find('.addedTag').each((k, v) => { $(v).remove() })
    },
    create(props) {
      const editor = Object.create(TagEditor, {
        $overlay: { value: props.$overlay },
        $input: { value: props.$input },
        $insertPoint: { value: props.$insertPoint },
        $tags: { value: props.$tags },
        $closeButton: { value: props.$overlay.find('.tagger-editor-close') },
        $addButton: { value: props.$overlay.find('.tag-input-add') },
      })
      editor.initProps()
      return editor
    },
    initProps() {
      this.tags = TagsCollection.create(() => this.enqueueRender())
    },
    open() {
      this.$overlay.css('visibility', 'visible');
      $(document).on('keydown.overlay',  e => {
          if (e.key == 'Escape') {
              this.close();
          }
      })
      this.$closeButton.on('click',  e => {
          this.close();
      })
      this.$overlay.on('click',  e => {
          if (e.target === e.currentTarget) {
            this.close();
          }
      })
      this.$tags.on('click.tagRemove', '.tagRemove', event => {
        event.preventDefault();
        $(event.target).parent().remove();
        this.saveTagsToServer(this.getTags(), this.getFileName())
      })
      this.$input.keypress(event => {
        if (event.which == '13') {
          this.addTag($(event.target).val())
          $(event.target).val('')
        }
      })
      this.$addButton.on('click', event => {
        this.addTag(this.$input.val());
        this.$input.val('')
      })
    },
    close() {
      this.$overlay.css('visibility', 'hidden');
      this.destroy()
    },
    destroy() {
      $(document).off('keydown.overlay')
      this.$overlay.off('click')
      this.$closeButton.off('click')
      this.$tags.off('click.tagRemove')
      this.$input.off('keypress')
      this.$addButton.off('click')
    },
    render() {
      console.log(this.tags.getTags());
    },
    enqueueRender() {
      if (!this.renderEnqueued) {
        this.renderEnqueued = true
        setTimeout(() => {
          this.renderEnqueued = false
          this.render()
        }, 0)
      }
    }
  }

  function toggleTagger(e) {
    var overlay = $(e.target).parents('.captor').children('.tagger-overlay');
    let editor = TagEditor.create({
      $overlay: overlay,
      $insertPoint: overlay.find('.tags .tagAdd'),
      $input: overlay.find('.tag-input-text'),
      $tags: overlay.find('.tags')
    })
    editor.initialize()
    editor.open()
    let suggest = Autocomplete.create({
      menu: overlay.find('.tag-autocomplete-menu'),
      editor: editor
    })
    suggest.updateMenu()
  }
});
