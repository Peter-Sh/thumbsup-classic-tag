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
      this.editor.newTag(item.data('tagName'))
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
    tags: null,
    changeHandler: null,

    addTag(value, active = true) {
      this.tags.push(Tag.create(value, active))
      this.changeHandler()
    },
    create(changeHandler) {
      return Object.create(TagsCollection, {
        tags: {
          value: []
        },
        changeHandler: {
          value: changeHandler
        }
      })
    },
    clear() {
      this.tags = []
    },
    remove(value) {
      let index = this.findByValue(value)
      if (index !== -1) {
        this.tags.splice(index, 1)
        this.changeHandler()
      }
    },
    getTags() {
      return this.tags
    },
    findByValue(value) {
      return this.tags.findIndex(tag => (tag.value === value && tag.active))
    },
    hasTag(value) {
      return this.findByValue(value) > -1;
    },
  }

  const TagEditor = {
    $overlay: null,
    $tags: null,
    $input: null,
    $insertPoint: null,
    
    tags: null,

    renderEnqueued: false,

    newTag(value) {
      if (this.tags.hasTag(value)) {
          return
      }
      this.insertTags([value])

      this.saveTagsToServer(this.tags.getTags(), this.getFileName());
    },
    insertTags(tags) {
      tags.map(value => this.tags.addTag(value))
    },
    createActiveTagElement(value) {
        return $('<li>' + value + '</li>')
          .addClass('addedTag')
          .attr('id', value)
          .attr('data-tagname', value)
          .append(
            $('<span>&#215;</span>')
            .addClass('tagRemove')
            .attr('data-tagname', value)
          )
    },
    saveTagsToServer(tags, fileName) {
      let tagsToSave = tags.map((tag) => tag.value)
      $.ajax({
          url: 'http://127.0.0.1:3000/save/',
          type: 'POST',
          data: JSON.stringify({fileName: fileName, tags: tagsToSave}),
          processData: false,
          dataType: 'json',
          contentType: 'application/json',
      });
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
        this.insertTags(tags.data)
      }
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
        //$(event.target).parent().remove();
        this.tags.remove($(event.target).data('tagname'))
        this.saveTagsToServer(this.tags.getTags(), this.getFileName())
      })
      this.$input.keypress(event => {
        if (event.which == '13') {
          this.newTag($(event.target).val())
          $(event.target).val('')
        }
      })
      this.$addButton.on('click', event => {
        this.newTag(this.$input.val());
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
      let root = $('<span></span>');
      this.tags.getTags().map((tag) => {
        root.append(this.createActiveTagElement(tag.value))
      })
      this.$tags.html(root.html())
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
