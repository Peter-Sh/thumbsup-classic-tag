// vim: set expandtab tabstop=2 shiftwidth=2 :
"use strict"
$(function(){
  $('.tagger-switch').on('click', toggleTagger);

  window.onpopstate = function (e) {
    if (e.state === 'closeTagEditor') {
      $(document).trigger('closeTagEditor')
      history.back()
    }
  }

  const TagsCollection = {
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
    addTag(value) {
      if (this.hasTag(value)) {
        return false
      }
      this.tags.push(value)
      this.changeHandler('add', value)
      return true
    },
    clear() {
      this.tags.splice(0, this.tags.length)
      this.changeHandler('clear')
    },
    removeTag(value) {
      let index = this.findByValue(value)
      if (index !== -1) {
        this.tags.splice(index, 1)
        this.changeHandler('remove', value)
      }
    },
    getTags() {
      this.tags.sort()
      return this.tags
    },
    findByValue(value) {
      return this.tags.indexOf(value)
    },
    hasTag(value) {
      return this.findByValue(value) > -1;
    },
  }

  const TagEditor = {
    create(props) {
      const editor = Object.create(this, {
        $overlay: { value: props.$overlay },
        $input: { value: props.$input },
        $insertPoint: { value: props.$insertPoint },
        $tags: { value: props.$tags },
        $closeButton: { value: props.$overlay.find('.tagger-editor-close') },
        $addButton: { value: props.$overlay.find('.tag-input-add') },
        renderEnqueued: { value: false, writable: true },
        updateSearchTagsTimeoutId: { value: false, writable: true },
        lastInputValue: { value: "", writable: true},
        lastCreatedTag: { value: null, writable: true },
        lastChangedTag: { value: null, writable: true },
      })
      editor.initProps()
      return editor
    },
    initProps() {
      this.activeTags = TagsCollection.create((op, val) => this.enqueueRender(op, val))
      this.searchTags = TagsCollection.create(() => this.enqueueRender())
    },
    newTag(value) {
      if (this.activeTags.hasTag(value)) {
          return
      }
      this.insertTags([value])
      this.searchTags.addTag(value)
      this.lastCreatedTag = value

      this.saveTagsToServer(this.activeTags.getTags(), this.getFileName());
    },
    insertTags(tags) {
      tags.map(value => {
          this.activeTags.addTag(value)
        }
      )
    },
    createTagElement(value, active = true) {
      let tagClass = active ? 'activeTag' : 'inactiveTag'
      let tag = $('<li>' + value + '</li>')
        .addClass('tag')
        .addClass(tagClass)
        .attr('id', value)
        .attr('data-tagname', value)
      return tag
    },
    saveTagsToServer(tags, fileName) {
      $.ajax({
          url: this.serverUrl() + '/save/',
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
    serverUrl() {
      let serverUrl = '';
      let u = new URL(document.location.href)
      if (u.protocol.match('^https?')) {
        u.port = 3000;
        serverUrl = u.protocol + '//' + u.host
      } else {
        serverUrl = 'http://127.0.0.1:3000'
      }
      return serverUrl
    },
    loadTagsFromServer(fileName) {
      return $.ajax({
          url: this.serverUrl() + '/tags/file/',
          type: 'GET',
          data: { fileName: fileName },
          dataType: 'json',
      });
    },
    loadAllTags() {
        this.allTagsCache = $.ajax({
          url: this.serverUrl() + '/tags/',
          type: 'GET',
          dataType: 'json',
        })
    },
    async initialize() {
      let tags = null
      try {
        tags = await this.loadTagsFromServer(this.getFileName())
      } catch (e) {
        console.log(e)
      }
      if (tags.data) {
        this.insertTags(tags.data)
      }
      this.loadAllTags()
    },
    async updateSearchTags(val) {
      let tagsResult = await this.allTagsCache
      this.searchTags.clear()
      tagsResult.map((tagData) => {
        if (tagData.name.indexOf(val) === 0) {
          this.searchTags.addTag(tagData.name)
        }
      })
      console.log(this.searchTags.getTags())
    },
    enqueueUpdateSearchTags() {
      let val = this.$input.val()
      if (val == this.lastInputValue) {
        return
      } else {
        this.lastInputValue = val
      }
      if (this.updateSearchTagsTimeoutId) {
        clearTimeout(this.updateSearchTagsTimeoutId)
        this.updateSearchTagsTimeoutId = false;
      }
      this.updateSearchTagsTimeoutId = setTimeout(() => {
        this.updateSearchTags(val)
        this.updateSearchTagsTimeoutId = false
      }, 200)
    },
    searchIsActive() {
      return this.$input.val().length != 0
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

      history.pushState('closeTagEditor', '')
      history.pushState('openTagEditor', '')
      $(document).on('closeTagEditor', e => {
        this.close()
      })

      this.$tags.on('click.inactiveTag', '.inactiveTag', event => {
        this.activeTags.addTag($(event.target).data('tagname'))
        this.saveTagsToServer(this.activeTags.getTags(), this.getFileName());
      })
      this.$tags.on('click.activeTags', '.activeTag', event => {
        this.activeTags.removeTag($(event.target).data('tagname'))
        this.saveTagsToServer(this.activeTags.getTags(), this.getFileName());
      })
      this.$input.on('keyup', event => {
        if (event.which == '13') {
          this.newTag($(event.target).val())
          $(event.target).val('')
        } else {
            this.enqueueUpdateSearchTags()
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
      if (history.state === 'openTagEditor') {
        history.go(-2)
      }
    },
    destroy() {
      $(document).off('keydown.overlay')
      this.$overlay.off('click')
      this.$closeButton.off('click')
      this.$tags.off('click.inactiveTag')
      this.$tags.off('click.activeTag')
      this.$input.off('keypress')
      this.$addButton.off('click')
      $(document).off('closeTagEditor')
    },
    render() {
      if (this.lastChangedTag) {
        let changedTag = this.$tags.find('#' + this.lastChangedTag)
        if (this.activeTags.hasTag(this.lastChangedTag)) {
          changedTag
            .removeClass('inactiveTag')
            .addClass('activeTag')
        } else {
          changedTag
            .removeClass('activeTag')
            .addClass('inactiveTag')
        }
        this.lastChangedTag = null
        return
      }
      let tags = this.searchIsActive() ? this.searchTags : this.activeTags
      let root = $('<span></span>');
      tags.getTags().map((tag) => {
        let active = this.activeTags.hasTag(tag)
        root.append(this.createTagElement(tag, active))
      })
      this.$tags.html(root.html())
      if (this.lastCreatedTag) {
        this.$tags.find('#' + this.lastCreatedTag).get(0).scrollIntoView({ behavior: 'smooth' })
        this.lastCreatedTag = null
      }
    },
    enqueueRender(op = null, val = null) {
      if (!this.renderEnqueued) {
        this.renderEnqueued = true
        if (op === 'add' || op === 'remove') {
          this.lastChangedTag = val
        }
        setTimeout(() => {
          this.renderEnqueued = false
          this.render()
        }, 0)
      } else {
        this.lastChangedTag = null
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
