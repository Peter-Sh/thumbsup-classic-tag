$(function(){
	$('.tagger-switch').on('click', toggleTagger);

	function toggleTagger(e) {
		var overlay = $(e.target).parents('.captor').children('.tagger-overlay');
		overlay.css('visibility', 'visible');
		overlay.find('.tag-input-text').focus();
		$(document).on('keydown.overlay', function (e) {
				if (e.key == 'Escape') {
						closeWindow(overlay);
				}
		});
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
			return container.data('filename');
	}
	

	function addTag(value, where) {
		let tags = getTags(locateTagsContainer(where));
		if (tags.indexOf(value) !== -1) {
				return;
		}
		$('<li>' + value + '</li>')
			.addClass('addedTag')
			.data('tagName', value)
			.append($('<span>x</span>').addClass('tagRemove'))
			.insertBefore(where);

		saveTagsToServer(getTags(locateTagsContainer(where)), getFileName(where));
		return value;
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
