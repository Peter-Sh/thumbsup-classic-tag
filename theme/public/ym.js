// vim: set expandtab tabstop=2 shiftwidth=2 :
"use strict"
$(function(){
  $('.tagger-switch').on('click', toggleTagger);

  const TagsCollection = {
    tags: null,
    changeHandler: null,

    addTag(value) {
      if (this.hasTag(value)) {
        return false
      }
      this.tags.push(value)
      this.changeHandler()
      return true
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
      this.tags.splice(0, this.tags.length)
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
      //return this.tags.findIndex(tag => (tag.value === value && tag.active))
      return this.tags.indexOf(value)
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
    
    renderEnqueued: false,

    newTag(value) {
      if (this.activeTags.hasTag(value)) {
          return
      }
      this.insertTags([value])

      this.saveTagsToServer(this.activeTags.getTags(), this.getFileName());
    },
    insertTags(tags) {
      tags.map(value => this.activeTags.addTag(value))
    },
    createTagElement(value, active = true) {
      let tagClass = active ? 'activeTag' : 'inactiveTag'
      let tag = $('<li>' + value + '</li>')
        .addClass('tag')
        .addClass(tagClass)
        .attr('id', value)
        .attr('data-tagname', value)
      if (active) {
        tag.append(
          $('<span>&#215;</span>')
          .addClass('tagRemove')
          .attr('data-tagname', value)
        )
      }
      return tag
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
    loadAllTags() {
        return $.ajax({
          url: 'http://127.0.0.1:3000/tags/',
          type: 'GET',
          dataType: 'json',
        })
    },
    async initialize() {
      let tags = await this.loadTagsFromServer(this.getFileName())
      if (tags.data) {
        this.insertTags(tags.data)
      }
      this.allTagsCache = this.loadAllTags()
    },
    create(props) {
      const editor = Object.create(TagEditor, {
        $overlay: { value: props.$overlay },
        $input: { value: props.$input },
        $insertPoint: { value: props.$insertPoint },
        $tags: { value: props.$tags },
        $closeButton: { value: props.$overlay.find('.tagger-editor-close') },
        $addButton: { value: props.$overlay.find('.tag-input-add') },
        renderEnqueued: { value: false, writable: true },
      })
      editor.initProps()
      return editor
    },
    initProps() {
      this.activeTags = TagsCollection.create(() => this.enqueueRender())
      this.searchTags = TagsCollection.create(() => this.enqueueRender())
    },
    async updateSearchTags(val) {
      let tagsResult = await this.allTagsCache
      this.searchTags.clear()
      tagsResult.map((tagData) => {
        if (tagData.name.indexOf(val) > -1) {
          this.searchTags.addTag(tagData.name)
        }
      })
      console.log(this.searchTags.getTags())
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
        this.activeTags.remove($(event.target).data('tagname'))
        this.saveTagsToServer(this.activeTags.getTags(), this.getFileName())
      })
      this.$tags.on('click.inactiveTag', '.inactiveTag', event => {
        this.activeTags.addTag($(event.target).data('tagname'))
      })
      this.$input.keydown(event => {
        let val = $(event.target).val()
        if (event.which == '13') {
          this.newTag(val)
          $(event.target).val('')
        } else {
          this.updateSearchTags(val)
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
      this.$tags.off('click.inactiveTag')
      this.$input.off('keypress')
      this.$addButton.off('click')
    },
    render() {
      let tags = this.searchTags.getTags().length ? this.searchTags : this.activeTags
      let root = $('<span></span>');
      tags.getTags().map((tag) => {
        let active = this.activeTags.hasTag(tag)
        root.append(this.createTagElement(tag, active))
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
  }
});
