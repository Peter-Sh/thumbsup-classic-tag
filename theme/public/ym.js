$(function(){
	$('.tagger-switch').on('click', toggleTagger);
	const Autocomplete = {	
		input: null,
		menu: null,
		ti: null,
		async updateMenu() {
				let tags = await this.loadTags()
				this.menu.empty()
				tags.map(tag => {
						this.menu.append($('<div>' + tag.name + '</div>'))
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
				return Object.create(Autocomplete, props)
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
		let suggest = Autocomplete.create({
				menu: {
						value: overlay.find('.tag-autocomplete-menu')
				}
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
			return from.parents('.tag-editor').find('.tags')
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
